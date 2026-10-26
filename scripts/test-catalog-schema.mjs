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
const source=JSON.parse(await readFile(new URL('../data/catalog/royal-canin-kr-2026-10-26.json',import.meta.url),'utf8')).products;
for(const candidate of source) await db.query('SELECT public.import_official_catalog_product($1)',[candidate]);
const unique=new Set(source.map(p=>`${p.sourceProductId}:${p.species}`)).size;
assert.equal((await db.query('SELECT count(*)::INTEGER n FROM products')).rows[0].n,unique);
for(const candidate of source) await db.query('SELECT public.import_official_catalog_product($1)',[candidate]);
assert.equal((await db.query('SELECT count(*)::INTEGER n FROM products')).rows[0].n,unique);
assert.equal((await db.query("SELECT count(*)::INTEGER n FROM products WHERE verification_status='pending' AND analysis_status='unavailable' AND is_visible")).rows[0].n,unique);
assert.equal((await db.query('SELECT count(*)::INTEGER n FROM product_observations')).rows[0].n,source.length);
await assert.rejects(db.query('SELECT public.import_official_catalog_product($1)',[{...source[0],sourceUrl:'https://evil.example/'}]),/invalid_manufacturer_evidence/);
await db.exec('SET ROLE authenticated');
await assert.rejects(db.query('SELECT public.import_official_catalog_product($1)',[source[0]]),/permission denied/);
await db.exec('RESET ROLE');
console.log(JSON.stringify({passed:true,sourcePages:source.length,uniqueProducts:unique,idempotentReplay:true,noInventedAnalysis:true,unauthorizedDenied:true}));
await db.close();
