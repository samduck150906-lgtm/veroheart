-- Forward candidate only. Requires matching foundation; no historical row backfill.
-- Single DO statement: CLI policy/objects and ledger share the CLI transaction.
DO $registration$
BEGIN
PERFORM set_config('lock_timeout','3s',true);
IF to_regprocedure('private.label_item_source_fingerprint(public.product_ingredient_label_items)') IS NULL THEN RAISE EXCEPTION 'matching foundation required'; END IF;
IF NOT EXISTS(SELECT 1 FROM pg_index i WHERE i.indexrelid=to_regclass('public.idx_product_ingredient_label_sets_one_current') AND i.indrelid='public.product_ingredient_label_sets'::regclass AND i.indisunique AND i.indisvalid
 AND pg_get_expr(i.indpred,i.indrelid)='is_current' AND i.indnkeyatts=1
 AND (SELECT attname FROM pg_attribute WHERE attrelid=i.indrelid AND attnum=i.indkey[0])='product_id') THEN RAISE EXCEPTION 'expected one-current-label unique index required'; END IF;
CREATE TABLE private.label_source_registrations (
 id UUID PRIMARY KEY, product_id UUID NOT NULL, label_set_id UUID NOT NULL UNIQUE,
 previous_label_set_id UUID, payload JSONB NOT NULL, revision_before TEXT NOT NULL,
 actor TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE private.label_source_registrations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.label_source_registrations FROM PUBLIC,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION private.label_review_snapshot(p_id UUID) RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
 SELECT jsonb_build_object(
   'generation',COALESCE((SELECT revision FROM private.ingredient_label_revisions WHERE product_id=p.id),0),
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
       WHERE i.label_set_id=l.id),'[]'::jsonb)) || COALESCE((SELECT jsonb_build_object('sourceRegistration',jsonb_build_object('id',r.id,'stage',r.payload->>'stage')) FROM private.label_source_registrations r WHERE r.label_set_id=l.id),'{}'::jsonb) ORDER BY l.id)
     FROM public.product_ingredient_label_sets l WHERE l.product_id=p.id AND l.is_current),'[]'::jsonb)
 ) FROM public.products p WHERE p.id=p_id
