-- DRAFT ONLY: outside migrations; requires the reconciled catalog foundation.
BEGIN;

CREATE TABLE public.product_purchase_links (
  id uuid PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  merchant text NOT NULL CHECK (merchant = 'coupang'),
  original_url text NOT NULL CHECK (length(original_url) BETWEEN 1 AND 2000),
  resolved_url text,
  link_kind text NOT NULL CHECK (link_kind IN ('product','search','unknown')),
  verification_status text NOT NULL CHECK (verification_status IN ('unverified','verified','mismatch','stale')),
  seller_product_id text,
  seller_item_id text,
  seller_offer_id text,
  target_observation_id uuid REFERENCES public.product_observations(id) ON DELETE RESTRICT,
  seller_observation_id uuid REFERENCES public.product_observations(id) ON DELETE RESTRICT,
  identity_fingerprint text NOT NULL,
  verified_at timestamptz,
  verified_by text,
  verification_valid_until timestamptz,
  availability text NOT NULL CHECK (availability IN ('unknown','in_stock','out_of_stock')),
  availability_valid_until timestamptz,
  hold_reason text,
  revision integer NOT NULL CHECK (revision > 0),
  identity_revision integer NOT NULL CHECK (identity_revision > 0),
  request_payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (verification_status <> 'verified' OR
    (link_kind = 'product' AND resolved_url IS NOT NULL AND target_observation_id IS NOT NULL
     AND seller_observation_id IS NOT NULL AND verified_at IS NOT NULL AND verified_by IS NOT NULL
     AND verification_valid_until IS NOT NULL))
);
CREATE UNIQUE INDEX product_purchase_links_one_verified
  ON public.product_purchase_links(product_id) WHERE verification_status = 'verified';
ALTER TABLE public.product_purchase_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.product_purchase_links FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.product_purchase_links TO service_role;

CREATE FUNCTION public.purchase_identity_complete(p_identity jsonb)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT CASE WHEN jsonb_typeof(p_identity) <> 'object' OR p_identity IS NULL THEN false ELSE
    (SELECT count(*) = 8 FROM jsonb_object_keys(p_identity)) AND
    NOT EXISTS (
      SELECT 1 FROM unnest(ARRAY['brand','line','flavor','unit_size','pack_count','composition','option','edition']) k
      WHERE jsonb_typeof(p_identity->k) IS DISTINCT FROM 'string'
        OR length(btrim(p_identity->>k)) NOT BETWEEN 1 AND 200
        OR lower(btrim(p_identity->>k)) IN ('unknown','미확인','')
    ) END;
$$;

