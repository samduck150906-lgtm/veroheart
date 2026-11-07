import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
export const migrationUrl = new URL('../supabase/migrations/20261106090000_restrict_raw_review_reads.sql',import.meta.url);
export async function assertReviewReadBoundaryOnBootstrap(db) {
  const snapshot = async () => (await db.query(`SELECT
    md5(pg_get_viewdef('public.product_ratings'::regclass,true)) AS view_hash,
    (SELECT relacl::text FROM pg_class WHERE oid='public.reviews'::regclass) AS reviews_acl,
    (SELECT relacl::text FROM pg_class WHERE oid='public.product_ratings'::regclass) AS view_acl,
    (SELECT count(*)::int FROM public.reviews) AS rows,
    md5(pg_get_functiondef('public.admin_support_correct(text,uuid,jsonb,jsonb,text,text)'::regprocedure)) AS admin_hash`)).rows[0];
  await db.exec('BEGIN');
  try {
    const before=await snapshot();
    const sql=await readFile(migrationUrl,'utf8'); await db.exec(sql); await db.exec(sql);
    assert.deepEqual(await snapshot(),before,'view, ACL, administrator function and rows preserved');
    for (const role of ['anon','authenticated','service_role']) {
      await db.exec(`SET LOCAL ROLE ${role}`);
      // Administrators use the verified Edge -> service-role raw table/RPC path;
      // the public projection's private helper is only granted to public roles.
      if (role !== 'service_role') await db.query('SELECT id,product_id,rating,created_at,is_mine FROM public.product_ratings LIMIT 0');
      await db.query('SELECT id,product_id,user_id,content FROM public.reviews LIMIT 0');
      await db.exec('RESET ROLE');
    }
    const p=(await db.query("SELECT polpermissive,polcmd FROM pg_policy WHERE polrelid='public.reviews'::regclass AND polname='reviews_owner_read_required'")).rows;
    assert.deepEqual(p,[{polpermissive:false,polcmd:'r'}]);
    console.log('PASS: review read migration on guard-included complete bootstrap; existing view/ACL/admin function unchanged');
  } finally {await db.exec('ROLLBACK; RESET ROLE');}
}
