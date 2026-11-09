-- DRAFT ONLY. Not an automatic migration. No backfill or readiness promotion.
-- Deploy storage/RPCs -> authenticated admin-write actions -> fresh reviews ->
-- compatibility counts/approval -> consumer rollout. See the contract document.
CREATE TABLE public.ingredient_label_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE,
  product_id UUID NOT NULL,
  label_set_id UUID NOT NULL,
  revision TEXT NOT NULL,
  reviewed_snapshot JSONB NOT NULL,
  observation JSONB NOT NULL,
  reviewed_by TEXT NOT NULL CHECK (length(btrim(reviewed_by)) > 0),
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, revision)
);
ALTER TABLE public.ingredient_label_comparisons ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ingredient_label_comparisons FROM PUBLIC, anon, authenticated, service_role;
-- No direct application INSERT/UPDATE/DELETE. Only the approval RPC writes.

CREATE FUNCTION private.label_review_snapshot(p_id UUID) RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
 SELECT jsonb_build_object(
   'productRevision',to_jsonb(p)->'updated_at',
   'product', jsonb_build_array(p.id,p.name,p.brand_name,p.variant_name,p.net_weight_text,p.barcode,
     CASE WHEN to_jsonb(p)->>'target_pet_type' IN ('dog','cat','all') THEN to_jsonb(p)->>'target_pet_type' END,
     to_jsonb(p)->'target_life_stage',to_jsonb(p)->'product_type',to_jsonb(p)->'formulation'),
   'labels', COALESCE((SELECT jsonb_agg(jsonb_build_object(
     'id',l.id,'raw',l.raw_label_text,'source',l.source_reference,'sourceType',l.source_type,
     'revision',l.updated_at,'items',COALESCE((SELECT jsonb_agg(jsonb_build_object(
       'id',i.id,'order',i.display_order,'raw',i.raw_ingredient_text,'match',i.match_status,
       'resolvedDefinition',to_jsonb(g),'canonicalDefinition',to_jsonb(c),
       'legacy',i.legacy_ingredient_id,'canonical',i.canonical_ingredient_id,
       'updated',i.updated_at,'parser',i.parser_metadata,'amount',i.amount_text,'percentage',i.percentage,
       'canonicalRow',CASE WHEN c.id IS NULL THEN NULL ELSE jsonb_build_array(c.id,c.status,c.canonical_name_ko,c.canonical_name_en,c.legacy_ingredient_id) END,
       'resolved',CASE WHEN g.id IS NULL THEN NULL ELSE jsonb_build_array(g.id,c.id,COALESCE(NULLIF(c.canonical_name_ko,''),g.name_ko,i.raw_ingredient_text),COALESCE(NULLIF(c.canonical_name_en,''),g.name_en,''),CASE g.risk_level::text WHEN 'warning' THEN 'caution' ELSE g.risk_level END,i.raw_ingredient_text) END
     ) ORDER BY i.display_order,i.id) FROM public.product_ingredient_label_items i
       LEFT JOIN public.canonical_ingredients c ON c.id=i.canonical_ingredient_id
       LEFT JOIN public.ingredients g ON g.id=COALESCE(i.legacy_ingredient_id,c.legacy_ingredient_id)
       WHERE i.label_set_id=l.id),'[]'::jsonb)) ORDER BY l.id)
     FROM public.product_ingredient_label_sets l WHERE l.product_id=p.id AND l.is_current),'[]'::jsonb)
 ) FROM public.products p WHERE p.id=p_id
$$;
REVOKE ALL ON FUNCTION private.label_review_snapshot(UUID) FROM PUBLIC, anon, authenticated, service_role;

