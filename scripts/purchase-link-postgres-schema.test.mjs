import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { it } from 'node:test';
import { createHash } from 'node:crypto';
import { prepareLocalSupabase, LEGACY_LABEL_MIGRATION } from './prepare-local-supabase.mjs';
import { assertPurchaseLinkFullSchema } from './purchase-link-full-schema.mjs';

assert.equal(process.env.PGHOST,'127.0.0.1');
assert.equal(process.env.PGPORT,'5432');
assert.equal(process.env.PGUSER,'postgres');
assert.equal(process.env.PGDATABASE,'purchase_link_full_schema_test');
const root=new URL('../',import.meta.url);
const databases=new Set(['purchase_link_full_schema_test','purchase_link_raw_replay_test']);
function execute(database,statement,role='postgres') {
  assert.ok(databases.has(database));
  assert.ok(['postgres','service_role','anon','authenticated'].includes(role));
  const environment={...process.env,PGHOSTADDR:'127.0.0.1',PGSSLMODE:'disable',
    PGOPTIONS:'-c statement_timeout=30000',PGPASSFILE:'/dev/null'};
  // libpq treats even an empty PGSERVICE as a named service; remove it entirely.
  delete environment.PGSERVICE;
  delete environment.PGSERVICEFILE;
  assert.equal(Object.hasOwn(environment,'PGSERVICE'),false);
  return new Promise((resolve,reject)=>{
    const child=spawn('psql',['-X','--quiet','--tuples-only','--no-align','--no-password',
      '--dbname',database,'-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose'],{
      env:environment,stdio:['pipe','pipe','pipe']});
    let output='',error='';
    child.stdout.on('data',(chunk)=>{output+=chunk;});
    child.stderr.on('data',(chunk)=>{error+=chunk;});
    child.on('error',reject);
    child.on('close',(code)=>code===0 ? resolve(output.trim()) : reject(Error(error.trim())));
    child.stdin.end(`SET ROLE ${role};\n${statement}`);
  });
}
const query=async(database,statement,role)=>({rows:JSON.parse(await execute(database,
  `SELECT coalesce(json_agg(row_to_json(result)),'[]') FROM (${statement}) result;`,role))});

it('replays the unchanged repository schema, diagnoses legacy replay, then validates the draft in PostgreSQL', {timeout:180000}, async()=>{
  const fixture=await readFile(new URL('scripts/fixtures/supabase-owned-schema.sql',root),'utf8');
  const historical=(await readdir(new URL('supabase/migrations/',root))).filter((f)=>/^\d{14}_.+\.sql$/.test(f)).sort();
  for(const database of databases) {
    assert.equal((await query(database,"SELECT count(*)::integer AS n FROM pg_tables WHERE schemaname='public'")).rows[0].n,0,
      'Refuse a populated database');
    await execute(database,fixture);
  }
  let rawFailure=null;
  for(const file of historical) {
    try { await execute('purchase_link_raw_replay_test',await readFile(new URL(`supabase/migrations/${file}`,root),'utf8')); }
    catch(error) {
      assert.equal(file,LEGACY_LABEL_MIGRATION,'Do not mask an unknown historical replay failure');
      assert.match(error.message,/23503/,'Only the established missing-product FK limitation is accepted');
      rawFailure={file,sqlstate:'23503',origin:'pre-existing historical product dependency'};
      break;
    }
  }
  const temporary=await mkdtemp(path.join(tmpdir(),'veroro-purchase-schema-'));
  const prepared=await prepareLocalSupabase(path.join(temporary,'unlinked-project'));
  const directory=path.join(prepared.directory,'supabase/migrations');
  const files=(await readdir(directory)).filter((f)=>f.endsWith('.sql')).sort();
  const checksums={};let skipped=0;
  for(const file of files) {
    const sql=await readFile(path.join(directory,file),'utf8');
    if(!file.includes('_local_missing_product_guard')) {
      assert.equal(sql,await readFile(new URL(`supabase/migrations/${file}`,root),'utf8'));
      checksums[file]=createHash('sha256').update(sql).digest('hex');
    }
    try { await execute('purchase_link_full_schema_test',sql); }
    catch(error) { throw new Error(`${file}: ${error.message}`,{cause:error}); }
    if(file===LEGACY_LABEL_MIGRATION) {
      skipped=(await query('purchase_link_full_schema_test','SELECT count(*)::integer AS n FROM local_bootstrap.skipped_rows')).rows[0].n;
      assert.equal(skipped,47);
    }
  }
  assert.equal((await query('purchase_link_full_schema_test',"SELECT count(*)::integer AS n FROM pg_namespace WHERE nspname='local_bootstrap'")).rows[0].n,0);
  assert.equal((await query('purchase_link_full_schema_test','SELECT count(*)::integer AS n FROM public.products')).rows[0].n,0);
  await assertPurchaseLinkFullSchema({
    exec:(sql,role)=>execute('purchase_link_full_schema_test',sql,role),
    query:(sql,role)=>query('purchase_link_full_schema_test',sql,role),
  });
  console.log(JSON.stringify({postgresFullSchema:true,historicalMigrations:historical.length,
    preparedMigrations:files.length,skippedKnownLegacyOrphans:skipped,rawReplay:rawFailure??'passed',
    historicalSourceSHA256:createHash('sha256').update(JSON.stringify(checksums)).digest('hex'),
    ledgerRepair:false,historicalFilesModified:false,supabaseAuthStorage:'schema fixtures only; no HTTP services'}));
});
