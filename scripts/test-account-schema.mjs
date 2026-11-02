// Executes real PostgreSQL SQL/RLS against minimal Supabase-owned fixtures.
// This does not exercise the Supabase Auth/Storage HTTP services or Deno runtime.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const db = new PGlite();
const alice = '11111111-1111-4111-8111-111111111111';
const bob = '22222222-2222-4222-8222-222222222222';
await db.exec(`
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
CREATE SCHEMA auth; CREATE SCHEMA storage;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE TABLE storage.buckets(id text PRIMARY KEY,public boolean);
CREATE TABLE storage.objects(id uuid DEFAULT gen_random_uuid(),bucket_id text,name text,owner uuid,owner_id text);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql AS $$ SELECT (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1] $$;
GRANT USAGE ON SCHEMA auth,storage,public TO anon,authenticated,service_role;
GRANT SELECT ON storage.objects TO anon,authenticated;
CREATE POLICY feeding_log_photos_public_read ON storage.objects FOR SELECT USING(bucket_id='feeding-log-photos');
CREATE TABLE public.users(id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE);
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view and edit own profile" ON public.users FOR ALL USING(auth.uid()=id);
CREATE POLICY "Review authors have public profiles" ON public.users FOR SELECT USING(true);
CREATE TABLE public.pets(id uuid PRIMARY KEY,user_id uuid REFERENCES public.users(id) ON DELETE CASCADE);
CREATE TABLE public.pet_feeding_logs(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,pet_id uuid REFERENCES public.pets(id) ON DELETE CASCADE,image_url text);
CREATE TABLE public.reviews(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),product_id uuid,user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,rating int,content text DEFAULT '',created_at timestamptz DEFAULT now());
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read reviews" ON public.reviews FOR SELECT USING(true);
CREATE POLICY "Users insert own reviews" ON public.reviews FOR INSERT WITH CHECK(auth.uid()=user_id);
GRANT SELECT,INSERT,UPDATE,DELETE ON public.reviews TO anon,authenticated;
CREATE TABLE public.community_posts(id uuid,user_id uuid,content text); ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.community_comments(id uuid,user_id uuid,content text); ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;
INSERT INTO auth.users VALUES('${alice}'),('${bob}'); INSERT INTO public.users VALUES('${alice}'),('${bob}');
INSERT INTO storage.buckets VALUES('feeding-log-photos',true),('product-scan-evidence',false);
INSERT INTO storage.objects(bucket_id,name,owner,owner_id) VALUES
('feeding-log-photos','${alice}/photo.jpg','${alice}','${alice}'),
('feeding-log-photos','${bob}/photo.jpg','${bob}','${bob}'),
('product-scan-evidence','${alice}/orphan/test.webp',null,null),
('other-private-bucket','legacy-random.jpg','${alice}','${alice}');
INSERT INTO public.pet_feeding_logs(user_id,image_url) VALUES('${alice}','https://old.supabase.co/storage/v1/object/public/feeding-log-photos/${alice}/photo.jpg');
INSERT INTO public.reviews(user_id,rating,content) VALUES('${alice}',4,'private review'),('${bob}',2,'other private review');
`);
await db.exec(readFileSync(new URL('../supabase/migrations/20261026160000_account_privacy_release.sql', import.meta.url),'utf8'));
const query = async (sql) => (await db.query(sql)).rows;
assert.equal((await query("SELECT public FROM storage.buckets WHERE id='feeding-log-photos'"))[0].public,false);
await db.exec('SET ROLE anon');
assert.equal((await query('SELECT * FROM storage.objects')).length,0);
assert.equal((await query('SELECT * FROM public.reviews')).length,0);
const projection = await query('SELECT * FROM public.product_ratings');
assert.equal(projection.length,2); assert.equal('content' in projection[0],false); assert.equal('user_id' in projection[0],false);
await db.exec(`RESET ROLE; SET request.jwt.claim.sub = '${alice}'; SET ROLE authenticated`);
assert.equal((await query('SELECT * FROM storage.objects')).length,1);
assert.equal((await query('SELECT content FROM public.reviews'))[0].content,'private review');
assert.equal((await query('SELECT * FROM public.product_ratings WHERE is_mine')).length,1);
await assert.rejects(db.exec(`INSERT INTO public.reviews(user_id,rating,content) VALUES('${alice}',5,'not allowed')`),/row-level security/);
await assert.rejects(db.exec(`SELECT public.account_owned_objects('${bob}')`),/permission denied/);
await db.exec(`INSERT INTO public.reviews(user_id,rating,content) VALUES('${alice}',5,''); RESET ROLE`);
assert.equal((await query(`SELECT image_url FROM public.pet_feeding_logs WHERE user_id='${alice}'`))[0].image_url,`${alice}/photo.jpg`);
await db.exec(`UPDATE public.pet_feeding_logs SET image_url=null WHERE user_id='${alice}'`);
assert.equal((await query(`SELECT * FROM public.account_photo_cleanup_batch('${alice}')`))[0].name,`${alice}/photo.jpg`);
// Reproduce the HTTP cleanup gap: the batch commits before Storage.remove runs.
// A stale editor must never attach that claimed path during or after removal.
await assert.rejects(db.exec(`UPDATE public.pet_feeding_logs SET image_url='${alice}/photo.jpg' WHERE user_id='${alice}'`),/photo_cleanup_claimed/);
await assert.rejects(db.exec(`INSERT INTO public.pet_feeding_logs(user_id,image_url) VALUES('${alice}','${alice}/photo.jpg')`),/photo_cleanup_claimed/);
for (const kind of ['public', 'sign', 'authenticated']) {
  await assert.rejects(db.exec(`UPDATE public.pet_feeding_logs SET image_url='https://old.supabase.co/storage/v1/object/${kind}/feeding-log-photos/${alice}/photo.jpg?token=stale' WHERE user_id='${alice}'`),/photo_cleanup_claimed/);
}
assert.equal((await query(`SELECT * FROM public.account_photo_cleanup_batch('${alice}')`))[0].name,`${alice}/photo.jpg`, 'failed removal must remain retryable');
await db.exec(`SELECT public.ack_account_photo_cleanup('${alice}', ARRAY['${alice}/photo.jpg'])`);
assert.equal((await query(`SELECT * FROM public.account_photo_cleanup_batch('${alice}')`)).length,0);
assert.ok((await query(`SELECT completed_at FROM public.account_photo_cleanup WHERE user_id='${alice}'`))[0].completed_at, 'ack must retain a completed tombstone');
await assert.rejects(db.exec(`UPDATE public.pet_feeding_logs SET image_url='${alice}/photo.jpg' WHERE user_id='${alice}'`),/photo_cleanup_claimed/);
await assert.rejects(db.exec(`INSERT INTO storage.objects(bucket_id,name) VALUES('feeding-log-photos','${alice}/photo.jpg')`),/photo_cleanup_claimed/);
// The opposite serialization order is safe too: a still-attached queued photo
// cannot be claimed, and reattachment is permitted until cleanup claims it.
await db.exec(`
INSERT INTO public.pet_feeding_logs(user_id,image_url) VALUES('${bob}','${bob}/photo.jpg'),('${bob}','${bob}/photo.jpg');
UPDATE public.pet_feeding_logs SET image_url=null WHERE id=(SELECT id FROM public.pet_feeding_logs WHERE user_id='${bob}' LIMIT 1);
SELECT public.ack_account_photo_cleanup('${bob}', ARRAY['${bob}/photo.jpg']);
`);
assert.equal((await query(`SELECT * FROM public.account_photo_cleanup_batch('${bob}')`)).length,0, 'must preserve a path still referenced by another record');
await db.exec(`INSERT INTO public.pet_feeding_logs(user_id,image_url) VALUES('${bob}','${bob}/photo.jpg')`);
await db.exec(`UPDATE public.pet_feeding_logs SET image_url=null WHERE user_id='${bob}'`);
assert.equal((await query(`SELECT * FROM public.account_photo_cleanup_batch('${bob}')`))[0].name,`${bob}/photo.jpg`);
await assert.rejects(db.exec(`INSERT INTO public.pet_feeding_logs(user_id,image_url) VALUES('${bob}','${bob}/photo.jpg')`),/photo_cleanup_claimed/);
assert.equal((await query(`SELECT * FROM public.account_owned_objects('${alice}')`)).length,3);
await db.exec(`SELECT public.begin_account_deletion('${alice}')`);
await assert.rejects(db.exec(`INSERT INTO storage.objects(bucket_id,name) VALUES('product-scan-evidence','${alice}/new.webp')`),/account_deletion_in_progress/);
await db.exec(`INSERT INTO storage.objects(bucket_id,name,owner_id) VALUES('feeding-log-photos','${bob}/new.jpg','${bob}')`);
// Account cascade must not fail by queuing a now-orphan foreign key during deletion.
await db.exec(`INSERT INTO public.pet_feeding_logs(user_id,image_url) VALUES('${alice}','${alice}/other.jpg'); DELETE FROM auth.users WHERE id='${alice}'`);
assert.equal((await query(`SELECT * FROM public.account_photo_cleanup WHERE user_id='${alice}'`)).length,0);
await assert.rejects(db.exec(`INSERT INTO storage.objects(bucket_id,name) VALUES('product-scan-evidence','${alice}/late-token.webp')`),/account_not_found/);
await db.close();
console.log('Account migration SQL/RLS smoke passed: private storage, owner isolation, rating projection, no free text insert, service-only RPCs, legacy normalization, persistent cleanup claims, stale-editor and post-ack resurrection prevention, orphan inventory, upload guard, deletion cascade.');
