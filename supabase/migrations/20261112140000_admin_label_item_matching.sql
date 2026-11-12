-- Forward deployment candidate. DB -> admin-write -> administrator UI; operating approval required.
-- Matching does not certify label transcription, SKU identity or whole-label coverage.
DO $label_item_matching$
BEGIN
PERFORM pg_catalog.set_config('lock_timeout','3s',true);
IF to_regprocedure('public.admin_get_label_comparison_review(uuid)') IS NULL
 OR to_regclass('private.ingredient_label_revisions') IS NULL
 OR pg_get_serial_sequence('public.ingredient_label_comparisons','sequence') IS NULL THEN
 RAISE EXCEPTION 'Label comparison foundation required';
END IF;
CREATE TABLE private.label_item_match_decisions (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 product_id UUID NOT NULL, item_id UUID NOT NULL,
 revision_before TEXT NOT NULL, revision_after TEXT NOT NULL,
 decision TEXT NOT NULL CHECK(decision IN ('match','hold')),
 reason TEXT NOT NULL CHECK(length(btrim(reason)) BETWEEN 1 AND 2000),
 before_state JSONB NOT NULL, after_state JSONB NOT NULL,
 actor TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE private.label_item_match_decisions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.label_item_match_decisions FROM PUBLIC,anon,authenticated,service_role;
CREATE INDEX label_item_match_decisions_item ON private.label_item_match_decisions(item_id,created_at DESC,id);

CREATE FUNCTION public.admin_get_label_item_workspace(p_product_id UUID) RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $workspace$
 SELECT jsonb_build_object('review',public.admin_get_label_comparison_review(p_product_id),
  'decisions',COALESCE((SELECT jsonb_agg(x) FROM (
   SELECT DISTINCT ON(d.item_id) d.item_id AS "itemId",d.decision,d.reason,d.created_at AS "recordedAt"
   FROM private.label_item_match_decisions d WHERE d.product_id=p_product_id
   ORDER BY d.item_id,d.created_at DESC,d.id DESC) x),'[]'::jsonb))
$workspace$;

CREATE FUNCTION public.admin_search_label_item_candidates(p_query TEXT) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $candidates$
DECLARE q TEXT:=btrim(p_query); result JSONB;
BEGIN
 IF q IS NULL OR length(q) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Invalid candidate query' USING ERRCODE='22023'; END IF;
 SELECT COALESCE(jsonb_agg(to_jsonb(x)),'[]'::jsonb) INTO result FROM (
  SELECT * FROM (
   SELECT 'canonical'::text AS kind,c.id,c.canonical_name_ko AS "nameKo",c.canonical_name_en AS "nameEn",
    COALESCE(NULLIF(to_jsonb(c)->>'description',''),g.description) AS description,
    g.risk_level::text AS risk,c.status,
    encode(sha256(convert_to(jsonb_build_object('ingredient',to_jsonb(g),'canonical',to_jsonb(c))::text,'UTF8')),'hex') AS revision,
    (c.status='active' AND g.id IS NOT NULL AND g.risk_level::text IN ('safe','caution','danger')) AS selectable
   FROM public.canonical_ingredients c LEFT JOIN public.ingredients g ON g.id=c.legacy_ingredient_id
   WHERE strpos(lower(c.canonical_name_ko),lower(q))>0 OR strpos(lower(coalesce(c.canonical_name_en,'')),lower(q))>0
    OR EXISTS(SELECT FROM public.canonical_ingredient_aliases a WHERE a.canonical_ingredient_id=c.id AND strpos(lower(a.alias_text),lower(q))>0)
   UNION ALL
   SELECT 'legacy',g.id,g.name_ko,g.name_en,g.description,g.risk_level::text,'legacy',
    encode(sha256(convert_to(jsonb_build_object('ingredient',to_jsonb(g),'canonical',NULL)::text,'UTF8')),'hex'),
    COALESCE(g.risk_level::text IN ('safe','caution','danger'),false)
   FROM public.ingredients g WHERE strpos(lower(g.name_ko),lower(q))>0 OR strpos(lower(coalesce(g.name_en,'')),lower(q))>0
  ) choices ORDER BY CASE WHEN lower("nameKo")=lower(q) THEN 0 ELSE 1 END,"nameKo",kind,id LIMIT 20
 ) x;
 RETURN result;
END $candidates$;

CREATE FUNCTION public.admin_review_label_item_match(
 p_product_id UUID,p_revision TEXT,p_item_id UUID,p_decision TEXT,
 p_target_kind TEXT,p_target_id UUID,p_target_revision TEXT,p_reason TEXT,p_actor TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $match$
DECLARE s JSONB; current_revision TEXT; after_revision TEXT; item public.product_ingredient_label_items%ROWTYPE;
 label_id UUID; legacy_id UUID; canonical_id UUID; next_status TEXT; previous_reason TEXT;
 before_state JSONB; after_state JSONB; target_revision TEXT;
BEGIN
 PERFORM pg_catalog.set_config('lock_timeout','3s',true);
 IF p_actor IS NULL OR length(btrim(p_actor)) NOT BETWEEN 1 AND 200
  OR p_revision IS NULL OR p_revision !~ '^[a-f0-9]{64}$'
  OR p_reason IS NULL OR length(btrim(p_reason)) NOT BETWEEN 1 AND 2000
  OR p_decision IS NULL OR p_decision NOT IN ('match','hold') THEN
  RAISE EXCEPTION 'Invalid item review input' USING ERRCODE='22023';
 END IF;
 -- Same table order as whole-label approval. Blocks all ordinary source writers;
 -- coarse table locks are bounded, not a claim of per-product concurrency.
 LOCK TABLE public.products,public.product_ingredient_label_sets,public.product_ingredient_label_items,
  public.canonical_ingredients,public.ingredients IN SHARE ROW EXCLUSIVE MODE;
 s:=private.label_review_snapshot(p_product_id);
 IF s IS NULL THEN RAISE EXCEPTION 'product_missing' USING ERRCODE='22023'; END IF;
 current_revision:=encode(sha256(convert_to(s::text,'UTF8')),'hex');
 IF p_revision IS DISTINCT FROM current_revision THEN RAISE EXCEPTION 'review_revision_conflict' USING ERRCODE='40001'; END IF;
 IF jsonb_array_length(s->'labels')<>1 THEN RAISE EXCEPTION 'current_label_conflict' USING ERRCODE='22023'; END IF;
 label_id:=(s#>>'{labels,0,id}')::uuid;
 SELECT * INTO item FROM public.product_ingredient_label_items WHERE id=p_item_id AND label_set_id=label_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'item_not_in_current_label' USING ERRCODE='22023'; END IF;
 IF p_decision='hold' THEN
  IF p_target_kind IS NOT NULL OR p_target_id IS NOT NULL OR p_target_revision IS NOT NULL THEN RAISE EXCEPTION 'hold_has_target' USING ERRCODE='22023'; END IF;
  next_status:='unreviewed';
 ELSE
  IF p_target_kind IS NULL OR p_target_kind NOT IN ('legacy','canonical') OR p_target_id IS NULL OR p_target_revision IS NULL OR p_target_revision !~ '^[a-f0-9]{64}$' THEN
   RAISE EXCEPTION 'match_target_required' USING ERRCODE='22023'; END IF;
  IF p_target_kind='canonical' THEN
   SELECT c.id,c.legacy_ingredient_id,encode(sha256(convert_to(jsonb_build_object('ingredient',to_jsonb(g),'canonical',to_jsonb(c))::text,'UTF8')),'hex') INTO canonical_id,legacy_id,target_revision
   FROM public.canonical_ingredients c JOIN public.ingredients g ON g.id=c.legacy_ingredient_id
   WHERE c.id=p_target_id AND c.status='active' AND g.risk_level::text IN ('safe','caution','danger');
  ELSE
   SELECT g.id,encode(sha256(convert_to(jsonb_build_object('ingredient',to_jsonb(g),'canonical',NULL)::text,'UTF8')),'hex') INTO legacy_id,target_revision FROM public.ingredients g WHERE g.id=p_target_id AND g.risk_level::text IN ('safe','caution','danger');
  END IF;
  IF legacy_id IS NULL THEN RAISE EXCEPTION 'target_not_reviewable' USING ERRCODE='22023'; END IF;
  IF p_target_revision IS DISTINCT FROM target_revision THEN RAISE EXCEPTION 'candidate_revision_conflict' USING ERRCODE='40001'; END IF;
  next_status:='matched';
 END IF;
 SELECT d.reason INTO previous_reason FROM private.label_item_match_decisions d
 WHERE d.item_id=p_item_id ORDER BY d.created_at DESC,d.id DESC LIMIT 1;
 before_state:=jsonb_build_object('status',item.match_status,'legacyId',item.legacy_ingredient_id,'canonicalId',item.canonical_ingredient_id,'reason',previous_reason);
 after_state:=jsonb_build_object('status',next_status,'legacyId',legacy_id,'canonicalId',canonical_id,'reason',btrim(p_reason));
 IF before_state=after_state THEN RETURN jsonb_build_object('status','unchanged','workspace',public.admin_get_label_item_workspace(p_product_id)); END IF;
 UPDATE public.product_ingredient_label_items SET match_status=next_status,legacy_ingredient_id=legacy_id,
  canonical_ingredient_id=canonical_id,match_confidence=NULL,updated_at=clock_timestamp() WHERE id=p_item_id;
 -- Existing foundation trigger advances the generation, invalidating old proof,
 -- including reason-only decisions and ABA edits. Never change raw/order/amount.
 after_revision:=encode(sha256(convert_to(private.label_review_snapshot(p_product_id)::text,'UTF8')),'hex');
 INSERT INTO private.label_item_match_decisions(product_id,item_id,revision_before,revision_after,decision,reason,before_state,after_state,actor)
 VALUES(p_product_id,p_item_id,current_revision,after_revision,p_decision,btrim(p_reason),before_state,after_state,p_actor);
 INSERT INTO public.admin_audit_log(actor,action,target_table,target_id,detail)
 VALUES(p_actor,'reviewLabelItemMatch','product_ingredient_label_items',p_item_id::text,
  jsonb_build_object('productId',p_product_id,'revisionBefore',current_revision,'revisionAfter',after_revision,'before',before_state,'after',after_state));
 RETURN jsonb_build_object('status','saved','workspace',public.admin_get_label_item_workspace(p_product_id));
END $match$;
REVOKE ALL ON FUNCTION public.admin_get_label_item_workspace(UUID) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.admin_search_label_item_candidates(TEXT) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.admin_review_label_item_match(UUID,TEXT,UUID,TEXT,TEXT,UUID,TEXT,TEXT,TEXT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_label_item_workspace(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_search_label_item_candidates(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_review_label_item_match(UUID,TEXT,UUID,TEXT,TEXT,UUID,TEXT,TEXT,TEXT) TO service_role;
-- Check effective privileges, including PUBLIC or inherited role grants. Any
-- unexpected access aborts this migration and its ledger insert together.
IF EXISTS (SELECT FROM unnest(ARRAY['anon','authenticated','service_role']) role_name
 WHERE has_table_privilege(role_name,'private.label_item_match_decisions',
  'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
 OR has_sequence_privilege(role_name,pg_get_serial_sequence('public.ingredient_label_comparisons','sequence'),'SELECT,USAGE,UPDATE')) THEN
 RAISE EXCEPTION 'Unexpected effective item history or evidence sequence privileges';
END IF;
IF EXISTS (SELECT FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname IN ('admin_get_label_item_workspace','admin_search_label_item_candidates','admin_review_label_item_match')
 AND (has_function_privilege('anon',p.oid,'EXECUTE') OR has_function_privilege('authenticated',p.oid,'EXECUTE')
  OR NOT has_function_privilege('service_role',p.oid,'EXECUTE'))) THEN
 RAISE EXCEPTION 'Unexpected effective label matching RPC privileges';
END IF;
END $label_item_matching$;
