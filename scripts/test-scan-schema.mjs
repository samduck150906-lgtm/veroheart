// Executes real PostgreSQL SQL/RLS against minimal Supabase-owned fixtures.
// This does not exercise the Supabase Auth/Storage HTTP services or Deno runtime.
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const db = new PGlite();
await db.exec(`
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
CREATE SCHEMA auth; CREATE SCHEMA storage;
CREATE TABLE auth.users(id UUID PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE SQL AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID $$;
CREATE TABLE public.products(id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT, display_name TEXT, normalized_name TEXT, brand_name TEXT, normalized_brand_name TEXT, manufacturer_name TEXT, product_type TEXT, target_pet_type TEXT, barcode TEXT, canonical_product_key TEXT, slug TEXT, catalog_source TEXT, verification_status TEXT, is_visible BOOLEAN, analysis_status TEXT, kcal_per_100g NUMERIC, last_observed_at TIMESTAMPTZ);
CREATE TABLE public.nutritional_profiles(product_id UUID PRIMARY KEY REFERENCES public.products, crude_protein NUMERIC, crude_fat NUMERIC, crude_fiber NUMERIC, crude_ash NUMERIC, moisture NUMERIC, calcium NUMERIC, phosphorus NUMERIC);
CREATE TABLE public.product_ingredient_label_sets(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),product_id UUID,is_current BOOLEAN,ingestion_request_id UUID);
CREATE FUNCTION public.ingest_product_ingredient_label(UUID,UUID,TEXT,TEXT,TEXT,TEXT,JSONB) RETURNS UUID LANGUAGE SQL AS $$ SELECT gen_random_uuid() $$;
CREATE TABLE public.ingredients(id UUID PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE public.product_observations(id UUID PRIMARY KEY DEFAULT gen_random_uuid(), product_id UUID REFERENCES public.products, source_type TEXT NOT NULL, source_url TEXT, raw_name TEXT, raw_brand TEXT, raw_barcode TEXT, raw_label_text TEXT, extracted_data JSONB, field_confidence JSONB, package_version TEXT);
CREATE TABLE public.product_aliases(product_id UUID, alias_text TEXT, normalized_alias TEXT, alias_type TEXT, is_searchable BOOLEAN, language_code TEXT NOT NULL DEFAULT 'ko', UNIQUE(product_id, normalized_alias, language_code));
CREATE TABLE storage.buckets(id TEXT PRIMARY KEY, name TEXT, public BOOLEAN, file_size_limit BIGINT, allowed_mime_types TEXT[]);
CREATE TABLE storage.objects(bucket_id TEXT, name TEXT, metadata JSONB, PRIMARY KEY(bucket_id,name));
GRANT USAGE ON SCHEMA public, auth, storage TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public, auth, storage TO service_role;
`);
for (const file of ['20260925130000_community_scan_submissions.sql', '20260925150000_scan_processing_rpc.sql', '20260925160000_publish_community_scan.sql', '20260925170000_scan_evidence_retention.sql', '20261026090100_scan_release_hardening.sql']) {
  await db.exec(await readFile(new URL('../supabase/migrations/' + file, import.meta.url), 'utf8'));
  console.log('Applied', file);
}
const user = '11111111-1111-4111-8111-111111111111';
const scan = '22222222-2222-4222-8222-222222222222';
const scan2 = '44444444-4444-4444-8444-444444444444';
const image = '33333333-3333-4333-8333-333333333333';
const label = { name:'Audit food', brand:'Audit', manufacturer:null, species:'dog', productType:'food', ingredients:['연어'], guaranteedComponents:[], registeredComponents:[] };
const extraction = { identity:{name:'Audit food',brand:'Audit'}, labelPanels:{ingredientText:'연어'}, ingredients:[{position:1,name:'연어'}],fieldConfidence:{identity:0.9},printedBarcode:null };
const paths = (id) => ['front','ingredient','nutrition'].map((category) => [`${user}/${id}/${category}/${image}.${category==='front'?'jpg':category==='nutrition'?'png':'webp'}`]);
await db.query('INSERT INTO auth.users VALUES ($1)', [user]);
await db.query('INSERT INTO public.product_scan_submissions(id,user_id) VALUES ($1,$2)', [scan,user]);
await db.exec('SET ROLE authenticated');
await assert.rejects(db.query("UPDATE public.product_scan_submissions SET status='submitted', confirmed_data=$1 WHERE id=$2", [label,scan]), /permission denied/);
await assert.rejects(db.query("INSERT INTO public.product_scan_submissions(user_id,status,confirmed_data) VALUES ($1,'draft',$2)", [user,label]), /permission denied/);
await assert.rejects(db.query('SELECT public.claim_scan_processing($1,$2,$3,$4,$5,$6)', [scan,user,...paths(scan),'v1:fake']), /permission denied/);
await db.exec('RESET ROLE');
console.log('PASS: authenticated direct INSERT, UPDATE, and privileged RPC denied');
await db.exec('SET ROLE service_role');
await assert.rejects(db.query('SELECT public.claim_scan_processing($1,$2,$3,$4,$5,$6)', [scan,user,...paths(scan),'v1:attempt']), /scan evidence missing/);
assert.equal((await db.query('SELECT public.scan_has_trusted_evidence($1) AS trusted',[scan])).rows[0].trusted,false);
console.log('PASS: invented UUID-shaped storage paths and missing provenance rejected');

