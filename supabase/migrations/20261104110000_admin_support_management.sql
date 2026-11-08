BEGIN;

ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;
-- Moderation fields are server-owned, including during an INSERT by an author.
DROP POLICY IF EXISTS "Users insert own reviews" ON public.reviews;
CREATE POLICY "Users insert own reviews" ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND content = '' AND is_hidden = false);
REVOKE UPDATE ON public.reviews FROM anon, authenticated;
CREATE OR REPLACE VIEW public.product_ratings WITH (security_barrier = true) AS
  SELECT r.id, r.product_id, r.rating, r.created_at, (r.user_id = auth.uid()) AS is_mine
  FROM public.reviews r JOIN public.products p ON p.id = r.product_id
  WHERE NOT r.is_hidden AND p.is_visible = true
    AND p.verification_status IN ('pending','reviewed','verified')
    AND (NOT private.hide_unverified_products_enabled() OR p.verification_status = 'verified');

CREATE OR REPLACE FUNCTION public.refresh_product_review_aggregate(p_product_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE public.products p SET
    review_count = (SELECT count(*)::integer FROM public.reviews r WHERE r.product_id = p_product_id AND NOT r.is_hidden),
    avg_rating = coalesce((SELECT round(avg(r.rating)::numeric, 2) FROM public.reviews r WHERE r.product_id = p_product_id AND NOT r.is_hidden), 0)
  WHERE p.id = p_product_id;
END;
$$;
DROP TRIGGER IF EXISTS reviews_sync_product_aggregate ON public.reviews;
CREATE TRIGGER reviews_sync_product_aggregate
  AFTER INSERT OR UPDATE OF product_id, rating, is_hidden OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.sync_product_review_aggregate();

-- All corrections and their audit record commit together. Row locks and expected
-- field values prevent overwriting a pet owner's concurrent edit.
CREATE OR REPLACE FUNCTION public.admin_support_correct(
  p_table text, p_id uuid, p_patch jsonb, p_expected jsonb, p_actor text, p_reason text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  allowed text[];
  before_row jsonb;
  after_row jsonb;
  pet public.pets%ROWTYPE;
  diary public.pet_feeding_logs%ROWTYPE;
BEGIN
  IF length(trim(coalesce(p_reason, ''))) NOT BETWEEN 1 AND 500
     OR length(trim(coalesce(p_actor, ''))) NOT BETWEEN 1 AND 64 THEN
    RAISE EXCEPTION '처리 사유와 담당자가 필요합니다.';
  END IF;
  IF p_table = 'pets' THEN
    allowed := ARRAY['name','pet_type','age_group','breed','weight','allergies','conditions'];
    SELECT to_jsonb(t) INTO before_row FROM public.pets t WHERE id = p_id FOR UPDATE;
  ELSIF p_table = 'pet_feeding_logs' THEN
    allowed := ARRAY['feeding_date','feeding_time','meal_period','amount','unit','preference_level','memo','reaction_note'];
    SELECT to_jsonb(t) INTO before_row FROM public.pet_feeding_logs t WHERE id = p_id FOR UPDATE;
  ELSIF p_table = 'reviews' THEN
    allowed := ARRAY['is_hidden'];
    SELECT to_jsonb(t) INTO before_row FROM public.reviews t WHERE id = p_id FOR UPDATE;
  ELSE
    RAISE EXCEPTION '허용되지 않은 관리 대상입니다.';
  END IF;
  IF before_row IS NULL THEN RAISE EXCEPTION '관리 대상을 찾을 수 없습니다.'; END IF;
  IF jsonb_typeof(p_patch) IS DISTINCT FROM 'object' OR p_patch = '{}'::jsonb
     OR jsonb_typeof(p_expected) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION '수정 데이터 형식이 올바르지 않습니다.';
  END IF;
  IF EXISTS(SELECT 1 FROM jsonb_object_keys(p_patch) k WHERE NOT k = ANY(allowed))
     OR EXISTS(SELECT 1 FROM jsonb_object_keys(p_patch) k WHERE NOT p_expected ? k)
     OR EXISTS(SELECT 1 FROM jsonb_object_keys(p_expected) k WHERE NOT k = ANY(allowed)) THEN
    RAISE EXCEPTION '수정할 수 없는 필드이거나 원본 값이 빠져 있습니다.';
  END IF;
  IF EXISTS(SELECT 1 FROM jsonb_each(p_expected) e WHERE before_row->e.key IS DISTINCT FROM e.value) THEN
    RAISE EXCEPTION '사용자 또는 다른 관리자가 변경했습니다. 새로고침 후 다시 확인해 주세요.' USING ERRCODE = '40001';
  END IF;
  IF p_table = 'pets' THEN
    SELECT * INTO pet FROM jsonb_populate_record(NULL::public.pets, before_row || p_patch);
    UPDATE public.pets SET name=pet.name,pet_type=pet.pet_type,age_group=pet.age_group,
      breed=pet.breed,weight=pet.weight,allergies=pet.allergies,conditions=pet.conditions
      WHERE id=p_id RETURNING to_jsonb(pets.*) INTO after_row;
  ELSIF p_table = 'pet_feeding_logs' THEN
    SELECT * INTO diary FROM jsonb_populate_record(NULL::public.pet_feeding_logs, before_row || p_patch);
    UPDATE public.pet_feeding_logs SET feeding_date=diary.feeding_date,feeding_time=diary.feeding_time,
      meal_period=diary.meal_period,amount=diary.amount,unit=diary.unit,preference_level=diary.preference_level,
      memo=diary.memo,reaction_note=diary.reaction_note,updated_at=now()
      WHERE id=p_id RETURNING to_jsonb(pet_feeding_logs.*) INTO after_row;
  ELSE
    UPDATE public.reviews SET is_hidden=(p_patch->>'is_hidden')::boolean
      WHERE id=p_id RETURNING to_jsonb(reviews.*) INTO after_row;
  END IF;
  INSERT INTO public.admin_audit_log(actor,action,target_table,target_id,detail)
    VALUES(p_actor,'supportCorrection',p_table,p_id::text,jsonb_build_object(
      'reason',trim(p_reason),'userId',before_row->'user_id',
      'before',(SELECT jsonb_object_agg(k,before_row->k) FROM jsonb_object_keys(p_patch) k),
      'after',(SELECT jsonb_object_agg(k,after_row->k) FROM jsonb_object_keys(p_patch) k)
    ));
  RETURN jsonb_build_object('ok',true);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_support_correct(text,uuid,jsonb,jsonb,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_support_correct(text,uuid,jsonb,jsonb,text,text) TO service_role;
REVOKE ALL ON FUNCTION public.refresh_product_review_aggregate(uuid) FROM PUBLIC,anon,authenticated;
COMMIT;
