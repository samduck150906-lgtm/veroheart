import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

export function attachSupplementSnapshots(manifest, products) {
  const byId=new Map(products.map(p=>[p.id,p]));
  return {...manifest,accepted:manifest.accepted.map(row=>{
    const product=byId.get(row.productId);
    if(!product||product.catalog_archived_at)throw Error('Missing or archived snapshot: '+row.productId);
    const {nutrition,barcodes: _barcodes,current_labels,...before}=product;
    return {...row,before,previousNutrition:nutrition??[],previousLabels:(current_labels??[]).map(({items: _items,...label})=>label).sort((a,b)=>a.id.localeCompare(b.id))};
  })};
}

export function buildSupplementSql(manifest, manifestHash) {
  if (!/^[a-z0-9-]{10,90}$/.test(manifest.runId) || !/^[a-f0-9]{64}$/.test(manifestHash)) throw Error('Invalid run identity');
  const ids=new Set();
  for (const row of manifest.accepted) {
    if (ids.has(row.productId) || row.before?.id!==row.productId || row.before.catalog_archived_at) throw Error('Duplicate, mismatched or archived product');
    ids.add(row.productId);
    const url=new URL(row.sourceUrl);
    if(url.protocol!=='https:' || url.username || url.password || /token|secret|password|signature/i.test(url.search)) throw Error('Unsafe evidence URL');
    if(!/^[a-f0-9]{64}$/.test(row.documentSha256) || !Number.isFinite(Date.parse(row.observedAt)) || !row.referenceNote) throw Error('Missing source provenance');
    for(const m of row.measurements) {
      if(!Number.isFinite(m.value)||m.value<0||!['g/100g','g/100mL'].includes(m.unit)||!['as_fed','as_sold','dry_matter'].includes(m.basis)||!m.raw) throw Error('Invalid measurement');
      if((m.unit==='g/100g'&&m.value>100)||(m.unit==='g/100mL'&&m.value>1000)||(m.basis==='as_sold'&&m.unit!=='g/100g')) throw Error('Invalid measurement dimension');
      if(row.profileProjection && (m.unit!=='g/100g'||m.basis!=='as_fed')) throw Error('Volume/powder must not enter percentage profiles');
    }
  }
  const q=s=>"'"+String(s).replaceAll("'","''")+"'";
  return `BEGIN;
SET LOCAL statement_timeout='120s'; SET LOCAL lock_timeout='5s'; SET LOCAL request.jwt.claim.role='service_role';
CREATE TABLE IF NOT EXISTS private.catalog_evidence_supplement_audit(
 run_id text NOT NULL,product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
 before_product jsonb NOT NULL,after_product jsonb NOT NULL,before_nutrition jsonb NOT NULL,after_nutrition jsonb NOT NULL,
 before_labels jsonb NOT NULL,after_labels jsonb NOT NULL,before_queue jsonb,after_queue jsonb,
 manifest_sha256 text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(run_id,product_id));
REVOKE ALL ON private.catalog_evidence_supplement_audit FROM PUBLIC,anon,authenticated,service_role;
DO $apply$
DECLARE r jsonb; m jsonb; p public.products%ROWTYPE; n public.nutritional_profiles%ROWTYPE; actual jsonb; bq jsonb; bl jsonb; fields text[];
BEGIN
 FOR r IN SELECT value FROM jsonb_array_elements(${q(JSON.stringify(manifest.accepted))}::jsonb) LOOP
  SELECT * INTO p FROM public.products WHERE id=(r->>'productId')::uuid FOR UPDATE;
  IF NOT FOUND OR p.catalog_archived_at IS NOT NULL OR NOT(to_jsonb(p) @> (r->'before')) THEN RAISE EXCEPTION 'Stale product snapshot: %',r->>'productId'; END IF;
  IF EXISTS(SELECT 1 FROM private.catalog_evidence_supplement_audit WHERE run_id=${q(manifest.runId)} AND product_id=p.id) THEN RAISE EXCEPTION 'Supplement already applied: %',p.id; END IF;
  IF COALESCE((SELECT jsonb_agg(to_jsonb(np)ORDER BY np.id)FROM public.nutritional_profiles np WHERE product_id=p.id),'[]'::jsonb) IS DISTINCT FROM
   (SELECT COALESCE(jsonb_agg(x ORDER BY x->>'id'),'[]'::jsonb)FROM jsonb_array_elements(r->'previousNutrition')x) THEN RAISE EXCEPTION 'Stale nutrition snapshot: %',p.id; END IF;
  SELECT to_jsonb(q) INTO bq FROM public.product_enrichment_queue q WHERE product_id=p.id;
  SELECT COALESCE(jsonb_agg(to_jsonb(l) ORDER BY l.id),'[]'::jsonb) INTO bl FROM public.product_ingredient_label_sets l WHERE product_id=p.id AND is_current;
  INSERT INTO public.product_observations(id,product_id,source_type,source_url,source_title,retrieved_at,raw_name,raw_brand,raw_label_text,extracted_data,is_current)
   VALUES((r->>'observationId')::uuid,p.id,'manufacturer',r->>'sourceUrl',r->>'sourceTitle',(r->>'observedAt')::timestamptz,r->>'title',p.brand_name,NULLIF(r->>'ingredientsText',''),r-ARRAY['before','previousNutrition'],false);
  FOR m IN SELECT value FROM jsonb_array_elements(COALESCE(r->'packs','[]'::jsonb)) LOOP
   IF EXISTS(SELECT 1 FROM public.product_barcodes b WHERE barcode=m->>'barcode' AND product_id<>p.id) THEN RAISE EXCEPTION 'Package GTIN has another owner: %',m->>'barcode'; END IF;
   INSERT INTO public.product_barcodes(product_id,barcode,source_url,source_observation_id)VALUES(p.id,m->>'barcode',r->>'sourceUrl',(r->>'observationId')::uuid) ON CONFLICT DO NOTHING;
  END LOOP;
  IF COALESCE((r->>'labelChanged')::boolean,false) THEN
   IF bl IS DISTINCT FROM COALESCE(r->'previousLabels','[]'::jsonb) THEN RAISE EXCEPTION 'Stale current label: %',p.id; END IF;
   PERFORM public.ingest_product_ingredient_label((r->>'labelRequestId')::uuid,p.id,'manufacturer',r->>'sourceUrl',r->>'ingredientsText',r->>'language',r->'items');
   INSERT INTO public.ingredient_label_source_documents(source_url,document_sha256,observed_at,raw_label_text,ordered_items,evidence_note)
    VALUES(r->>'sourceUrl',r->>'documentSha256',(r->>'observedAt')::timestamptz,r->>'ingredientsText',(SELECT jsonb_agg(jsonb_build_object('order',x->'order','raw',x->>'rawText') ORDER BY(x->>'order')::int)FROM jsonb_array_elements(r->'items')x),r->>'referenceNote')ON CONFLICT DO NOTHING;
  END IF;
  IF COALESCE((r->>'profileProjection')::boolean,false) AND jsonb_array_length(r->'measurements')>0 THEN
   SELECT * INTO n FROM public.nutritional_profiles WHERE product_id=p.id ORDER BY id LIMIT 1 FOR UPDATE;
   IF NOT FOUND THEN INSERT INTO public.nutritional_profiles(product_id)VALUES(p.id)RETURNING * INTO n; END IF;
   SELECT jsonb_object_agg(x->>'nutrientCode',x->'value') INTO actual FROM jsonb_array_elements(r->'measurements')x;
   UPDATE public.nutritional_profiles SET crude_protein=COALESCE((actual->>'protein')::numeric,crude_protein),crude_fat=COALESCE((actual->>'fat')::numeric,crude_fat),crude_ash=COALESCE((actual->>'ash')::numeric,crude_ash),
    crude_fiber=COALESCE((actual->>'crude_fiber')::numeric,crude_fiber),moisture=COALESCE((actual->>'moisture')::numeric,moisture),calcium=COALESCE((actual->>'calcium')::numeric,calcium),phosphorus=COALESCE((actual->>'phosphorus')::numeric,phosphorus)WHERE id=n.id;
  END IF;
  FOR m IN SELECT value FROM jsonb_array_elements(r->'measurements') LOOP
   INSERT INTO public.product_nutrient_evidence(product_id,nutrient_code,value,unit,basis,qualifier,source_url,source_version,source_locator,captured_at)
    VALUES(p.id,m->>'nutrientCode',(m->>'value')::numeric,m->>'unit',m->>'basis',m->>'qualifier',r->>'sourceUrl','official-supplement-sha256:'||(r->>'documentSha256'),m->>'raw',(r->>'observedAt')::timestamptz);
  END LOOP;
  UPDATE public.products SET last_observed_at=GREATEST(last_observed_at,(r->>'observedAt')::timestamptz),catalog_source_url=COALESCE(catalog_source_url,r->>'koreaSourceUrl',r->>'sourceUrl'),
   catalog_source_note=concat_ws(E'\n',NULLIF(catalog_source_note,''),r->>'referenceNote')WHERE id=p.id;
  fields:=array_remove(ARRAY[CASE WHEN jsonb_array_length(r->'measurements')>0 THEN 'nutrition' END,CASE WHEN COALESCE((r->>'labelChanged')::boolean,false) THEN 'ingredients' END,CASE WHEN jsonb_array_length(COALESCE(r->'packs','[]'::jsonb))>0 THEN 'barcode' END],NULL);
  INSERT INTO public.product_data_sources(product_id,source_type,source_url,source_title,retrieved_at,fields_verified,confidence,raw_ingredient_text,notes)
   VALUES(p.id,'manufacturer',r->>'sourceUrl',r->>'sourceTitle',(r->>'observedAt')::timestamptz,fields,'official',NULLIF(r->>'ingredientsText',''),(r->>'referenceNote')||' SHA-256: '||(r->>'documentSha256'))
   ON CONFLICT(product_id,source_url)DO UPDATE SET retrieved_at=EXCLUDED.retrieved_at,
    fields_verified=ARRAY(SELECT DISTINCT unnest(public.product_data_sources.fields_verified||EXCLUDED.fields_verified)),
    raw_ingredient_text=COALESCE(EXCLUDED.raw_ingredient_text,public.product_data_sources.raw_ingredient_text),notes=EXCLUDED.notes;
  PERFORM public.refresh_product_enrichment_queue(p.id);
  INSERT INTO private.catalog_evidence_supplement_audit(run_id,product_id,before_product,after_product,before_nutrition,after_nutrition,before_labels,after_labels,before_queue,after_queue,manifest_sha256)
   SELECT ${q(manifest.runId)},p.id,to_jsonb(p),to_jsonb(a),COALESCE(r->'previousNutrition','[]'::jsonb),COALESCE((SELECT jsonb_agg(to_jsonb(np)ORDER BY np.id)FROM public.nutritional_profiles np WHERE product_id=p.id),'[]'::jsonb),bl,
    COALESCE((SELECT jsonb_agg(to_jsonb(l)ORDER BY l.id)FROM public.product_ingredient_label_sets l WHERE product_id=p.id AND is_current),'[]'::jsonb),bq,(SELECT to_jsonb(q)FROM public.product_enrichment_queue q WHERE product_id=p.id),${q(manifestHash)} FROM public.products a WHERE a.id=p.id;
  IF EXISTS(SELECT 1 FROM public.products a WHERE a.id=p.id AND(a.is_visible IS DISTINCT FROM p.is_visible OR a.verification_status IS DISTINCT FROM p.verification_status))THEN RAISE EXCEPTION 'Unintended publication change'; END IF;
 END LOOP;
END $apply$;
SELECT jsonb_build_object('run_id',${q(manifest.runId)},'applied_products',(SELECT count(*)FROM private.catalog_evidence_supplement_audit WHERE run_id=${q(manifest.runId)}),'active_remaining',(SELECT count(*)FROM public.product_enrichment_queue q JOIN public.products p ON p.id=q.product_id WHERE p.catalog_archived_at IS NULL AND cardinality(q.missing_fields)>0),'public_remaining',(SELECT count(*)FROM public.product_enrichment_queue q JOIN public.products p ON p.id=q.product_id WHERE p.catalog_archived_at IS NULL AND cardinality(q.missing_fields)>0 AND p.is_visible AND p.verification_status IN('reviewed','verified')))AS result;
`;
}

if (process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  const {values:a}=parseArgs({options:{manifest:{type:'string'},snapshot:{type:'string'},out:{type:'string'},rehearsal:{type:'string'}}});
  if(!a.manifest||!a.out||!a.rehearsal)throw Error('Required: --manifest --out --rehearsal');
  const raw=(await readFile(a.manifest,'utf8')).replace(/^\uFEFF/,'');let manifest=JSON.parse(raw);
  if(a.snapshot){const snapshot=JSON.parse((await readFile(a.snapshot,'utf8')).replace(/^\uFEFF/,''));manifest=attachSupplementSnapshots(manifest,snapshot.rows[0].inventory.products);}
  const sql=buildSupplementSql(manifest,createHash('sha256').update(raw).digest('hex'));
  await writeFile(a.out,sql+'COMMIT;\n');await writeFile(a.rehearsal,sql+'ROLLBACK;\n');
  console.log(JSON.stringify({products:JSON.parse(raw).accepted.length,sqlBytes:Buffer.byteLength(sql)}));
}