async function prepare(id, version) {
  for (const [i,arr] of paths(id).entries()) {
    assert.equal((await db.query('SELECT public.register_scan_evidence_upload($1,$2,$3,$4) AS ok',[id,user,['front','ingredient','nutrition'][i],arr[0]])).rows[0].ok,true);
    await db.query("INSERT INTO storage.objects(bucket_id,name,metadata) VALUES ('product-scan-evidence',$1,$2)",[arr[0],{mimetype:i===0?'image/jpeg':i===2?'image/png':'image/webp',size:1000}]);
  }
  const claim=(await db.query('SELECT public.claim_scan_processing($1,$2,$3,$4,$5,$6) AS result',[id,user,...paths(id),version])).rows[0].result;
  assert.equal(claim.kind,'claimed');
  assert.equal(claim.submission.extractionVersion,version);
  assert.equal((await db.query('SELECT public.complete_scan_extraction($1,$2,$3,$4,$5) AS ok',[id,version,extraction,{found:false},null])).rows[0].ok,true);
  assert.equal((await db.query('SELECT public.scan_has_trusted_evidence($1) AS trusted',[id])).rows[0].trusted,true);
  assert.equal((await db.query('SELECT public.confirm_scan_submission($1,$2,$3,$4) AS ok',[id,user,label,'0036000291452'])).rows[0].ok,true);
}
const product = { rawName:label.name,displayName:label.name,brandName:label.brand,manufacturerName:null,productType:'food',targetPetType:'dog',barcode:'0036000291452',canonicalProductKey:'audit-food-dog',slug:'audit-food',catalogSource:'community_scan',verificationStatus:'pending',isVisible:true,label,nutrition:{profile:{crude_protein:30,crude_fat:0},kcalPer100g:380,source:'confirmed_package_label'} };
await prepare(scan,'v1:first');
let result=(await db.query('SELECT public.publish_community_scan($1,$2,$3,$4,$5) AS result',[scan,user,'create',null,product])).rows[0].result;
assert.equal(result.status,'published');
const productId=result.productId;
assert.deepEqual((await db.query('SELECT crude_protein,crude_fat,moisture FROM public.nutritional_profiles WHERE product_id=$1',[productId])).rows[0], {crude_protein:'30',crude_fat:'0',moisture:null});
assert.equal((await db.query('SELECT kcal_per_100g FROM public.products WHERE id=$1',[productId])).rows[0].kcal_per_100g,'380');
assert.equal((await db.query('SELECT published_new_product FROM public.product_scan_submissions WHERE id=$1',[scan])).rows[0].published_new_product,true);
await db.query('INSERT INTO public.product_scan_submissions(id,user_id) VALUES ($1,$2)',[scan2,user]);
await prepare(scan2,'v1:second');
product.nutrition = {profile:{crude_protein:99},kcalPer100g:999,source:'confirmed_package_label'};
result=(await db.query('SELECT public.publish_community_scan($1,$2,$3,$4,$5) AS result',[scan2,user,'create',null,product])).rows[0].result;
assert.equal(result.status,'needs_review');
assert.equal((await db.query('SELECT crude_protein FROM public.nutritional_profiles WHERE product_id=$1',[productId])).rows[0].crude_protein,'30');
assert.equal((await db.query('SELECT kcal_per_100g FROM public.products WHERE id=$1',[productId])).rows[0].kcal_per_100g,'380');
const sets=(await db.query('SELECT request_id,is_current FROM public.product_label_sets WHERE product_id=$1 ORDER BY request_id',[productId])).rows;
assert.deepEqual(sets,[{request_id:scan,is_current:true},{request_id:scan2,is_current:false}]);
assert.equal((await db.query('SELECT COUNT(*)::INTEGER AS count FROM public.products')).rows[0].count,1);
console.log('PASS: trusted lifecycle publishes; duplicate race stores non-current evidence, keeps current label and product unchanged');
assert.ok((await db.query('SELECT public.ingest_community_scan_ingredient_label($1,$2,$3) AS id',[scan,productId,[]])).rows[0].id);
await db.query('INSERT INTO public.product_ingredient_label_sets(product_id,is_current,ingestion_request_id) VALUES ($1,TRUE,gen_random_uuid())',[productId]);
assert.equal((await db.query('SELECT public.ingest_community_scan_ingredient_label($1,$2,$3) AS id',[scan,productId,[]])).rows[0].id,null);
console.log('PASS: delayed original scan ingestion cannot replace a newer current canonical label');

