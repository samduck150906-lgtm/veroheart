import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const literal = value => "'" + String(value).replaceAll("'", "''") + "'";
export function buildReviewedCatalogSql(manifest) {
  if (!manifest.accepted.length) throw new Error('No reviewed source records');
  const urls = new Set();
  for (const p of manifest.accepted) {
    if (p.httpStatus !== 200 || !p.nameMatches || !/^[a-f0-9]{64}$/.test(p.htmlHash) || !p.checkedAt || urls.has(p.sourceUrl)) throw new Error('Unverified or duplicate source');
    urls.add(p.sourceUrl);
    for (const value of Object.values(p.nutrition)) if (!Number.isFinite(value) || value < 0 || value > 100) throw new Error('Invalid nutrient measurement');
    if (p.dryMatterText && Object.keys(p.nutrition).length) throw new Error('Dry matter cannot populate as-fed nutrients');
  }
  const rows = manifest.accepted.map(p => ({ ...p,
    requestId: (()=>{const hex=createHash('sha256').update((p.existingProductId||p.sourceUrl)+p.htmlHash).digest('hex'); return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20,32)}`;})(),
  }));
  return `BEGIN;
SET LOCAL statement_timeout = '120s';
SET LOCAL lock_timeout = '10s';
SET LOCAL request.jwt.claim.role = 'service_role';
DO $review$
DECLARE item JSONB; previous public.products%ROWTYPE; v_product_id UUID; nutrition_id UUID;
BEGIN
FOR item IN SELECT value FROM jsonb_array_elements(${literal(JSON.stringify(rows))}::JSONB) LOOP
  PERFORM pg_advisory_xact_lock(hashtextextended('manufacturer-url:' || (item->>'sourceUrl'),0));
  IF item->>'existingProductId' IS NOT NULL THEN
    SELECT * INTO previous FROM public.products WHERE id=(item->>'existingProductId')::UUID FOR UPDATE;
    IF NOT FOUND OR NOT (to_jsonb(previous) @> (item->'before')) THEN RAISE EXCEPTION 'catalog changed since review: %', item->>'sourceUrl'; END IF;
    v_product_id := previous.id;
  ELSE
    IF EXISTS (SELECT 1 FROM public.products WHERE catalog_source_url=item->>'sourceUrl') THEN RAISE EXCEPTION 'source added since review'; END IF;
    INSERT INTO public.products(name,display_name,brand_name,target_pet_type,product_type,main_category,is_visible,verification_status,catalog_source,analysis_status)
      VALUES(item->>'name',item->>'name',item->>'brand',item->>'species',item->>'productType',CASE WHEN item->>'productType'='food' THEN '사료' ELSE '간식' END,TRUE,'pending','external','unavailable') RETURNING id INTO v_product_id;
  END IF;
  UPDATE public.products SET display_name=item->>'name',
    catalog_source_url=item->>'sourceUrl',catalog_source_note=item->>'note',
    image_url=COALESCE(NULLIF(item->>'image',''),image_url),
    formulation=COALESCE(NULLIF(item->>'formulation',''),formulation),
    sub_category=CASE WHEN item->>'formulation' IN ('건식','건사료') THEN 'dry' WHEN item->>'formulation' IN ('습식','습식사료') THEN 'wet' ELSE sub_category END,
    requires_veterinary_guidance=COALESCE((item->>'veterinaryOnly')::BOOLEAN,FALSE),
    kcal_per_100g=COALESCE((item->>'kcalPer100g')::NUMERIC,kcal_per_100g),
    verification_status=CASE WHEN verification_status='pending' THEN 'reviewed' ELSE verification_status END,
    last_observed_at=(item->>'checkedAt')::TIMESTAMPTZ
  WHERE id=v_product_id;
  INSERT INTO public.product_observations(product_id,source_type,source_url,source_title,retrieved_at,raw_name,raw_brand,raw_label_text,extracted_data,is_current)
    VALUES(v_product_id,'manufacturer',item->>'sourceUrl',item->>'name',(item->>'checkedAt')::TIMESTAMPTZ,item->>'name',item->>'brand',item->>'ingredientsText',item,FALSE);
  IF jsonb_array_length(item->'items') > 0 THEN
    PERFORM public.ingest_product_ingredient_label((item->>'requestId')::UUID,v_product_id,'manufacturer',item->>'sourceUrl',item->>'ingredientsText','ko',item->'items');
  END IF;
  IF item->'nutrition' <> '{}'::JSONB THEN
    SELECT n.id INTO nutrition_id FROM public.nutritional_profiles n WHERE n.product_id=v_product_id LIMIT 1;
    IF nutrition_id IS NULL THEN INSERT INTO public.nutritional_profiles(product_id) VALUES(v_product_id) RETURNING id INTO nutrition_id; END IF;
    UPDATE public.nutritional_profiles SET
      crude_protein=(item->'nutrition'->>'crude_protein')::NUMERIC,
      crude_fat=(item->'nutrition'->>'crude_fat')::NUMERIC,
      crude_fiber=(item->'nutrition'->>'crude_fiber')::NUMERIC,
      crude_ash=(item->'nutrition'->>'crude_ash')::NUMERIC,
      moisture=(item->'nutrition'->>'moisture')::NUMERIC,
      calcium=(item->'nutrition'->>'calcium')::NUMERIC,
      phosphorus=(item->'nutrition'->>'phosphorus')::NUMERIC
    WHERE id=nutrition_id;
  ELSIF item->>'existingProductId' IS NOT NULL THEN
    -- Do not keep stale values whose basis was not confirmed by this review.
    UPDATE public.nutritional_profiles SET crude_protein=NULL,crude_fat=NULL,crude_fiber=NULL,crude_ash=NULL,moisture=NULL,calcium=NULL,phosphorus=NULL
      WHERE nutritional_profiles.product_id=v_product_id;
  END IF;
END LOOP;
END $review$;
COMMIT;\n`;
}
async function main(){const args=process.argv.slice(2), arg=f=>args[args.indexOf(f)+1];const raw=await readFile(arg('--manifest'),'utf8');const hash=createHash('sha256').update(raw).digest('hex');
 if(arg('--confirm')!==hash)throw new Error('Confirm the exact reviewed manifest SHA-256');
 const manifest=JSON.parse(raw);await writeFile(arg('--out'),buildReviewedCatalogSql(manifest));console.log(JSON.stringify({manifestHash:hash,records:manifest.accepted.length,created:manifest.created,updated:manifest.updated,sqlPrepared:true}));}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)await main();
