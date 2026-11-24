import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { parseIngredientLabelItems } from '../src/analysis/labelIngredientParser.ts';
import { reviewManufacturerCandidate } from './review-manufacturer-candidate.mjs';
import { normalizeBarcode } from '../src/lib/productIdentity.ts';

const q = value => "'" + String(value).replaceAll("'", "''") + "'";
export function prepareBreadthManifest(capture) {
  const accepted = [], excluded = [];
  for (const source of capture.products) {
    const row = reviewManufacturerCandidate(source);
    if (!row) { excluded.push({ sourceUrl: source.sourceUrl, reason: 'Mixed offer, accessory or duplicate sales channel' }); continue; }
    const ingredientsText = row.labelFacts?.find(([key]) => /原材料Ingredients/.test(key))?.[1] ?? '';
    const nutritionText = row.labelFacts?.find(([key]) => /保証成分/.test(key))?.[1] ?? '';
    const jan = row.labelFacts?.find(([key]) => /JAN/.test(key))?.[1]?.trim();
    const measurements = [];
    for (const [nutrientCode, pattern] of [['protein', /たんぱく質\s*(\d+(?:\.\d+)?)\s*[%％]\s*(以上|以下)/], ['fat', /脂質\s*(\d+(?:\.\d+)?)\s*[%％]\s*(以上|以下)/], ['crude_fiber', /粗繊維\s*(\d+(?:\.\d+)?)\s*[%％]\s*(以上|以下)/], ['ash', /灰分\s*(\d+(?:\.\d+)?)\s*[%％]\s*(以上|以下)/], ['moisture', /水分\s*(\d+(?:\.\d+)?)\s*[%％]\s*(以上|以下)/]]) {
      const match = nutritionText.match(pattern);
      if (match) measurements.push({ nutrientCode, value: Number(match[1]), unit: 'g/100g', basis: 'as_fed', qualifier: match[2] === '以上' ? 'minimum' : 'maximum', raw: match[0] });
    }
    accepted.push({ ...row, sourceHash: row.documentSha256, ingredientsText, measurements,
      barcode: jan && /^\d{13}$/.test(jan) ? normalizeBarcode(jan) : null,
      items: ingredientsText ? parseIngredientLabelItems(ingredientsText).map(item => ({ ...item, normalizedText: item.baseText.normalize('NFKC').toLowerCase().replace(/\s+/g, ''), matchStatus: 'unreviewed' })) : [],
      language: row.market === 'JP' ? 'ja' : row.market === 'US' ? 'en' : 'ko',
      labelRequestId: (() => { const h=createHash('sha256').update(row.sourceUrl+row.documentSha256).digest('hex'); return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`; })(),
    });
  }
  return { reviewedAt: new Date().toISOString(), accepted, excluded };
}

export function buildBreadthSql(manifest, hash) {
  if (!/^[a-f0-9]{64}$/.test(hash) || !manifest.accepted.length) throw Error('Reviewed manifest SHA-256 required');
  for (const row of manifest.accepted) reviewManufacturerCandidate(row);
  return `BEGIN;
SET LOCAL statement_timeout='120s'; SET LOCAL lock_timeout='5s'; SET LOCAL request.jwt.claim.role='service_role';
CREATE TABLE IF NOT EXISTS private.manufacturer_breadth_review_audit(
 run_id text NOT NULL,product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
 before_product jsonb NOT NULL,after_product jsonb NOT NULL,manifest_sha256 text NOT NULL,
 source_document_sha256 text NOT NULL,review_scope text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(run_id,product_id));
REVOKE ALL ON private.manufacturer_breadth_review_audit FROM PUBLIC,anon,authenticated,service_role;
DO $batch$
DECLARE r jsonb; result jsonb; p public.products%ROWTYPE; before_row jsonb; observation_id uuid; m jsonb;
BEGIN
 FOR r IN SELECT value FROM jsonb_array_elements(${q(JSON.stringify(manifest.accepted))}::jsonb) LOOP
  -- A package already owned by a different record needs identity review first.
  IF NULLIF(r->>'barcode','') IS NOT NULL AND EXISTS(SELECT 1 FROM public.product_barcodes WHERE barcode=r->>'barcode') THEN CONTINUE; END IF;
  result:=public.import_official_catalog_product(r);
  IF result->>'status'<>'created' THEN CONTINUE; END IF;
  SELECT * INTO STRICT p FROM public.products WHERE id=(result->>'productId')::uuid FOR UPDATE;
  before_row:=to_jsonb(p);
  IF p.catalog_archived_at IS NOT NULL OR p.verification_status<>'pending' OR NOT p.is_visible THEN RAISE EXCEPTION 'Unexpected new product state'; END IF;
  -- Review confirms manufacturer identity/category, not nutrient completeness or
  -- suitability. Analysis stays unavailable unless label facts support it.
  UPDATE public.products SET verification_status='reviewed', image_url=NULLIF(r->>'image',''),
    sub_category=CASE r->>'subCategory' WHEN '음료' THEN '음료' WHEN '건식' THEN 'dry' WHEN '습식' THEN 'wet' ELSE NULL END,
    last_observed_at=(r->>'retrievedAt')::timestamptz
  WHERE id=p.id;
  SELECT id INTO observation_id FROM public.product_observations WHERE product_id=p.id AND source_url=r->>'sourceUrl' ORDER BY retrieved_at DESC LIMIT 1;
  IF NULLIF(r->>'barcode','') IS NOT NULL THEN
    INSERT INTO public.product_barcodes(product_id,barcode,source_url,source_observation_id)VALUES(p.id,r->>'barcode',r->>'sourceUrl',observation_id);
  END IF;
  IF jsonb_array_length(r->'items')>0 THEN
    PERFORM public.ingest_product_ingredient_label((r->>'labelRequestId')::uuid,p.id,'manufacturer',r->>'sourceUrl',r->>'ingredientsText',r->>'language',r->'items');
    INSERT INTO public.ingredient_label_source_documents(source_url,document_sha256,observed_at,raw_label_text,ordered_items,evidence_note)
      VALUES(r->>'sourceUrl',r->>'documentSha256',(r->>'retrievedAt')::timestamptz,r->>'ingredientsText',
      (SELECT jsonb_agg(jsonb_build_object('order',x->'order','raw',x->>'rawText') ORDER BY(x->>'order')::int) FROM jsonb_array_elements(r->'items')x),r->>'sourceCaveat')ON CONFLICT DO NOTHING;
  END IF;
  FOR m IN SELECT value FROM jsonb_array_elements(r->'measurements') LOOP
    INSERT INTO public.product_nutrient_evidence(product_id,nutrient_code,value,unit,basis,qualifier,source_url,source_version,source_locator,captured_at)
      VALUES(p.id,m->>'nutrientCode',(m->>'value')::numeric,m->>'unit',m->>'basis',m->>'qualifier',r->>'sourceUrl','manufacturer-breadth-sha256:'||(r->>'documentSha256'),m->>'raw',(r->>'retrievedAt')::timestamptz);
  END LOOP;
  INSERT INTO public.product_data_sources(product_id,source_type,source_url,source_title,retrieved_at,fields_verified,confidence,raw_ingredient_text,notes)
    VALUES(p.id,'manufacturer',r->>'sourceUrl',COALESCE(r->>'sourceTitle',r->>'name'),(r->>'retrievedAt')::timestamptz,
    ARRAY['name','brand','species','product_type','image'],'official',NULLIF(r->>'ingredientsText',''),r->>'sourceCaveat')ON CONFLICT DO NOTHING;
  INSERT INTO private.manufacturer_breadth_review_audit(run_id,product_id,before_product,after_product,manifest_sha256,source_document_sha256,review_scope)
    SELECT 'manufacturer-breadth-20261117',p.id,before_row,to_jsonb(after_row),${q(hash)},r->>'documentSha256','manufacturer identity and classification; label facts separately attributed' FROM public.products after_row WHERE id=p.id;
 END LOOP;
END $batch$;
COMMIT;
SELECT brand_name,count(*) AS products FROM public.products WHERE id IN(SELECT product_id FROM private.manufacturer_breadth_review_audit WHERE run_id='manufacturer-breadth-20261117')GROUP BY brand_name ORDER BY brand_name;
`;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const manifest=prepareBreadthManifest(JSON.parse(await readFile(process.argv[2],'utf8')));
  const raw=JSON.stringify(manifest,null,2), hash=createHash('sha256').update(raw).digest('hex');
  await writeFile(process.argv[3],raw); await writeFile(process.argv[4],buildBreadthSql(manifest,hash));
  console.log(JSON.stringify({accepted:manifest.accepted.length,excluded:manifest.excluded.length,manifestHash:hash}));
}