// A stale worker may not complete a later attempt.
const stale = '55555555-5555-4555-8555-555555555555';
await db.query('INSERT INTO public.product_scan_submissions(id,user_id,status,extraction_version) VALUES ($1,$2,$3,$4)',[stale,user,'processing','v1:new']);
assert.equal((await db.query('SELECT public.complete_scan_extraction($1,$2,$3,$4,$5) AS ok',[stale,'v1:old',extraction,{found:false},null])).rows[0].ok,false);
console.log('PASS: stale extraction attempt cannot complete a newer job');

// 201 empty abandoned rows must drain beyond the first page.
await db.exec("INSERT INTO public.product_scan_submissions(user_id,status) SELECT '"+user+"','draft' FROM generate_series(1,201)");
await db.exec("UPDATE public.product_scan_submissions SET evidence_retention_at='2026-01-01' WHERE status='draft'");
const first=(await db.query("SELECT id FROM public.product_scan_submissions WHERE evidence_purged_at IS NULL AND evidence_retention_at<'2026-09-26' ORDER BY evidence_purge_attempted_at NULLS FIRST,evidence_retention_at,id LIMIT 200")).rows;
assert.equal(first.length,200);
for(const row of first){
  assert.equal((await db.query('SELECT public.claim_expired_scan_evidence($1,$2) AS claimed',[row.id,'2026-09-26'])).rows[0].claimed,true);
  await db.query('UPDATE public.product_scan_submissions SET evidence_purged_at=NOW() WHERE id=$1',[row.id]);
}
const second=(await db.query("SELECT id,status FROM public.product_scan_submissions WHERE evidence_purged_at IS NULL AND evidence_retention_at<'2026-09-26' ORDER BY evidence_purge_attempted_at NULLS FIRST,evidence_retention_at,id LIMIT 200")).rows;
assert.equal(second.length,1);
assert.equal(second[0].status,'draft');
console.log('PASS: 200 drained abandoned scans do not starve row 201');
await db.close();