$$;
CREATE OR REPLACE FUNCTION private.label_review_valid(s JSONB) RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS $$
 SELECT COALESCE(jsonb_array_length(s->'labels')=1
   AND COALESCE(s#>>'{labels,0,sourceRegistration,stage}','draft')<>'held'
   AND length(btrim(s#>>'{labels,0,raw}'))>0
   AND jsonb_array_length(s#>'{labels,0,items}')>0
   AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(s#>'{labels,0,items}') x
     WHERE x->>'match' IS DISTINCT FROM 'matched' OR x->'resolved'='null'::jsonb
       OR (x->'canonicalRow'<>'null'::jsonb AND COALESCE(x#>>'{canonicalRow,1}','')<>'active')
       OR COALESCE(x#>>'{resolved,4}','') NOT IN ('safe','caution','danger'))
   AND (SELECT count(*)=count(DISTINCT x->>'id') AND count(*)=count(DISTINCT x->>'order')
     FROM jsonb_array_elements(s#>'{labels,0,items}') x),FALSE)
$$;

CREATE FUNCTION public.admin_get_label_source_workspace(p_product_id UUID) RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $workspace$
 SELECT jsonb_build_object('review',public.admin_get_label_comparison_review(p_product_id),
 'registration',(SELECT jsonb_build_object('id',r.id,'payload',r.payload,'recordedAt',r.created_at,'auditRecorded',EXISTS(SELECT 1 FROM public.admin_audit_log a WHERE a.action='registerIngredientLabelSource' AND a.target_id=r.label_set_id::text AND a.detail->>'registrationId'=r.id::text))
 FROM private.label_source_registrations r JOIN public.product_ingredient_label_sets l ON l.id=r.label_set_id
 WHERE l.product_id=p_product_id AND l.is_current))
$workspace$;
CREATE FUNCTION public.admin_register_label_source(p_product_id UUID,p_revision TEXT,p_label_set_id UUID,p_payload JSONB,p_actor TEXT) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $save$
DECLARE s JSONB; old_id UUID; new_id UUID:=gen_random_uuid(); registration_id UUID:=gen_random_uuid();
 v_item_id UUID; item public.product_ingredient_label_items%ROWTYPE; x JSONB; ordinal INTEGER:=0; current_revision TEXT;
BEGIN
 PERFORM set_config('lock_timeout','3s',true);
 LOCK TABLE public.products,public.product_ingredient_label_sets,public.product_ingredient_label_items,public.canonical_ingredients,public.ingredients IN SHARE ROW EXCLUSIVE MODE;
 s:=private.label_review_snapshot(p_product_id);
 IF s IS NULL OR jsonb_array_length(s->'labels')>1 THEN RAISE EXCEPTION 'missing product or conflicting current labels' USING ERRCODE='22023'; END IF;
 current_revision:=encode(sha256(convert_to(s::text,'UTF8')),'hex');
 old_id:=(s#>>'{labels,0,id}')::UUID;
 IF p_revision IS DISTINCT FROM current_revision OR old_id IS DISTINCT FROM p_label_set_id THEN RAISE EXCEPTION 'stale source revision' USING ERRCODE='40001'; END IF;
 IF p_actor IS NULL OR length(btrim(p_actor))=0 OR jsonb_typeof(p_payload)<>'object'
 OR (SELECT count(*) FROM jsonb_object_keys(p_payload))<>9
 OR EXISTS(SELECT 1 FROM jsonb_object_keys(p_payload) k WHERE k NOT IN ('rawText','sourceType','sourceReference','observedAt','identityNotes','reason','items','stage','holdReason'))
 OR COALESCE(length(btrim(p_payload->>'rawText')),0) NOT BETWEEN 1 AND 30000
 OR COALESCE(p_payload->>'sourceType','') NOT IN ('manufacturer','package_image','manual','import','other')
 OR COALESCE(length(btrim(p_payload->>'sourceReference')),0) NOT BETWEEN 1 AND 2000
 OR COALESCE(length(btrim(p_payload->>'identityNotes')),0) NOT BETWEEN 1 AND 2000
 OR COALESCE(length(btrim(p_payload->>'reason')),0) NOT BETWEEN 1 AND 2000
 OR COALESCE(p_payload->>'stage','') NOT IN ('draft','held')
 OR jsonb_typeof(p_payload->'items') IS DISTINCT FROM 'array'
 OR jsonb_array_length(p_payload->'items')>100
 OR (p_payload->>'stage'='draft' AND jsonb_array_length(p_payload->'items')=0)
 OR (p_payload->>'stage'='held' AND COALESCE(length(btrim(p_payload->>'holdReason')),0) NOT BETWEEN 1 AND 2000)
 OR COALESCE(p_payload->>'observedAt','')='' THEN RAISE EXCEPTION 'invalid source payload' USING ERRCODE='22023'; END IF;
 IF (p_payload->>'observedAt')::timestamptz > clock_timestamp()+interval '5 minutes'
 OR (p_payload->>'observedAt')::timestamptz < '2000-01-01'::timestamptz THEN RAISE EXCEPTION 'invalid observation time' USING ERRCODE='22023'; END IF;
 FOR x IN SELECT value FROM jsonb_array_elements(p_payload->'items') LOOP
  IF jsonb_typeof(x)<>'object' OR (SELECT count(*) FROM jsonb_object_keys(x))<>2
  OR EXISTS(SELECT 1 FROM jsonb_object_keys(x) k WHERE k NOT IN ('rawText','section'))
  OR COALESCE(length(btrim(x->>'rawText')),0) NOT BETWEEN 1 AND 2000
  OR COALESCE(x->>'section','') NOT IN ('ingredients','additives','unresolved')
  OR (x->>'section'='unresolved' AND p_payload->>'stage'<>'held') THEN RAISE EXCEPTION 'invalid source item' USING ERRCODE='22023'; END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM private.label_source_registrations WHERE label_set_id=old_id AND payload=p_payload) THEN
  RETURN jsonb_build_object('status','unchanged','workspace',public.admin_get_label_source_workspace(p_product_id));
 END IF;
 UPDATE public.product_ingredient_label_sets SET is_current=false,updated_at=clock_timestamp() WHERE id=old_id;
 INSERT INTO public.product_ingredient_label_sets(id,product_id,raw_label_text,source_type,source_reference,is_current,captured_at)
 VALUES(new_id,p_product_id,p_payload->>'rawText',p_payload->>'sourceType','registration:'||registration_id,true,(p_payload->>'observedAt')::timestamptz);
 INSERT INTO private.label_source_registrations(id,product_id,label_set_id,previous_label_set_id,payload,revision_before,actor)
 VALUES(registration_id,p_product_id,new_id,old_id,p_payload,p_revision,p_actor);
 FOR x IN SELECT value FROM jsonb_array_elements(p_payload->'items') LOOP
  ordinal:=ordinal+1;v_item_id:=gen_random_uuid();
  item:=jsonb_populate_record(NULL::public.product_ingredient_label_items,jsonb_build_object('id',v_item_id,'label_set_id',new_id,'display_order',ordinal,'raw_ingredient_text',x->>'rawText','match_status','unreviewed','parser_metadata',jsonb_build_object('section',x->>'section')));
  -- A server-recorded hold prevents the existing automatic matcher from silently certifying new items.
  INSERT INTO private.label_item_match_decisions(product_id,item_id,revision_before,revision_after,source_fingerprint,decision,reason,before_state,after_state,actor)
  VALUES(p_product_id,v_item_id,p_revision,p_revision,private.label_item_source_fingerprint(item),'hold','New raw source: individual mapping not reviewed','null'::jsonb,jsonb_build_object('match','unreviewed'),p_actor);
  INSERT INTO public.product_ingredient_label_items(id,label_set_id,display_order,raw_ingredient_text,match_status,parser_metadata)
  VALUES(v_item_id,new_id,ordinal,x->>'rawText','unreviewed',jsonb_build_object('section',x->>'section'));
 END LOOP;
 IF EXISTS(SELECT 1 FROM public.product_ingredient_label_items WHERE label_set_id=new_id AND (match_status<>'unreviewed' OR canonical_ingredient_id IS NOT NULL OR legacy_ingredient_id IS NOT NULL)) THEN RAISE EXCEPTION 'new source inherited matching'; END IF;
 current_revision:=encode(sha256(convert_to(private.label_review_snapshot(p_product_id)::text,'UTF8')),'hex');
 UPDATE private.label_item_match_decisions SET revision_after=current_revision WHERE product_id=p_product_id AND item_id IN (SELECT id FROM public.product_ingredient_label_items WHERE label_set_id=new_id);
 INSERT INTO public.admin_audit_log(actor,action,target_table,target_id,detail)
 VALUES(p_actor,'registerIngredientLabelSource','product_ingredient_label_sets',new_id::text,jsonb_build_object('registrationId',registration_id,'previousLabelSetId',old_id,'revisionBefore',p_revision,'revisionAfter',current_revision,'itemCount',ordinal,'stage',p_payload->>'stage'));
 RETURN jsonb_build_object('status','saved','workspace',public.admin_get_label_source_workspace(p_product_id));
END $save$;
REVOKE ALL ON FUNCTION public.admin_get_label_source_workspace(UUID),public.admin_register_label_source(UUID,TEXT,UUID,JSONB,TEXT) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.admin_get_label_source_workspace(UUID),public.admin_register_label_source(UUID,TEXT,UUID,JSONB,TEXT) TO service_role;
IF EXISTS(SELECT 1 FROM (VALUES('anon'),('authenticated'),('service_role')) r(role) WHERE has_table_privilege(role,'private.label_source_registrations','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')) THEN RAISE EXCEPTION 'unexpected effective registration privileges'; END IF;
IF EXISTS(SELECT 1 FROM (VALUES('anon'),('authenticated')) r(role) CROSS JOIN (VALUES('public.admin_get_label_source_workspace(uuid)'),('public.admin_register_label_source(uuid,text,uuid,jsonb,text)')) f(signature) WHERE has_function_privilege(role,signature,'EXECUTE')) THEN RAISE EXCEPTION 'unexpected effective source RPC access'; END IF;
END $registration$;
