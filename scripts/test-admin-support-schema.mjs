import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const db = new PGlite();
const user = '11111111-1111-4111-8111-111111111111',
  pet = '22222222-2222-4222-8222-222222222222',
  product = '33333333-3333-4333-8333-333333333333',
  log = '44444444-4444-4444-8444-444444444444',
  review = '55555555-5555-4555-8555-555555555555';
await db.exec(`
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
CREATE SCHEMA private; CREATE FUNCTION private.hide_unverified_products_enabled() RETURNS boolean LANGUAGE sql AS 'SELECT false';
CREATE TABLE public.products(id uuid PRIMARY KEY,review_count int,avg_rating numeric,is_visible boolean DEFAULT true,verification_status text DEFAULT 'verified');
CREATE TABLE public.pets(id uuid PRIMARY KEY,user_id uuid,name text,pet_type text,age_group text,breed text,weight numeric,allergies text[],conditions text[]);
CREATE TABLE public.pet_feeding_logs(id uuid PRIMARY KEY,user_id uuid,pet_id uuid,product_id uuid,feeding_date date,feeding_time time,meal_period text,amount numeric,unit text,preference_level smallint,memo text,reaction_note text,updated_at timestamptz);
CREATE TABLE public.reviews(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,product_id uuid,rating int,content text DEFAULT '',created_at timestamptz DEFAULT now());
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY owner_read ON public.reviews FOR SELECT TO authenticated USING(auth.uid()=user_id);
GRANT SELECT,INSERT,DELETE ON public.reviews TO authenticated;
CREATE VIEW public.product_ratings WITH (security_barrier=true) AS SELECT id,product_id,rating,created_at,(user_id=auth.uid()) AS is_mine FROM public.reviews;
GRANT SELECT ON public.product_ratings TO anon,authenticated;
CREATE TABLE public.admin_audit_log(id uuid DEFAULT gen_random_uuid(),actor text,action text,target_table text,target_id text,detail jsonb,created_at timestamptz DEFAULT now());
INSERT INTO public.products(id,review_count,avg_rating) VALUES('${product}',0,0);
INSERT INTO public.pets VALUES('${pet}','${user}','보리','dog','adult','말티푸',6.8,ARRAY['닭고기'],ARRAY['소화기']);
INSERT INTO public.pet_feeding_logs(id,user_id,pet_id,product_id,feeding_date,amount,unit) VALUES('${log}','${user}','${pet}','${product}','2026-11-04',70.5,'g');
INSERT INTO public.reviews(id,user_id,product_id,rating) VALUES('${review}','${user}','${product}',5),(gen_random_uuid(),'${user}','${product}',3);
`);
await db.exec(
  readFileSync(
    new URL(
      '../supabase/migrations/20260914144655_sync_product_review_aggregates.sql',
      import.meta.url,
    ),
    'utf8',
  ),
);
await db.exec(
  readFileSync(
    new URL(
      '../supabase/migrations/20261104110000_admin_support_management.sql',
      import.meta.url,
    ),
    'utf8',
  ),
);
const q = async (sql) => (await db.query(sql)).rows;
const call = async (table, id, patch, expected, reason = '보호자 요청 확인') =>
  db.query('SELECT public.admin_support_correct($1,$2,$3,$4,$5,$6)', [
    table,
    id,
    JSON.stringify(patch),
    JSON.stringify(expected),
    'qa-admin',
    reason,
  ]);
await db.exec('SET ROLE anon');
await assert.rejects(
  call('pets', pet, { weight: 7 }, { weight: 6.8 }),
  /permission denied/,
);
await db.exec(
  `RESET ROLE; SET ROLE authenticated; SET request.jwt.claim.sub='${user}'`,
);
await assert.rejects(
  call('pets', pet, { weight: 7 }, { weight: 6.8 }),
  /permission denied/,
);
await assert.rejects(
  db.exec(
    `INSERT INTO public.reviews(user_id,product_id,rating,is_hidden) VALUES('${user}','${product}',5,true)`,
  ),
  /row-level security/,
);
await assert.rejects(
  db.exec(`UPDATE public.reviews SET is_hidden=true`),
  /permission denied/,
);
await db.exec('RESET ROLE');
await assert.rejects(
  call('pets', pet, { user_id: user }, { user_id: user }),
  /수정할 수 없는/,
);
await assert.rejects(call('pets', pet, { weight: 7 }, {}), /원본 값/);
await assert.rejects(
  call('pets', pet, { weight: 7 }, { weight: 6.8 }, ''),
  /처리 사유/,
);
await call('pets', pet, { weight: 7 }, { weight: 6.8 });
await assert.rejects(
  call('pets', pet, { weight: 8 }, { weight: 6.8 }),
  /변경했습니다/,
);
assert.equal(
  Number(
    (await q(`SELECT weight FROM public.pets WHERE id='${pet}'`))[0].weight,
  ),
  7,
);
await call('pet_feeding_logs', log, { amount: 71.5 }, { amount: 70.5 });
assert.equal(
  Number(
    (await q(`SELECT amount FROM public.pet_feeding_logs WHERE id='${log}'`))[0]
      .amount,
  ),
  71.5,
);
await call('reviews', review, { is_hidden: true }, { is_hidden: false });
await db.exec('SET ROLE anon');
assert.equal((await q('SELECT * FROM public.product_ratings')).length, 1);
await db.exec('RESET ROLE');
assert.deepEqual(
  (await q('SELECT review_count,avg_rating FROM public.products'))[0],
  { review_count: 1, avg_rating: '3.00' },
);
await call('reviews', review, { is_hidden: false }, { is_hidden: true });
assert.deepEqual(
  (await q('SELECT review_count,avg_rating FROM public.products'))[0],
  { review_count: 2, avg_rating: '4.00' },
);
await db.exec(`UPDATE public.products SET is_visible=false; SET ROLE anon`);
assert.equal((await q('SELECT * FROM public.product_ratings')).length, 0);
await db.exec('RESET ROLE; UPDATE public.products SET is_visible=true');
const audit = (
  await q(`SELECT detail FROM public.admin_audit_log WHERE target_table='pets'`)
)[0].detail;
assert.equal(audit.before.weight, 6.8);
assert.equal(audit.after.weight, 7);
assert.equal(audit.reason, '보호자 요청 확인');
await db.exec(
  `CREATE FUNCTION reject_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'audit unavailable'; END; $$; CREATE TRIGGER audit_fail BEFORE INSERT ON public.admin_audit_log FOR EACH ROW EXECUTE FUNCTION reject_audit();`,
);
await assert.rejects(
  call('pets', pet, { weight: 9 }, { weight: 7 }),
  /audit unavailable/,
);
assert.equal(
  Number(
    (await q(`SELECT weight FROM public.pets WHERE id='${pet}'`))[0].weight,
  ),
  7,
);
await db.close();
console.log(
  'Admin support SQL: privilege boundaries, ownership-column protection, stale writes, transactional audit, moderation projection and aggregates passed.',
);
