import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp';
import { LEGACY_LABEL_MIGRATION, prepareLocalSupabase } from './prepare-local-supabase.mjs';
import { assertProductPublication, assertPublicationMigrationPreservesIntent, PRODUCT_PUBLICATION_MIGRATION } from './test-product-publication.mjs';

const repository = fileURLToPath(new URL('../', import.meta.url));
const db = new PGlite({ extensions: { pgcrypto, pg_trgm, uuid_ossp } });
// PGlite executes the actual PostgreSQL SQL/constraints/RLS. These are minimal
// Supabase-owned fixtures, not a replacement for Auth/Storage/CLI integration.
await db.exec(`
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
CREATE ROLE supabase_auth_admin;
CREATE SCHEMA auth; CREATE SCHEMA storage; CREATE SCHEMA extensions;
CREATE TABLE auth.users(id UUID PRIMARY KEY, email TEXT, raw_user_meta_data JSONB DEFAULT '{}', raw_app_meta_data JSONB DEFAULT '{}', created_at TIMESTAMPTZ DEFAULT now(), is_anonymous BOOLEAN DEFAULT false);
CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE SQL AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID $$;
CREATE FUNCTION auth.role() RETURNS TEXT LANGUAGE SQL AS $$ SELECT NULLIF(current_setting('request.jwt.claim.role', true), '')::TEXT $$;
CREATE TABLE storage.buckets(id TEXT PRIMARY KEY, name TEXT, public BOOLEAN, file_size_limit BIGINT, allowed_mime_types TEXT[]);
CREATE TABLE storage.objects(id UUID PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id TEXT, name TEXT, metadata JSONB, owner UUID, owner_id TEXT, UNIQUE(bucket_id,name));
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION storage.foldername(name TEXT) RETURNS TEXT[] LANGUAGE SQL IMMUTABLE AS $$ SELECT (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1)-1] $$;
GRANT USAGE ON SCHEMA public, auth, storage TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public, auth, storage TO service_role;
`);