-- Structure/matching only. Coverage of the photographed/source label requires
-- explicit human review; the existing shared parser is also checked by Edge.
CREATE FUNCTION private.label_review_valid(s JSONB) RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS $$
 SELECT COALESCE(jsonb_array_length(s->'labels')=1
   AND length(btrim(s#>>'{labels,0,raw}'))>0
   AND jsonb_array_length(s#>'{labels,0,items}')>0
   AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(s#>'{labels,0,items}') x
     WHERE x->>'match' IS DISTINCT FROM 'matched' OR x->'resolved'='null'::jsonb
       OR (x->'canonicalRow'<>'null'::jsonb AND COALESCE(x#>>'{canonicalRow,1}','')<>'active')
       OR COALESCE(x#>>'{resolved,4}','') NOT IN ('safe','caution','danger'))
   AND (SELECT count(*)=count(DISTINCT x->>'id') AND count(*)=count(DISTINCT x->>'order')
     FROM jsonb_array_elements(s#>'{labels,0,items}') x),FALSE)
$$;
REVOKE ALL ON FUNCTION private.label_review_valid(JSONB) FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.admin_get_label_comparison_review(p_product_id UUID) RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT CASE WHEN s IS NULL THEN NULL ELSE jsonb_build_object('snapshot',s,
   'revision',encode(sha256(convert_to(s::text,'UTF8')),'hex'),'eligible',private.label_review_valid(s)) END
 FROM (SELECT private.label_review_snapshot(p_product_id) s) q
$$;
REVOKE ALL ON FUNCTION public.admin_get_label_comparison_review(UUID) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_label_comparison_review(UUID) TO service_role;

CREATE FUNCTION public.admin_approve_label_comparison(
 p_product_id UUID, p_revision TEXT, p_item_ids JSONB, p_observation JSONB, p_actor TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE s JSONB; r TEXT; ids JSONB; v_id UUID;
BEGIN
 -- Short administrative transaction; table-wide SHARE prevents direct legacy
 -- mutations racing approval. Set a bounded timeout; no retry in the client.
 PERFORM set_config('lock_timeout','3s',true);
 LOCK TABLE public.products,public.product_ingredient_label_sets,public.product_ingredient_label_items,
   public.canonical_ingredients,public.ingredients IN SHARE MODE;
 s:=private.label_review_snapshot(p_product_id);
 IF s IS NULL THEN RAISE EXCEPTION 'product_missing' USING ERRCODE='22023'; END IF;
 r:=encode(sha256(convert_to(s::text,'UTF8')),'hex');
 IF p_revision IS DISTINCT FROM r THEN RAISE EXCEPTION 'review_revision_conflict' USING ERRCODE='40001'; END IF;
 IF NOT private.label_review_valid(s) THEN RAISE EXCEPTION 'label_not_reviewable' USING ERRCODE='22023'; END IF;
 SELECT jsonb_agg(x->'id' ORDER BY (x->>'order')::integer,x->>'id') INTO ids
 FROM jsonb_array_elements(s#>'{labels,0,items}') x;
 IF p_item_ids IS DISTINCT FROM ids THEN RAISE EXCEPTION 'item_review_incomplete' USING ERRCODE='22023'; END IF;
 IF p_actor IS NULL OR length(btrim(p_actor))=0
   OR p_observation->'identityConfirmed' IS DISTINCT FROM 'true'::jsonb
   OR p_observation->'wholeLabelCompared' IS DISTINCT FROM 'true'::jsonb
   OR length(btrim(COALESCE(p_observation->>'sourceReference','')))=0
   OR length(btrim(COALESCE(p_observation->>'identityNotes','')))=0
   OR length(btrim(COALESCE(p_observation->>'coverageNotes','')))=0 THEN
   RAISE EXCEPTION 'fresh_review_observation_required' USING ERRCODE='22023';
 END IF;
 INSERT INTO public.ingredient_label_comparisons(product_id,label_set_id,revision,reviewed_snapshot,observation,reviewed_by)
 VALUES(p_product_id,(s#>>'{labels,0,id}')::uuid,r,s,p_observation,p_actor)
 ON CONFLICT(product_id,revision) DO NOTHING RETURNING id INTO v_id;
 IF v_id IS NULL THEN RETURN jsonb_build_object('status','already_reviewed','revision',r); END IF;
 INSERT INTO public.admin_audit_log(actor,action,target_table,target_id,detail)
 VALUES(p_actor,'approveIngredientLabelReview','ingredient_label_comparisons',v_id::text,
   jsonb_build_object('productId',p_product_id,'revision',r));
 RETURN jsonb_build_object('status','approved','revision',r);
END $$;
REVOKE ALL ON FUNCTION public.admin_approve_label_comparison(UUID,TEXT,JSONB,JSONB,TEXT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_approve_label_comparison(UUID,TEXT,JSONB,JSONB,TEXT) TO service_role;

CREATE FUNCTION public.get_public_label_comparison(p_product_ids UUID[]) RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT COALESCE(jsonb_agg(jsonb_build_object('productId',q.id,'state',
   CASE WHEN e.id IS NULL THEN 'absent'
     WHEN NOT private.label_review_valid(q.s) THEN 'blocked'
     WHEN e.revision<>q.r THEN 'stale' ELSE 'verified' END,
   'labelSetId',q.s#>>'{labels,0,id}','revision',q.r,
   'binding',CASE WHEN e.revision=q.r AND private.label_review_valid(q.s) THEN jsonb_build_array(q.s->'product',COALESCE((SELECT jsonb_agg(x->'resolved' ORDER BY (x->>'order')::int,x->>'id')
     FROM jsonb_array_elements(q.s#>'{labels,0,items}') x WHERE x->>'match'='matched'),'[]'::jsonb)) ELSE '[]'::jsonb END)),'[]'::jsonb)
 FROM (SELECT p.id,private.label_review_snapshot(p.id) s,
   encode(sha256(convert_to(private.label_review_snapshot(p.id)::text,'UTF8')),'hex') r
   FROM public.products p WHERE p.id=ANY(p_product_ids) AND cardinality(p_product_ids)<=100
     AND p.is_visible=TRUE AND p.verification_status IN ('pending','reviewed','verified')
     AND (NOT private.hide_unverified_products_enabled() OR p.verification_status='verified')) q
 LEFT JOIN LATERAL(SELECT e.id,e.revision FROM public.ingredient_label_comparisons e
   WHERE e.product_id=q.id ORDER BY e.sequence DESC LIMIT 1) e ON TRUE
$$;
REVOKE ALL ON FUNCTION public.get_public_label_comparison(UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_label_comparison(UUID[]) TO anon,authenticated,service_role;
-- No product/ingredient/readiness updates; no old row promoted by counts.
-- Raw snapshot, observation, source and reviewer never appear in public output.
