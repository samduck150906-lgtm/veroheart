// Executes real PostgreSQL SQL/RLS against minimal Supabase-owned fixtures.
// This does not exercise the Supabase Auth/Storage HTTP services or Deno runtime.
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const db=new PGlite();
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
CREATE SCHEMA auth; CREATE FUNCTION auth.role() RETURNS TEXT LANGUAGE SQL AS $$ SELECT current_setting('request.jwt.claim.role',true) $$;
CREATE TABLE public.products(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),name TEXT NOT NULL,display_name TEXT,brand_name TEXT NOT NULL,product_type TEXT,main_category TEXT,target_pet_type TEXT,catalog_source TEXT,analysis_status TEXT,verification_status TEXT,is_visible BOOLEAN,canonical_product_key TEXT,slug TEXT);
CREATE TABLE public.product_observations(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),product_id UUID REFERENCES public.products,source_type TEXT,source_url TEXT,source_title TEXT,retrieved_at TIMESTAMPTZ,raw_name TEXT,raw_brand TEXT,raw_label_text TEXT,extracted_data JSONB,is_current BOOLEAN);
GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
SET request.jwt.claim.role='service_role';`);
await db.exec(await readFile(new URL('../supabase/migrations/20261026120000_official_catalog_import.sql',import.meta.url),'utf8'));
const hillsMigration = new URL('../supabase/migrations/20261026190000_hills_official_catalog_import.sql',import.meta.url);
await db.exec(await readFile(hillsMigration,'utf8'));
const source=[
 ...JSON.parse(await readFile(new URL('../data/catalog/royal-canin-kr-2026-10-26.json',import.meta.url),'utf8')).products,
 ...JSON.parse(await readFile(new URL('../data/catalog/hills-kr-2026-10-26.json',import.meta.url),'utf8')).products,
];
for(const candidate of source) await db.query('SELECT public.import_official_catalog_product($1)',[candidate]);
const unique=new Set(source.map(p=>`${p.brand}:${p.sourceProductId}:${p.species}`)).size;
assert.equal((await db.query('SELECT count(*)::INTEGER n FROM products')).rows[0].n,unique);
for(const candidate of source) await db.query('SELECT public.import_official_catalog_product($1)',[candidate]);
assert.equal((await db.query('SELECT count(*)::INTEGER n FROM products')).rows[0].n,unique);
assert.equal((await db.query("SELECT count(*)::INTEGER n FROM products WHERE verification_status='pending' AND analysis_status='unavailable' AND is_visible")).rows[0].n,unique);
assert.equal((await db.query('SELECT count(*)::INTEGER n FROM product_observations')).rows[0].n,source.length);
const hills = source.find(p => p.brand === '힐스');
const hidden = await db.query("UPDATE products SET is_visible=false, verification_status='verified' WHERE catalog_source_url=$1 RETURNING id",[hills.sourceUrl]);
await db.query('SELECT public.import_official_catalog_product($1)',[hills]);
assert.deepEqual((await db.query('SELECT is_visible,verification_status FROM products WHERE id=$1',[hidden.rows[0].id])).rows[0],{is_visible:false,verification_status:'verified'});
const freshHidden = { ...hills, name: '이미 숨긴 제품', sourceProductId: 'science-diet-hidden-existing-dry', sourceUrl: 'https://www.hillspet.co.kr/cat-food/science-diet-hidden-existing-dry', species:'cat' };
await db.query("INSERT INTO products(name,brand_name,target_pet_type,is_visible,verification_status) VALUES($1,'힐스','cat',false,'verified')",[freshHidden.name]);
const linked = (await db.query('SELECT public.import_official_catalog_product($1) AS result',[freshHidden])).rows[0].result;
assert.equal(linked.status,'linked');
assert.deepEqual((await db.query('SELECT is_visible,verification_status FROM products WHERE id=$1',[linked.productId])).rows[0],{is_visible:false,verification_status:'verified'});
assert.equal((await db.query("SELECT count(*)::INTEGER n FROM products WHERE catalog_source_url LIKE '%/prescription-diet-%' AND requires_veterinary_guidance=false")).rows[0].n,0);
for (const change of [{brand:'로얄캐닌'},{sourceProductId:'forged-id'},{sourceUrl:hills.sourceUrl+'?extra=1'},{species:'dog'}])
 await assert.rejects(db.query('SELECT public.import_official_catalog_product($1)',[{...hills,...change}]),/invalid_manufacturer_evidence/);
await assert.rejects(db.query('SELECT public.import_official_catalog_product($1)',[{...source[0],sourceUrl:'https://evil.example/'}]),/invalid_manufacturer_evidence/);
await db.exec('SET ROLE authenticated');
await assert.rejects(db.query('SELECT public.import_official_catalog_product($1)',[source[0]]),/permission denied/);
await db.exec('RESET ROLE');

// Existing identities live in manufacturer observations when first linked to a
// manually managed product. Renaming that product must never publish a duplicate.
await db.exec('BEGIN; DELETE FROM product_observations; DELETE FROM products;');
for (const candidate of [source.find(p => p.brand === '힐스' && p.sourceProductId === 'science-diet-kitten-original-dry'), source.find(p => p.brand === '로얄캐닌')]) {
 const original = (await db.query("INSERT INTO products(name,brand_name,target_pet_type,is_visible,verification_status,analysis_status) VALUES($1,$2,$3,false,'verified','ready') RETURNING id",[candidate.name,candidate.brand,candidate.species])).rows[0];
 const productCount = (await db.query('SELECT count(*)::INTEGER n FROM products')).rows[0].n;
 assert.deepEqual((await db.query('SELECT public.import_official_catalog_product($1) AS result',[candidate])).rows[0].result,{status:'linked',productId:original.id});
 await db.query('UPDATE products SET name=$1 WHERE id=$2',[`관리자가 변경한 ${candidate.brand} 제품명`,original.id]);
 const replay = (await db.query('SELECT public.import_official_catalog_product($1) AS result',[candidate])).rows[0].result;
 assert.deepEqual(replay,{status:'linked',productId:original.id},`${candidate.brand}: renamed linked identity must remain stable`);
 assert.equal((await db.query('SELECT count(*)::INTEGER n FROM products')).rows[0].n,productCount);
 assert.deepEqual((await db.query('SELECT name,is_visible,verification_status,analysis_status,canonical_product_key FROM products WHERE id=$1',[original.id])).rows[0],{
  name:`관리자가 변경한 ${candidate.brand} 제품명`,is_visible:false,verification_status:'verified',analysis_status:'ready',canonical_product_key:null,
 });
 if (candidate.brand === '로얄캐닌') {
  const revisedUrl = { ...candidate, sourceUrl: candidate.sourceUrl + '/v2' };
  assert.deepEqual((await db.query('SELECT public.import_official_catalog_product($1) AS result',[revisedUrl])).rows[0].result,{status:'linked',productId:original.id},'stable manufacturer ID survives a versioned source URL');
 }
 const conflict = (await db.query("INSERT INTO products(name,brand_name,target_pet_type,is_visible,verification_status) VALUES('충돌하는 별도 제품',$1,$2,false,'verified') RETURNING id",[candidate.brand,candidate.species])).rows[0];
 // A legacy observation with only the exact source URL must also participate in
 // identity resolution; two different targets require review even without names.
 await db.query("INSERT INTO product_observations(product_id,source_type,source_url,extracted_data) VALUES($1,'manufacturer',$2,'{}')",[conflict.id,candidate.sourceUrl]);
 const countsBefore = (await db.query('SELECT (SELECT count(*)::INTEGER FROM products) products,(SELECT count(*)::INTEGER FROM product_observations) observations')).rows[0];
 assert.deepEqual((await db.query('SELECT public.import_official_catalog_product($1) AS result',[candidate])).rows[0].result,{status:'needs_review',reason:'conflicting_source_identity'});
 assert.deepEqual((await db.query('SELECT (SELECT count(*)::INTEGER FROM products) products,(SELECT count(*)::INTEGER FROM product_observations) observations')).rows[0],countsBefore);
 // A canonical key pointing elsewhere cannot silently override an observation.
 await db.query('DELETE FROM product_observations WHERE product_id=$1',[conflict.id]);
 const namespace = candidate.brand === '힐스' ? 'hills-kr' : 'royalcanin-kr';
 await db.query('UPDATE products SET canonical_product_key=$1 WHERE id=$2',[`${namespace}:${candidate.sourceProductId}:${candidate.species}`,conflict.id]);
 assert.deepEqual((await db.query('SELECT public.import_official_catalog_product($1) AS result',[candidate])).rows[0].result,{status:'needs_review',reason:'conflicting_source_identity'});
 assert.equal((await db.query('SELECT count(*)::INTEGER n FROM products')).rows[0].n,productCount+1);
}
await db.exec('ROLLBACK;');
console.log(JSON.stringify({passed:true,sourcePages:source.length,uniqueProducts:unique,idempotentReplay:true,renamedHiddenIdentityPreserved:true,conflictingSourceIdentityNeedsReview:true,noInventedAnalysis:true,unauthorizedDenied:true}));
await db.close();