await mkdir(path.join(repository, '.artifacts'), { recursive: true });
const temporary = await mkdtemp(path.join(repository, '.artifacts/bootstrap-test-'));
const prepared = await prepareLocalSupabase(path.join(temporary, 'project'));
await assert.rejects(prepareLocalSupabase(prepared.directory), /EEXIST/);
const directory = path.join(prepared.directory, 'supabase/migrations');
const files = (await readdir(directory)).filter((name) => name.endsWith('.sql')).sort();
let orphanCount = 0;
try {
  for (const file of files) {
    const sql = await readFile(path.join(directory, file), 'utf8');
    if (!file.includes('_local_missing_product_guard')) {
      assert.equal(sql, await readFile(path.join(repository, 'supabase/migrations', file), 'utf8'), `${file}: historical bytes changed`);
    }
    try {
      if (file === PRODUCT_PUBLICATION_MIGRATION) await assertPublicationMigrationPreservesIntent(db, () => db.exec(sql));
      else await db.exec(sql);
    }
    catch (error) { throw new Error(`${file}: ${error.message}`, { cause: error }); }
    if (file === '20260611151004_local_missing_product_guard.sql') {
      await assert.rejects(db.exec("INSERT INTO public.nutritional_profiles(product_id) VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')"), /Unexpected missing product/);
    }
    if (file === LEGACY_LABEL_MIGRATION) {
      const result = await db.query('SELECT count(*)::integer AS n FROM local_bootstrap.skipped_rows');
      orphanCount = result.rows[0].n;
      assert.equal(orphanCount, 47); // 44 joined ingredients + 3 nutrition rows in the historical seed.
    }
    console.log('Applied', file);
  }
  assert.equal((await db.query('SELECT count(*)::integer AS n FROM public.products')).rows[0].n, 0);
  assert.equal((await db.query("SELECT count(*)::integer AS n FROM pg_namespace WHERE nspname='local_bootstrap'")).rows[0].n, 0);
  assert.equal((await db.query("SELECT public FROM storage.buckets WHERE id='feeding-log-photos'")).rows[0].public, false);
  assert.equal((await db.query("SELECT has_table_privilege('authenticated', 'public.product_scan_submissions', 'UPDATE') AS allowed")).rows[0].allowed, false);
  assert.equal((await db.query("SELECT has_table_privilege('authenticated', 'public.product_scan_submissions', 'INSERT') AS allowed")).rows[0].allowed, false);
  await db.exec('SET ROLE anon');
  assert.equal((await db.query('SELECT count(*)::integer AS n FROM public.products')).rows[0].n, 0);
  await db.exec('RESET ROLE');
  await assert.rejects(db.exec("INSERT INTO public.product_ingredients(product_id,ingredient_id,sort_order) SELECT 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', id, 1 FROM public.ingredients LIMIT 1"), /foreign key/);
  await db.exec(`
    INSERT INTO public.products(id,name,brand_name,product_type,main_category,target_pet_type,is_visible,verification_status) VALUES
      ('10000000-0000-4000-8000-000000000001','Fixture alpha','Search fixture','food','사료','dog',true,'verified'),
      ('10000000-0000-4000-8000-000000000002','Fixture beta','Search fixture','food','사료','dog',true,'verified'),
      ('10000000-0000-4000-8000-000000000003','Fixture gamma','Search fixture','food','사료','dog',true,'verified'),
      ('10000000-0000-4000-8000-000000000004','Fixture delta','Search fixture','food','사료','dog',true,'verified');
    INSERT INTO public.ingredients(id,name_ko,name_en,risk_level) VALUES
      ('20000000-0000-4000-8000-000000000001','검색검증용 닭고기','GallusDomesticus','safe'),
      ('20000000-0000-4000-8000-000000000002','검색검증용 쌀','OryzaSativa','safe');
    INSERT INTO public.canonical_ingredients(id,canonical_name_ko,canonical_name_en,normalized_key,status,legacy_ingredient_id)
      VALUES ('30000000-0000-4000-8000-000000000001','닭고기','GallusDomesticus','search-chicken-witness','active','20000000-0000-4000-8000-000000000001');
    INSERT INTO public.product_ingredients(product_id,ingredient_id,sort_order)
      SELECT id,'20000000-0000-4000-8000-000000000002',1 FROM public.products WHERE brand_name='Search fixture';
    INSERT INTO public.product_ingredient_label_sets(id,product_id,raw_label_text,is_current) VALUES
      ('40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','신선한 닭고기',true),
      ('40000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000003','빈 현재 라벨',true),
      ('40000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000004','칠면조 생육 30%',true);
    INSERT INTO public.product_ingredient_label_items(label_set_id,display_order,raw_ingredient_text,canonical_ingredient_id,match_status) VALUES
      ('40000000-0000-4000-8000-000000000001',0,'신선한 닭고기','30000000-0000-4000-8000-000000000001','matched'),
      ('40000000-0000-4000-8000-000000000004',0,'칠면조 생육 30%',null,'unmatched');
  `);
  const searchIds = async (term) => (await db.query('SELECT product_id FROM public.search_catalog_products($1)', [term])).rows.map((row) => row.product_id);
  assert.deepEqual(await searchIds('GallusDomesticus'), ['10000000-0000-4000-8000-000000000001']);
  assert.deepEqual(await searchIds('닭고기'), ['10000000-0000-4000-8000-000000000001']);
  assert.deepEqual(await searchIds('칠면조'), ['10000000-0000-4000-8000-000000000004']);
  assert.deepEqual(await searchIds('OryzaSativa'), ['10000000-0000-4000-8000-000000000002']);
  await db.exec('SET ROLE anon');
  assert.deepEqual(await searchIds('GallusDomesticus'), ['10000000-0000-4000-8000-000000000001']);
  await db.exec('RESET ROLE');
  console.log('PASS: current canonical/raw ingredient search; stale legacy excluded, empty current labels respected, anon RLS works');
  await assertProductPublication(db);
  await db.exec("INSERT INTO public.products(name,brand_name,is_visible) VALUES ('local guard test fixture','local test',false)");
  await assert.rejects(db.exec(await readFile(path.join(repository, 'supabase/local-bootstrap/before-legacy-labels.sql'), 'utf8')), /empty products table/);
  console.log(JSON.stringify({ passed: true, historicalMigrations: prepared.historicalMigrations, localMigrations: files.length, skippedKnownOrphanRows: orphanCount, fabricatedCatalogRows: 0, historicalFilesUnchanged: true, foreignKeysEnforced: true, storagePrivate: true }, null, 2));
} finally { await db.close(); }
