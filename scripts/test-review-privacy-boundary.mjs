import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { draftUrl } from './review-privacy-contract.mjs';
const ids={a:'11111111-1111-4111-8111-111111111111',b:'22222222-2222-4222-8222-222222222222',visible:'33333333-3333-4333-8333-333333333333',hidden:'44444444-4444-4444-8444-444444444444',ra:'55555555-5555-4555-8555-555555555555',rb:'66666666-6666-4666-8666-666666666666',rh:'77777777-7777-4777-8777-777777777777'};
const draft=await readFile(draftUrl,'utf8');
async function fixture(legacy=true){
 const db=new PGlite();
 await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
 CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
 CREATE SCHEMA private; CREATE FUNCTION private.hide_unverified_products_enabled() RETURNS boolean LANGUAGE sql AS $$SELECT coalesce(nullif(current_setting('test.verified_only',true),'')::boolean,false)$$;
 CREATE TABLE products(id uuid PRIMARY KEY,review_count int DEFAULT 0,avg_rating numeric DEFAULT 0,is_visible boolean DEFAULT true,verification_status text DEFAULT 'verified');
 CREATE TABLE pets(id uuid PRIMARY KEY,user_id uuid,name text,pet_type text,age_group text,breed text,weight numeric,allergies text[],conditions text[]);
 CREATE TABLE pet_feeding_logs(id uuid PRIMARY KEY,user_id uuid,pet_id uuid,product_id uuid,feeding_date date,feeding_time time,meal_period text,amount numeric,unit text,preference_level smallint,memo text,reaction_note text,updated_at timestamptz);
 CREATE TABLE reviews(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,product_id uuid REFERENCES products,rating int CHECK(rating BETWEEN 1 AND 5),content text NOT NULL DEFAULT '',created_at timestamptz DEFAULT now());
 ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
 CREATE POLICY initial_read ON reviews FOR SELECT TO ${legacy?'anon,authenticated USING(true)':'authenticated USING(auth.uid()=user_id)'};
 CREATE POLICY "Users delete own reviews" ON reviews FOR DELETE TO authenticated USING(auth.uid()=user_id);
 GRANT SELECT,INSERT,UPDATE,DELETE ON reviews TO anon,authenticated,service_role;
 GRANT SELECT,UPDATE ON products TO service_role;
 CREATE VIEW product_ratings WITH(security_barrier=true) AS SELECT id,product_id,rating,created_at,(user_id=auth.uid()) is_mine FROM reviews;
 GRANT SELECT ON product_ratings TO anon,authenticated,service_role;
 CREATE TABLE admin_audit_log(id uuid DEFAULT gen_random_uuid(),actor text,action text,target_table text,target_id text,detail jsonb,created_at timestamptz DEFAULT now());
 GRANT SELECT ON admin_audit_log TO service_role;
 CREATE SCHEMA supabase_migrations; CREATE TABLE supabase_migrations.schema_migrations(version text,name text);
 INSERT INTO products(id,is_visible,verification_status) VALUES('${ids.visible}',true,'pending'),('${ids.hidden}',false,'verified');
 INSERT INTO reviews(id,user_id,product_id,rating,content) VALUES('${ids.ra}','${ids.a}','${ids.visible}',5,'synthetic private A'),('${ids.rb}','${ids.b}','${ids.visible}',3,'synthetic private B'),('${ids.rh}','${ids.a}','${ids.hidden}',1,'synthetic hidden product');`);
 for(const f of ['20260914144655_sync_product_review_aggregates.sql','20261104110000_admin_support_management.sql'])await db.exec(await readFile(new URL('../supabase/migrations/'+f,import.meta.url),'utf8'));
 return db;
}
async function as(db,role,uid,run){
 await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[uid||'']);await db.exec('SET ROLE '+role);
 try{return await run();}finally{await db.exec('RESET ROLE');}
}
const rows=async(db,sql,args=[]) => (await db.query(sql,args)).rows;
const apply=async db=>{try{await db.exec('BEGIN;'+draft+'COMMIT;');}catch(e){await db.exec('ROLLBACK');throw e;}};
const snapshot=async db=>(await rows(db,`SELECT
 (SELECT jsonb_agg(to_jsonb(r) ORDER BY id) FROM reviews r) AS reviews,
 (SELECT jsonb_agg(to_jsonb(p) ORDER BY id) FROM products p) AS products,
 (SELECT jsonb_agg(to_jsonb(a)) FROM admin_audit_log a) AS audit,
 (SELECT relacl::text FROM pg_class WHERE oid='reviews'::regclass) AS acl,
 md5(pg_get_viewdef('product_ratings'::regclass,true)) AS view_hash`))[0];
for(const legacy of [true,false])test(`real PostgreSQL read boundary with ${legacy?'legacy permissive':'existing owner'} policy`,async t=>{
 const db=await fixture(legacy);try{
 await t.test('reproduces legacy risk conditionally without live data',async()=>{
  const n=await as(db,'anon',null,()=>rows(db,'SELECT id FROM reviews'));
  assert.equal(n.length,legacy?3:0);
 });
 const before=await snapshot(db);await apply(db);assert.deepEqual(await snapshot(db),before);
 await t.test('anon gets public stars only, no raw rows/identity/free text or hidden product reviews',async()=>{
  await as(db,'anon',null,async()=>{assert.deepEqual(await rows(db,'SELECT * FROM reviews'),[]);const v=await rows(db,'SELECT * FROM product_ratings ORDER BY id');assert.equal(v.length,2);assert.deepEqual(Object.keys(v[0]).sort(),['id','product_id','rating','created_at','is_mine'].sort());assert.ok(v.every(r=>r.product_id===ids.visible));await assert.rejects(db.query("INSERT INTO reviews(user_id,product_id,rating) VALUES($1,$2,4)",[ids.a,ids.visible]),/row-level security/);assert.deepEqual(await rows(db,'DELETE FROM reviews WHERE id=$1 RETURNING id',[ids.ra]),[]);});
 });
 await t.test('A/B see only their own raw rows, including own moderated/hidden-product legacy text',async()=>{
  for(const [user,expected]of [[ids.a,2],[ids.b,1]])await as(db,'authenticated',user,async()=>{const r=await rows(db,'SELECT * FROM reviews');assert.equal(r.length,expected);assert.ok(r.every(x=>x.user_id===user));const pub=await rows(db,'SELECT * FROM product_ratings');assert.equal(pub.length,2);assert.equal(pub.filter(x=>x.is_mine).length,1);});
 });
 await t.test('additional permissive SELECT and ALL policies cannot reopen raw rows',async()=>{
  await db.exec('CREATE POLICY broad_read ON reviews FOR SELECT TO anon,authenticated USING(true); CREATE POLICY broad_all ON reviews FOR ALL TO anon,authenticated USING(true) WITH CHECK(true);');
  await as(db,'anon',null,async()=>assert.deepEqual(await rows(db,'SELECT * FROM reviews'),[]));
  await as(db,'authenticated',ids.b,async()=>assert.ok((await rows(db,'SELECT * FROM reviews')).every(r=>r.user_id===ids.b)));
  await db.exec('DROP POLICY broad_all ON reviews; DROP POLICY broad_read ON reviews;');
 });
 await t.test('star INSERT RETURNING and owner deletion preserve aggregate contract; arbitrary text and updates remain denied',async()=>{
  const count=(await rows(db,'SELECT review_count,avg_rating FROM products WHERE id=$1',[ids.visible]))[0];assert.deepEqual(count,{review_count:2,avg_rating:'4.00'});
  const inserted=await as(db,'authenticated',ids.a,()=>rows(db,'INSERT INTO reviews(user_id,product_id,rating,content) VALUES($1,$2,4,\'\') RETURNING id,product_id,rating,created_at',[ids.a,ids.visible]));
  await as(db,'authenticated',ids.a,()=>assert.rejects(db.query('INSERT INTO reviews(user_id,product_id,rating) VALUES($1,$2,4)',[ids.b,ids.visible]),/row-level security/));
  assert.equal(inserted.length,1);
  assert.deepEqual((await rows(db,'SELECT review_count,avg_rating FROM products WHERE id=$1',[ids.visible]))[0],{review_count:3,avg_rating:'4.00'});
  await as(db,'authenticated',ids.b,async()=>{assert.deepEqual(await rows(db,'DELETE FROM reviews WHERE id=$1 RETURNING id',[inserted[0].id]),[]);await assert.rejects(db.query('UPDATE reviews SET rating=1 WHERE id=$1',[ids.rb]),/permission denied/);});
  await as(db,'authenticated',ids.a,async()=>{await assert.rejects(db.query("INSERT INTO reviews(user_id,product_id,rating,content) VALUES($1,$2,2,'not public consent')",[ids.a,ids.visible]),/row-level security/);assert.equal((await rows(db,'DELETE FROM reviews WHERE id=$1 RETURNING id',[inserted[0].id])).length,1);});
  assert.deepEqual((await rows(db,'SELECT review_count,avg_rating FROM products WHERE id=$1',[ids.visible]))[0],count);
 });
 await t.test('normal service-only moderation, audit, conflicts, unhide and rating aggregates remain intact',async()=>{
  const rpc=(patch,expected)=>db.query('SELECT admin_support_correct($1,$2,$3,$4,$5,$6)',['reviews',ids.rb,JSON.stringify(patch),JSON.stringify(expected),'synthetic-admin','synthetic moderation']);
  await as(db,'authenticated',ids.a,()=>assert.rejects(rpc({is_hidden:true},{is_hidden:false}),/permission denied/));
  await as(db,'service_role',null,async()=>{assert.equal((await rows(db,'SELECT * FROM reviews')).length,3);await rpc({is_hidden:true},{is_hidden:false});assert.equal((await rows(db,'SELECT count(*)::int n FROM admin_audit_log'))[0].n,1);await assert.rejects(rpc({is_hidden:false},{is_hidden:false}),e=>e.code==='40001');assert.equal((await rows(db,'SELECT count(*)::int n FROM admin_audit_log'))[0].n,1);});
  assert.deepEqual((await rows(db,'SELECT review_count,avg_rating FROM products WHERE id=$1',[ids.visible]))[0],{review_count:1,avg_rating:'5.00'});
  await as(db,'anon',null,async()=>assert.equal((await rows(db,'SELECT * FROM product_ratings')).length,1));
  await as(db,'authenticated',ids.b,async()=>assert.equal((await rows(db,'SELECT * FROM reviews')).length,1));
  await as(db,'service_role',null,async()=>{await rpc({is_hidden:false},{is_hidden:true});await db.query('UPDATE reviews SET rating=4 WHERE id=$1',[ids.rb]);});
  assert.deepEqual((await rows(db,'SELECT review_count,avg_rating FROM products WHERE id=$1',[ids.visible]))[0],{review_count:2,avg_rating:'4.50'});
 });
 await t.test('strict publication gate affects public projection equally for A/B/anon, not owners or admin raw access',async()=>{
  await db.exec("SELECT set_config('test.verified_only','true',false)");
  for(const [role,user]of [['anon',null],['authenticated',ids.a],['authenticated',ids.b]])await as(db,role,user,async()=>assert.deepEqual(await rows(db,'SELECT * FROM product_ratings'),[]));
  await db.exec("SELECT set_config('test.verified_only','false',false)");
 });
 await t.test('repeat application does not duplicate policies, mutate data or ACL, or replace public projection',async()=>{const old=await snapshot(db);await apply(db);assert.deepEqual(await snapshot(db),old);assert.equal((await rows(db,"SELECT count(*)::int n FROM pg_policy WHERE polname='reviews_owner_read_required'"))[0].n,1);});
 await t.test('single metadata SELECT returns settings only with redacted view literals',async()=>{const sql=await readFile(new URL('./sql/review-privacy-metadata-select.sql',import.meta.url),'utf8');const r=await rows(db,sql);assert.equal(r.length,1);const text=JSON.stringify(r);for(const value of ['synthetic private A','synthetic private B',ids.a,ids.b])assert.ok(!text.includes(value));assert.ok(!r[0].review_privacy_metadata.ratings_view.definition_literals_redacted.includes("'pending'"));});
 }finally{await db.close();}
});
test('unexpected existing policy and public-view contract fail closed with no partial changes',async()=>{
 const db=await fixture();try{
 await db.exec('ALTER TABLE reviews DISABLE ROW LEVEL SECURITY;');
 await assert.rejects(apply(db),/RLS is disabled/);
 assert.equal((await rows(db,"SELECT count(*)::int n FROM pg_policy WHERE polname='reviews_owner_read_required'"))[0].n,0);
 await db.exec('ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;');
 await db.exec('CREATE POLICY reviews_owner_read_required ON reviews AS RESTRICTIVE FOR SELECT TO anon,authenticated;');
 const before=await snapshot(db);await assert.rejects(apply(db),/Existing reviews_owner_read_required differs/);assert.deepEqual(await snapshot(db),before);
 await db.exec('DROP POLICY reviews_owner_read_required ON reviews; ALTER VIEW product_ratings SET(security_invoker=true);');
 await assert.rejects(apply(db),/ownership\/RLS/);
 await db.exec('DROP VIEW product_ratings; CREATE VIEW product_ratings AS SELECT id,product_id,rating,created_at,(user_id=auth.uid()) is_mine,content FROM reviews;');
 await assert.rejects(apply(db),/Unrecognized public ratings contract/);
 assert.equal((await rows(db,"SELECT count(*)::int n FROM pg_policy WHERE polname='reviews_owner_read_required'"))[0].n,0);
 }finally{await db.close();}
});
