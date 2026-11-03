import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { prepareRelease } from './prepare-source-recovery-release.mjs';
import { recoveryRequirements, recoveryPreflightSql } from './source-recovery-preflight.mjs';
import { PGlite } from '@electric-sql/pglite';
const projectRef = 'abcdefghijklmnopqrst';
const now = Date.parse('2026-11-03T00:00:00Z');
async function fixture(run) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'source-release-test-'));
  try {
    await mkdir(path.join(root, 'repo/supabase/migrations'), { recursive: true });
    await mkdir(path.join(root, 'repo/supabase/migration_drafts'));
    await writeFile(path.join(root, 'repo/supabase/migrations/20260101000000_old.sql'), '-- historical\n');
    await writeFile(path.join(root, 'repo/supabase/migrations/20260201000000_pending.sql'), '-- must not run\n');
    await writeFile(path.join(root, 'repo/supabase/migration_drafts/20261103120000_restore_product_source_contract.sql'), await readFile(new URL('../supabase/migration_drafts/20261103120000_restore_product_source_contract.sql',import.meta.url)));
    await mkdir(path.join(root, 'repo/src/lib'), { recursive:true });
    await writeFile(path.join(root, 'repo/src/lib/supabase.ts'), '.select(`id,brand_name,catalog_source_url,catalog_source_note,requires_veterinary_guidance,product_ingredients(ingredient_id)`)');
    const options = { repo: path.join(root, 'repo'), output: path.join(root, 'release'),
      evidence: { project_ref: projectRef, observed_at: new Date(now).toISOString(), ledger: [{ version: '20260101000000', name: 'old' }] },
      version: '20261103120000', projectRef, now };
    const expected = await recoveryRequirements(options.repo);
    options.evidence.columns = [...expected.columns].map(s => {const [table_name,column_name]=JSON.parse(s);return {table_name,column_name,present:!column_name.startsWith('catalog_source') && column_name!=='requires_veterinary_guidance',anon_select:true};});
    options.evidence.relationships = [...expected.relationships].map(s => {const [parent,child,hint]=JSON.parse(s);return {parent,child,hint,present:true,candidate_count:1};});
    options.evidence.functions = [{ signature:'public.search_catalog_products(text,text,text,integer,integer)',present:true,anon_execute:true }];
    options.evidence.product_rls = { anon_table_select:true };
    await run(options);
  } finally { await rm(root, { recursive: true, force: true }); }
}
test('offline release retains real applied files, excludes pending files and copies exact recovery bytes', () => fixture(async options => {
  const m = await prepareRelease(options);
  assert.deepEqual(await readdir(path.join(options.output, 'supabase/migrations')), ['20260101000000_old.sql','20261103120000_restore_product_source_contract.sql']);
  assert.deepEqual(m.excludedPendingFiles, ['20260201000000_pending.sql']);
  assert.equal(await readFile(path.join(options.output, 'supabase/migrations', m.recovery.file), 'utf8'), await readFile(new URL('../supabase/migration_drafts/20261103120000_restore_product_source_contract.sql',import.meta.url),'utf8'));
  assert.match(await readFile(path.join(options.output, 'supabase/config.toml'), 'utf8'), /enabled = false/);
  await assert.rejects(prepareRelease(options), /EEXIST/);
}));
for (const [name, change] of [
  ['wrong project', o => { o.projectRef = 'bcdefghijklmnopqrstu'; }],
  ['stale evidence', o => { o.now += 86_400_001; }],
  ['duplicate ledger', o => { o.evidence.ledger.push(o.evidence.ledger[0]); }],
  ['remote-only history', o => { o.evidence.ledger[0].version = '20250101000000'; }],
  ['wrong file name', o => { o.evidence.ledger[0].name = '../other'; }],
  ['old recovery version', o => { o.version = '20250101000000'; }],
  ['empty ledger', o => { o.evidence.ledger = []; }],
  ['other missing column', o => { o.evidence.columns.push({table_name:'products',column_name:'name',present:false}); }],
  ['public column denied', o => { o.evidence.columns.push({table_name:'products',column_name:'name',present:true,anon_select:false}); }],
  ['ambiguous FK', o => { o.evidence.relationships[0].candidate_count = 2; }],
  ['missing search', o => { o.evidence.functions[0].present = false; }],
  ['truncated projection', o => { o.evidence.columns.pop(); }],
  ['new columns would lack SELECT', o => { o.evidence.product_rls.anon_table_select=false; }],
]) test(`fails closed before writing: ${name}`, () => fixture(async options => {
  change(options);
  await assert.rejects(prepareRelease(options));
  await assert.rejects(readdir(options.output), /ENOENT/);
}));
test('full projection/ledger preflight executes as SELECT only against isolated missing-schema fixture', async () => {
  const db = new PGlite();
  try {
    await db.exec('CREATE ROLE anon; CREATE TABLE products(id integer); CREATE SCHEMA supabase_migrations; CREATE TABLE supabase_migrations.schema_migrations(version text,name text);');
    const sql = await recoveryPreflightSql();
    assert.ok(!/\b(?:INSERT|UPDATE|DELETE|ALTER|DROP|CREATE|DO|CALL|NOTIFY)\b/i.test(sql));
    const result = await db.query(sql);
    const e = result.rows[0].recovery_preflight;
    assert.ok(e.columns.length > 40);
    assert.ok(e.relationships.length > 0);
    assert.ok(e.columns.some(c => c.column_name==='catalog_source_url' && !c.present));
    assert.deepEqual(e.ledger, []);
    assert.equal(e.functions[0].present, false);
  } finally {await db.close();}
});
test('CLI transaction shape rolls back schema if its trailing ledger insert fails; successful schema and ledger commit together', async () => {
  const db = new PGlite();
  try {
    const sql = await readFile(new URL('../supabase/migration_drafts/20261103120000_restore_product_source_contract.sql',import.meta.url),'utf8');
    assert.ok(!/^\s*(?:BEGIN|COMMIT|ROLLBACK);\s*$/im.test(sql));
    await db.exec("CREATE TABLE products(id integer PRIMARY KEY,name text); CREATE TABLE ledger(version text PRIMARY KEY); INSERT INTO products VALUES(1,'synthetic'); INSERT INTO ledger VALUES('duplicate');");
    await assert.rejects(db.exec(`BEGIN;${sql} INSERT INTO ledger VALUES('duplicate'); COMMIT;`));
    await db.exec('ROLLBACK');
    assert.equal((await db.query("SELECT count(*)::int n FROM information_schema.columns WHERE table_name='products' AND column_name='catalog_source_url'")).rows[0].n,0);
    await db.exec(`BEGIN;${sql} INSERT INTO ledger VALUES('20261103120000'); COMMIT;`);
    assert.equal((await db.query("SELECT count(*)::int n FROM ledger WHERE version='20261103120000'")).rows[0].n,1);
    assert.deepEqual((await db.query('SELECT catalog_source_url,catalog_source_note,requires_veterinary_guidance FROM products')).rows,[{catalog_source_url:null,catalog_source_note:null,requires_veterinary_guidance:false}]);
  } finally {await db.close();}
});