CREATE FUNCTION public.purchase_product_identity(p_product uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT jsonb_build_object('name',p.name,'brand',p.brand_name,
      'variant',p.variant_name,'weight',p.net_weight_text,'barcode',p.barcode,
      'display_name',to_jsonb(p)->'display_name','canonical_key',to_jsonb(p)->'canonical_product_key',
      'pet_type',to_jsonb(p)->'target_pet_type','life_stage',to_jsonb(p)->'target_life_stage',
      'formulation',to_jsonb(p)->'formulation')
  FROM public.products p WHERE p.id=p_product;
$$;
REVOKE ALL ON FUNCTION public.purchase_product_identity(uuid) FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.purchase_link_fingerprint(p_product uuid, p_target uuid, p_seller uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT md5(jsonb_build_object(
    'product',public.purchase_product_identity(p.id),
    'target',to_jsonb(t),
    'seller',(to_jsonb(s)-'retrieved_at'-'extracted_data') ||
      jsonb_build_object('extracted_data',s.extracted_data-'availability'))::text)
  FROM public.products p
  LEFT JOIN public.product_observations t ON t.id=p_target AND t.product_id=p.id
  LEFT JOIN public.product_observations s ON s.id=p_seller AND s.product_id=p.id
  WHERE p.id=p_product;
$$;
-- This URL structure is necessary, never sufficient proof of SKU identity.
CREATE FUNCTION public.purchase_coupang_option_url(p_url text, p_product text, p_item text, p_offer text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT coalesce(
    p_url ~ ('^https://(www\.|m\.)?coupang\.com/vp/products/' || p_product || '/?\?[^#[:space:][:cntrl:]]+$')
    AND array_length(string_to_array(split_part(p_url,'?',2),'&'),1)=2
    AND (SELECT array_agg(v[1])=ARRAY[p_item] FROM regexp_matches(p_url,'[?&]itemId=([^&#]*)','g') AS parts(v))
    AND (SELECT array_agg(v[1])=ARRAY[p_offer] FROM regexp_matches(p_url,'[?&]vendorItemId=([^&#]*)','g') AS parts(v)), false);
$$;
REVOKE ALL ON FUNCTION public.purchase_identity_complete(jsonb) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.purchase_link_fingerprint(uuid,uuid,uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.purchase_coupang_option_url(text,text,text,text) FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.admin_save_product_purchase_link(p_input jsonb, p_actor text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_id uuid; v_product uuid; v_target uuid; v_seller uuid; v_expected integer; v_identity_revision integer;
  v_old public.product_purchase_links%ROWTYPE;
  v_saved public.product_purchase_links%ROWTYPE;
  v_t public.product_observations%ROWTYPE;
  v_s public.product_observations%ROWTYPE;
  v_fp text; v_request jsonb; v_verified boolean; v_until timestamptz; v_stock_until timestamptz;
BEGIN
  IF p_actor IS NULL OR length(btrim(p_actor)) NOT BETWEEN 1 AND 64 THEN
    RAISE EXCEPTION 'invalid actor' USING ERRCODE='22023';
  END IF;
  IF jsonb_typeof(p_input) IS DISTINCT FROM 'object' OR EXISTS (
    SELECT 1 FROM jsonb_object_keys(p_input) k WHERE k <> ALL(ARRAY[
      'id','product_id','expected_revision','merchant','original_url','resolved_url','link_kind',
      'verification_status','seller_product_id','seller_item_id','seller_offer_id',
      'target_observation_id','seller_observation_id','verification_valid_until',
      'availability','availability_valid_until','hold_reason'])
  ) THEN RAISE EXCEPTION 'invalid fields' USING ERRCODE='22023'; END IF;
  IF jsonb_typeof(p_input->'expected_revision') IS DISTINCT FROM 'number' OR EXISTS (
    SELECT 1 FROM jsonb_each(p_input) AS entry(k,v)
    WHERE k <> 'expected_revision' AND jsonb_typeof(v) NOT IN ('string','null')
      OR (jsonb_typeof(v)='string' AND length(v #>> '{}') > CASE WHEN k LIKE '%url' THEN 2000 ELSE 500 END)
  ) THEN RAISE EXCEPTION 'invalid field types' USING ERRCODE='22023'; END IF;
  v_id := (p_input->>'id')::uuid; v_product := (p_input->>'product_id')::uuid;
  v_target := (p_input->>'target_observation_id')::uuid;
  v_seller := (p_input->>'seller_observation_id')::uuid;
  v_expected := (p_input->>'expected_revision')::integer;
  IF v_id IS NULL OR v_product IS NULL OR v_expected IS NULL OR v_expected < 0
    OR p_input->>'merchant' IS DISTINCT FROM 'coupang'
    OR coalesce(p_input->>'link_kind','') NOT IN ('product','search','unknown')
    OR coalesce(p_input->>'verification_status','') NOT IN ('unverified','verified','mismatch','stale')
    OR coalesce(p_input->>'availability','') NOT IN ('unknown','in_stock','out_of_stock')
    OR length(coalesce(p_input->>'original_url','')) NOT BETWEEN 1 AND 2000
    OR (p_input->>'original_url') ~ '[[:space:][:cntrl:]]'
    OR (p_input->>'original_url') !~ '^https://(www\.|m\.|link\.)?coupang\.com/'
    OR (p_input->>'resolved_url' IS NOT NULL AND
      (length(p_input->>'resolved_url') > 2000 OR (p_input->>'resolved_url') ~ '[[:space:][:cntrl:]]'
       OR (p_input->>'resolved_url') !~ '^https://(www\.|m\.|link\.)?coupang\.com/') )
  THEN RAISE EXCEPTION 'invalid link payload' USING ERRCODE='22023'; END IF;
  -- Product lock serializes competing links; existing writers also take this row lock.
  PERFORM 1 FROM public.products WHERE id=v_product FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'product not found' USING ERRCODE='22023'; END IF;
  SELECT * INTO v_old FROM public.product_purchase_links WHERE id=v_id FOR UPDATE;
  IF FOUND AND (v_old.product_id <> v_product OR v_old.original_url <> p_input->>'original_url') THEN
    RAISE EXCEPTION 'product and original URL are immutable' USING ERRCODE='22023';
  END IF;
  PERFORM 1 FROM public.product_observations WHERE id IN (v_target,v_seller) ORDER BY id FOR SHARE;
  IF v_target IS NOT NULL THEN
    SELECT * INTO v_t FROM public.product_observations WHERE id=v_target AND product_id=v_product;
    IF NOT FOUND THEN RAISE EXCEPTION 'invalid target evidence' USING ERRCODE='22023'; END IF;
  END IF;
  IF v_seller IS NOT NULL THEN
    SELECT * INTO v_s FROM public.product_observations WHERE id=v_seller AND product_id=v_product;
    IF NOT FOUND THEN RAISE EXCEPTION 'invalid seller evidence' USING ERRCODE='22023'; END IF;
  END IF;
  v_verified := p_input->>'verification_status' = 'verified';
  v_until := (p_input->>'verification_valid_until')::timestamptz;
  v_stock_until := (p_input->>'availability_valid_until')::timestamptz;
  IF v_verified THEN
    IF p_input->>'link_kind' <> 'product' OR p_input->>'resolved_url' IS NULL
      OR v_target IS NULL OR v_seller IS NULL OR v_target = v_seller
      OR v_t.is_current IS DISTINCT FROM true OR v_s.is_current IS DISTINCT FROM true
      OR NOT public.purchase_identity_complete(v_t.extracted_data->'purchase_identity_v1')
      OR v_t.extracted_data->'purchase_product_identity_v1' IS DISTINCT FROM public.purchase_product_identity(v_product)
      OR v_t.extracted_data->'purchase_identity_v1' IS DISTINCT FROM v_s.extracted_data->'purchase_identity_v1'
      OR v_s.extracted_data->>'link_kind' IS DISTINCT FROM 'product'
      OR v_s.source_url IS DISTINCT FROM p_input->>'resolved_url'
      OR v_s.retrieved_at > now() OR v_s.retrieved_at < now()-interval '24 hours'
      OR NOT EXISTS (SELECT 1 FROM public.products p WHERE p.id=v_product
        AND p.name=v_t.raw_name AND p.brand_name=v_t.raw_brand
        AND p.brand_name=v_t.extracted_data->'purchase_identity_v1'->>'brand')
      OR coalesce(v_t.source_url,'') !~ '^https://'
      OR v_until IS NULL OR v_until <= now() OR v_until > now()+interval '24 hours'
      OR v_until > v_s.retrieved_at+interval '24 hours'
    THEN RAISE EXCEPTION 'SKU correspondence evidence is incomplete or stale' USING ERRCODE='22023'; END IF;
    IF EXISTS (SELECT 1 FROM unnest(ARRAY['seller_product_id','seller_item_id','seller_offer_id']) k
       WHERE coalesce(p_input->>k,'') !~ '^[0-9]{1,32}$'
         OR p_input->>k IS DISTINCT FROM v_s.extracted_data->>k) THEN
      RAISE EXCEPTION 'seller option IDs do not match evidence' USING ERRCODE='22023';
    END IF;
    IF NOT public.purchase_coupang_option_url(p_input->>'resolved_url',p_input->>'seller_product_id',
      p_input->>'seller_item_id',p_input->>'seller_offer_id') THEN
      RAISE EXCEPTION 'destination does not identify the observed seller option' USING ERRCODE='22023';
    END IF;
    IF EXISTS (SELECT 1 FROM public.product_purchase_links
      WHERE product_id=v_product AND verification_status='verified' AND id<>v_id) THEN
      RETURN jsonb_build_object('status','conflict','reason','active_link_exists','id',v_id);
    END IF;
  END IF;
  IF p_input->>'availability' <> 'unknown' AND
    (v_stock_until IS NULL OR v_stock_until <= now() OR v_stock_until > now()+interval '1 hour'
     OR v_s.retrieved_at > now() OR v_s.retrieved_at < now()-interval '1 hour'
     OR v_s.extracted_data->>'availability' IS DISTINCT FROM p_input->>'availability') THEN
    RAISE EXCEPTION 'invalid availability evidence or expiry' USING ERRCODE='22023';
  END IF;
  v_request := p_input-'expected_revision';
  v_fp := public.purchase_link_fingerprint(v_product,v_target,v_seller);
  IF v_old.id IS NOT NULL AND v_old.request_payload=v_request AND v_old.identity_fingerprint=v_fp THEN
    RETURN jsonb_build_object('status','already_applied','id',v_id,'revision',v_old.revision);
  END IF;
  IF (v_old.id IS NULL AND v_expected<>0) OR (v_old.id IS NOT NULL AND v_old.revision<>v_expected) THEN
    RETURN jsonb_build_object('status','conflict','id',v_id,'revision',v_old.revision);
  END IF;
  v_identity_revision := CASE
    WHEN v_old.id IS NULL THEN 1
    WHEN (v_old.request_payload-'availability'-'availability_valid_until') =
         (v_request-'availability'-'availability_valid_until') AND v_old.identity_fingerprint=v_fp
      THEN v_old.identity_revision
    ELSE v_old.identity_revision+1 END;
  INSERT INTO public.product_purchase_links AS l (
    id,product_id,merchant,original_url,resolved_url,link_kind,verification_status,
    seller_product_id,seller_item_id,seller_offer_id,target_observation_id,seller_observation_id,
    identity_fingerprint,verified_at,verified_by,verification_valid_until,availability,
    availability_valid_until,hold_reason,revision,identity_revision,request_payload)
  VALUES (v_id,v_product,'coupang',p_input->>'original_url',p_input->>'resolved_url',p_input->>'link_kind',
    p_input->>'verification_status',p_input->>'seller_product_id',p_input->>'seller_item_id',
    p_input->>'seller_offer_id',v_target,v_seller,v_fp,
    CASE WHEN v_verified THEN CASE WHEN v_identity_revision=v_old.identity_revision THEN v_old.verified_at ELSE now() END END,
    CASE WHEN v_verified THEN CASE WHEN v_identity_revision=v_old.identity_revision THEN v_old.verified_by ELSE p_actor END END,v_until,
    p_input->>'availability',v_stock_until,p_input->>'hold_reason',coalesce(v_old.revision,0)+1,v_identity_revision,v_request)
  ON CONFLICT (id) DO UPDATE SET
    resolved_url=excluded.resolved_url,link_kind=excluded.link_kind,verification_status=excluded.verification_status,
    seller_product_id=excluded.seller_product_id,seller_item_id=excluded.seller_item_id,seller_offer_id=excluded.seller_offer_id,
    target_observation_id=excluded.target_observation_id,seller_observation_id=excluded.seller_observation_id,
    identity_fingerprint=excluded.identity_fingerprint,verified_at=excluded.verified_at,verified_by=excluded.verified_by,
    verification_valid_until=excluded.verification_valid_until,availability=excluded.availability,
    availability_valid_until=excluded.availability_valid_until,hold_reason=excluded.hold_reason,
    revision=excluded.revision,identity_revision=excluded.identity_revision,
    request_payload=excluded.request_payload,updated_at=now()
  -- A different product can race to claim the same not-yet-visible UUID.
  -- Never turn that insert collision into an unchecked update of its row.
  WHERE v_old.id IS NOT NULL AND l.product_id=excluded.product_id
    AND l.original_url=excluded.original_url AND l.revision=v_expected
  RETURNING * INTO v_saved;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status','conflict','reason','link_id_conflict','id',v_id);
  END IF;
  INSERT INTO public.admin_audit_log(actor,action,target_table,target_id,detail)
    VALUES(p_actor,'saveProductPurchaseLink','product_purchase_links',v_id::text,
      jsonb_build_object('before',CASE WHEN v_old.id IS NOT NULL THEN to_jsonb(v_old) END,'after',to_jsonb(v_saved)));
  RETURN jsonb_build_object('status','applied','id',v_id,'revision',v_saved.revision);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_save_product_purchase_link(jsonb,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_product_purchase_link(jsonb,text) TO service_role;

CREATE FUNCTION public.get_product_purchase_links(p_product_id uuid)
RETURNS TABLE(id uuid,product_id uuid,merchant text,destination_url text,action text,
  verified_at timestamptz,verification_valid_until timestamptz,availability text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT l.id,l.product_id,l.merchant,
    CASE WHEN stock.state='out_of_stock' THEN NULL ELSE l.resolved_url END,
    CASE WHEN stock.state='out_of_stock' THEN 'unavailable'
         WHEN stock.state='in_stock' THEN 'buy'
         ELSE 'check_at_seller' END,
    l.verified_at,l.verification_valid_until,
    stock.state
  FROM public.product_purchase_links l JOIN public.products p ON p.id=l.product_id
  JOIN public.product_observations t ON t.id=l.target_observation_id
  JOIN public.product_observations s ON s.id=l.seller_observation_id
  CROSS JOIN LATERAL (SELECT CASE
    WHEN l.availability_valid_until>now() AND s.retrieved_at<=now() AND s.retrieved_at>=now()-interval '1 hour'
      AND s.extracted_data->>'availability'=l.availability
      THEN l.availability ELSE 'unknown' END AS state) stock
  WHERE l.product_id=p_product_id AND p.is_visible=true
    AND p.verification_status IN ('reviewed','verified')
    AND (NOT private.hide_unverified_products_enabled() OR p.verification_status='verified')
    AND l.link_kind='product' AND l.verification_status='verified' AND l.verification_valid_until>now()
    AND t.is_current AND s.is_current
    AND t.extracted_data->'purchase_product_identity_v1'=public.purchase_product_identity(p.id)
    AND s.retrieved_at<=now() AND s.retrieved_at>=now()-interval '24 hours'
    AND l.identity_fingerprint=public.purchase_link_fingerprint(l.product_id,t.id,s.id);
$$;
REVOKE ALL ON FUNCTION public.get_product_purchase_links(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_product_purchase_links(uuid) TO anon, authenticated, service_role;

-- One transaction owns the product lock, trash snapshot, delete and audit. Link
-- writers take the same lock: a concurrent new link cannot slip past this check.
CREATE FUNCTION public.admin_delete_product(p_product_id uuid, p_actor text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_product public.products%ROWTYPE;
  v_snapshot jsonb;
BEGIN
  IF p_product_id IS NULL OR p_actor IS NULL OR btrim(p_actor) = '' OR length(p_actor)>200 THEN
    RAISE EXCEPTION 'invalid deletion request' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_product FROM public.products WHERE id=p_product_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('status','not_found'); END IF;
  IF EXISTS (SELECT 1 FROM public.product_purchase_links WHERE product_id=p_product_id) THEN
    RETURN jsonb_build_object('status','blocked_purchase_history');
  END IF;
  v_snapshot := jsonb_build_object('product',to_jsonb(v_product),
    'product_ingredients',COALESCE((SELECT jsonb_agg(to_jsonb(r)) FROM
      (SELECT * FROM public.product_ingredients WHERE product_id=p_product_id FOR UPDATE) r),'[]'::jsonb),
    'nutritional_profiles',COALESCE((SELECT jsonb_agg(to_jsonb(r)) FROM
      (SELECT * FROM public.nutritional_profiles WHERE product_id=p_product_id FOR UPDATE) r),'[]'::jsonb),
    'reviews',COALESCE((SELECT jsonb_agg(to_jsonb(r)) FROM
      (SELECT * FROM public.reviews WHERE product_id=p_product_id FOR UPDATE) r),'[]'::jsonb));
  INSERT INTO public.admin_trash(entity_type,entity_id,label,sub_label,snapshot,deleted_by)
    VALUES('product',p_product_id,COALESCE(v_product.name,'이름 없는 제품'),v_product.brand_name,v_snapshot,p_actor);
  DELETE FROM public.products WHERE id=p_product_id;
  INSERT INTO public.admin_audit_log(actor,action,target_table,target_id,detail)
    VALUES(p_actor,'deleteProduct','products',p_product_id::text,
      jsonb_build_object('name',v_product.name,'restorable',true));
  RETURN jsonb_build_object('status','deleted','restorable',true);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_delete_product(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_product(uuid,text) TO service_role;
COMMIT;
