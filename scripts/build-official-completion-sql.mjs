import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parseArgs} from 'node:util';
const {values:args}=parseArgs({options:{manifest:{type:'string'},out:{type:'string'},rehearsal:{type:'string'}}});
if(!args.manifest||!args.out||!args.rehearsal)throw new Error('Required: --manifest <reviewed manifest> --out <SQL file> --rehearsal <rollback SQL file>');
const raw=await readFile(args.manifest,'utf8');
const m=JSON.parse(raw);const q=value=>"'"+String(value).replaceAll("'","''")+"'";
const rows=m.accepted.map(({before,previousNutrition,previousLabels,evidence,...r})=>({...r,before,previousNutrition,previousLabels:previousLabels.map(({id,raw_label_text})=>({id,raw_label_text}))}));
const note='제조사 공식 페이지에서 제품 식별·원재료·영양 수치·포장별 GTIN을 항목별 대조했습니다. 해당 국가/지역의 공개 정보이며 국내 유통 포장과 다를 수 있습니다. 비공개 제품의 공개 승인이나 급여 적합성 검토를 의미하지 않습니다.';
let sql=`BEGIN;
SET LOCAL statement_timeout='120s'; SET LOCAL lock_timeout='5s'; SET LOCAL request.jwt.claim.role='service_role';
CREATE TABLE IF NOT EXISTS private.catalog_completion_audit_20261113(product_id uuid PRIMARY KEY,before_product jsonb NOT NULL,after_product jsonb NOT NULL,manifest_sha256 text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now());
REVOKE ALL ON private.catalog_completion_audit_20261113 FROM PUBLIC,anon,authenticated,service_role;
DO $apply$
DECLARE r jsonb; p public.products%ROWTYPE; n public.nutritional_profiles%ROWTYPE; v jsonb; actual jsonb; fields text[];
BEGIN
FOR r IN SELECT value FROM jsonb_array_elements(${q(JSON.stringify(rows))}::jsonb) LOOP
 SELECT * INTO p FROM public.products WHERE id=(r->>'productId')::uuid FOR UPDATE;
 IF NOT FOUND OR NOT (to_jsonb(p) @> (r->'before')) THEN RAISE EXCEPTION 'Product changed after evidence capture: %',r->>'productId'; END IF;
 IF COALESCE((SELECT jsonb_agg(to_jsonb(np) ORDER BY np.id) FROM public.nutritional_profiles np WHERE np.product_id=p.id),'[]'::jsonb) IS DISTINCT FROM (SELECT COALESCE(jsonb_agg(x ORDER BY x->>'id'),'[]'::jsonb) FROM jsonb_array_elements(r->'previousNutrition')x) THEN RAISE EXCEPTION 'Nutrition changed after capture: %',p.id; END IF;
 IF (r->>'labelChanged')::boolean AND ((SELECT count(*) FROM public.product_ingredient_label_sets l WHERE l.product_id=p.id AND l.is_current)<>jsonb_array_length(r->'previousLabels') OR EXISTS(SELECT 1 FROM public.product_ingredient_label_sets l WHERE l.product_id=p.id AND l.is_current AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(r->'previousLabels')x WHERE x->>'id'=l.id::text AND x->>'raw_label_text'=l.raw_label_text))) THEN RAISE EXCEPTION 'Label changed after capture: %',p.id; END IF;
 IF EXISTS(SELECT 1 FROM private.catalog_completion_audit_20261113 a WHERE a.product_id=p.id) THEN RAISE EXCEPTION 'Repair already audited: %',p.id; END IF;
 INSERT INTO public.product_observations(id,product_id,source_type,source_url,source_title,retrieved_at,raw_name,raw_brand,raw_label_text,extracted_data,is_current)
 VALUES((r->>'observationId')::uuid,p.id,'manufacturer',r->>'sourceUrl',r->>'title',(r->>'observedAt')::timestamptz,r->>'title',COALESCE(r->>'brandName',p.brand_name),NULLIF(r->>'ingredientsText',''),r-'before',false);
 INSERT INTO public.product_barcodes(product_id,barcode,source_url,source_observation_id)
 SELECT p.id,x->>'barcode',r->>'sourceUrl',(r->>'observationId')::uuid FROM jsonb_array_elements(r->'packs') x
 ON CONFLICT(product_id,barcode) DO UPDATE SET source_url=EXCLUDED.source_url,source_observation_id=EXCLUDED.source_observation_id;
 IF (r->>'labelChanged')::boolean THEN
   PERFORM public.ingest_product_ingredient_label((r->>'labelRequestId')::uuid,p.id,'manufacturer',r->>'sourceUrl',r->>'ingredientsText',r->>'language',r->'items');
 END IF;
 IF jsonb_array_length(r->'items')>0 THEN
  INSERT INTO public.ingredient_label_source_documents(source_url,document_sha256,observed_at,raw_label_text,ordered_items,evidence_note)
   VALUES(r->>'sourceUrl',r->>'documentSha256',(r->>'observedAt')::timestamptz,r->>'ingredientsText',
    (SELECT jsonb_agg(jsonb_build_object('order',x->'order','raw',x->>'rawText') ORDER BY (x->>'order')::int) FROM jsonb_array_elements(r->'items')x),${q(note)}) ON CONFLICT DO NOTHING;
 END IF;
 IF jsonb_array_length(r->'nutrients')>0 THEN
  SELECT * INTO n FROM public.nutritional_profiles np WHERE np.product_id=p.id LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN INSERT INTO public.nutritional_profiles(product_id) VALUES(p.id) RETURNING * INTO n; END IF;
  SELECT jsonb_object_agg(x->>'key',x->'value') INTO actual FROM jsonb_array_elements(r->'nutrients')x;
  UPDATE public.nutritional_profiles np SET
   crude_protein=CASE WHEN actual?'crude_protein' THEN (actual->>'crude_protein')::numeric ELSE np.crude_protein END,
   crude_fat=CASE WHEN actual?'crude_fat' THEN (actual->>'crude_fat')::numeric ELSE np.crude_fat END,
   crude_fiber=CASE WHEN actual?'crude_fiber' THEN (actual->>'crude_fiber')::numeric ELSE np.crude_fiber END,
   crude_ash=CASE WHEN actual?'crude_ash' THEN (actual->>'crude_ash')::numeric ELSE np.crude_ash END,
   moisture=CASE WHEN actual?'moisture' THEN (actual->>'moisture')::numeric ELSE np.moisture END,
   calcium=CASE WHEN actual?'calcium' THEN (actual->>'calcium')::numeric ELSE np.calcium END,
   phosphorus=CASE WHEN actual?'phosphorus' THEN (actual->>'phosphorus')::numeric ELSE np.phosphorus END WHERE np.id=n.id;
  FOR v IN SELECT value FROM jsonb_array_elements(r->'nutrients') LOOP
   INSERT INTO public.product_nutrient_evidence(product_id,nutrient_code,value,unit,basis,qualifier,source_url,source_version,source_locator,captured_at)
   VALUES(p.id,CASE v->>'key' WHEN 'crude_protein' THEN 'protein' WHEN 'crude_fat' THEN 'fat' WHEN 'crude_ash' THEN 'ash' ELSE v->>'key' END,(v->>'value')::numeric,'g/100g','as_fed',v->>'qualifier',r->>'sourceUrl','official-completion-sha256:'||(r->>'documentSha256'),v->>'raw',(r->>'observedAt')::timestamptz) ON CONFLICT DO NOTHING;
  END LOOP;
 END IF;
 UPDATE public.products SET last_observed_at=(r->>'observedAt')::timestamptz,
  kcal_per_100g=COALESCE((r->>'kcalPer100g')::numeric,kcal_per_100g),
  catalog_source_note=COALESCE(catalog_source_note,'')||E'\n'||${q('2026-11-13 공식 근거 추가: '+note)},
  formulation=COALESCE(NULLIF(r->>'formulation',''),formulation),
  catalog_source_url=COALESCE(catalog_source_url,r->>'sourceUrl'),
  brand_name=COALESCE(NULLIF(r->>'brandName',''),brand_name),display_name=COALESCE(NULLIF(r->>'displayName',''),display_name)
 WHERE id=p.id;
 fields:=array_remove(ARRAY[CASE WHEN jsonb_array_length(r->'packs')>0 THEN 'barcode' END,CASE WHEN jsonb_array_length(r->'items')>0 THEN 'ingredients' END,CASE WHEN jsonb_array_length(r->'nutrients')>0 THEN 'nutrition' END],NULL);
 INSERT INTO public.product_data_sources(product_id,source_type,source_url,source_title,retrieved_at,fields_verified,confidence,raw_ingredient_text,notes)
 VALUES(p.id,'manufacturer',r->>'sourceUrl',r->>'title',(r->>'observedAt')::timestamptz,fields,'official',NULLIF(r->>'ingredientsText',''),${q(note)}||' SHA-256: '||(r->>'documentSha256'))
 ON CONFLICT(product_id,source_url) DO UPDATE SET source_title=EXCLUDED.source_title,retrieved_at=EXCLUDED.retrieved_at,fields_verified=EXCLUDED.fields_verified,confidence=EXCLUDED.confidence,raw_ingredient_text=EXCLUDED.raw_ingredient_text,notes=EXCLUDED.notes;
 PERFORM public.refresh_product_enrichment_queue(p.id);
 INSERT INTO private.catalog_completion_audit_20261113(product_id,before_product,after_product,manifest_sha256) SELECT p.id,to_jsonb(p),to_jsonb(after),${q(createHash('sha256').update(raw).digest('hex'))} FROM public.products after WHERE after.id=p.id;
 IF EXISTS(SELECT 1 FROM public.products after WHERE after.id=p.id AND (after.is_visible IS DISTINCT FROM p.is_visible OR after.verification_status IS DISTINCT FROM p.verification_status)) THEN RAISE EXCEPTION 'Unintended publication change'; END IF;
END LOOP;
END $apply$;
`;
sql+=`SELECT jsonb_build_object('applied_products',(SELECT count(*) FROM private.catalog_completion_audit_20261113),'barcode_rows',(SELECT count(*) FROM public.product_barcodes),'new_nutrient_values',(SELECT count(*) FROM public.product_nutrient_evidence WHERE source_version LIKE 'official-completion-sha256:%'),'quality_remaining',(SELECT count(*) FROM public.product_enrichment_queue WHERE cardinality(missing_fields)>0),'public_quality_remaining',(SELECT count(*) FROM public.product_enrichment_queue q JOIN public.products p ON p.id=q.product_id WHERE cardinality(q.missing_fields)>0 AND p.is_visible AND p.verification_status IN ('reviewed','verified')),'missing_fields',(SELECT jsonb_object_agg(field,n) FROM(SELECT unnest(missing_fields)field,count(*)n FROM public.product_enrichment_queue GROUP BY 1)s)) result;\n`;
await writeFile(args.out,sql+'COMMIT;\n');
await writeFile(args.rehearsal,sql+'ROLLBACK;\n');
console.log(JSON.stringify({products:rows.length,sqlBytes:Buffer.byteLength(sql),manifestSha256:createHash('sha256').update(raw).digest('hex')}));
