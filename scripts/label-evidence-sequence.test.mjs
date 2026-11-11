import assert from 'node:assert/strict';
import {beforeEach,afterEach,it} from 'node:test';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
let db;
const product='00000000-0000-4000-8000-000000000001';
const ids=['00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000004'];
const seq='public.ingredient_label_comparisons_sequence_seq';
const draft=readFileSync('supabase/migration_drafts/20261111150000_restrict_label_evidence_sequence.sql','utf8');
beforeEach(async()=>{db=new PGlite();await db.exec(readFileSync('tests/label-review/schema.sql','utf8'));
 await db.exec('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon,authenticated,service_role');
 await db.exec(readFileSync('supabase/migrations/20261110100000_ingredient_label_comparison_evidence.sql','utf8'));});
afterEach(async()=>db.close());
it('reproduces default-ACL sequence modification under anon SQL role, without private table access',async()=>{
 await db.exec('SET ROLE anon');
 await assert.rejects(db.query('SELECT * FROM ingredient_label_comparisons'),{code:'42501'});
 assert.equal(Number((await db.query(`SELECT setval('${seq}',1000,false) value`)).rows[0].value),1000);
 await db.exec('RESET ROLE');
 // A database-role test, not proof that an anonymous hosted HTTP route exposes setval.
});
it('draft denies nextval/setval/direct sequence reads for application roles',async()=>{
 await db.exec(draft);
 for(const role of ['anon','authenticated','service_role']){
  await db.exec(`SET ROLE ${role}`);
  await assert.rejects(db.query(`SELECT nextval('${seq}')`),{code:'42501'});
  await assert.rejects(db.query(`SELECT setval('${seq}',1000,false)`),{code:'42501'});
  await assert.rejects(db.query(`SELECT last_value FROM ${seq}`),{code:'42501'});
  await db.exec('RESET ROLE');
 }
});
it('owner-definer approval still records evidence and audit atomically after the revoke',async()=>{
 await db.exec(draft);await db.exec('SET ROLE service_role');
 const review=(await db.query('SELECT admin_get_label_comparison_review($1) review',[product])).rows[0].review;
 const args=[product,review.revision,JSON.stringify(ids),JSON.stringify({identityConfirmed:true,wholeLabelCompared:true,sourceReference:'fixture:exact-source',identityNotes:'synthetic package',coverageNotes:'all items reviewed'}),'synthetic-admin'];
 const call=()=>db.query('SELECT admin_approve_label_comparison($1,$2,$3,$4,$5) result',args);
 assert.equal((await call()).rows[0].result.status,'approved');assert.equal((await call()).rows[0].result.status,'already_reviewed');
 await db.exec('RESET ROLE');assert.equal((await db.query('SELECT count(*)::int n FROM ingredient_label_comparisons')).rows[0].n,1);assert.equal((await db.query('SELECT count(*)::int n FROM admin_audit_log')).rows[0].n,1);
 await db.exec('SET ROLE anon');const receipt=(await db.query('SELECT get_public_label_comparison(ARRAY[$1::uuid]) result',[product])).rows[0].result;
 assert.equal(receipt[0].state,'verified');assert.doesNotMatch(JSON.stringify(receipt),/synthetic-admin|fixture:exact-source|coverageNotes/);await db.exec('RESET ROLE');
});
it('fails on a missing target without changing global default ACLs',async()=>{
 await db.exec('DROP TABLE ingredient_label_comparisons');const before=(await db.query("SELECT defaclacl::text acl FROM pg_default_acl WHERE defaclobjtype='S'")).rows;
 await assert.rejects(db.exec(draft),/does not exist|missing|Unexpected/i);
 assert.deepEqual((await db.query("SELECT defaclacl::text acl FROM pg_default_acl WHERE defaclobjtype='S'")).rows,before);
});

it('refuses an unexpected renamed sequence without weakening its existing ACL',async()=>{
 await db.exec('ALTER SEQUENCE public.ingredient_label_comparisons_sequence_seq RENAME TO unexpected_fixture_sequence');
 await assert.rejects(db.exec(draft),/Unexpected or missing/);
 assert.equal((await db.query("SELECT has_sequence_privilege('anon','public.unexpected_fixture_sequence','UPDATE') allowed")).rows[0].allowed,true);
});
