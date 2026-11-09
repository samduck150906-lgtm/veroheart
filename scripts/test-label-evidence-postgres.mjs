// Official existing CI CLI + loopback PG17; no operating URI or secret accepted.
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {readFile,writeFile,mkdtemp,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
const cli=process.env.REVIEW_PRIVACY_TEST_CLI;assert(cli);
const admin=new URL(process.env.REVIEW_PRIVACY_PG_URL||'');
assert(['127.0.0.1','localhost','[::1]'].includes(admin.hostname));assert.equal(admin.username,'postgres');assert.equal(admin.password,'');assert.equal(admin.pathname,'/postgres');assert([...admin.searchParams.keys()].every(k=>k==='sslmode'));admin.searchParams.set('sslmode','disable');
const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.startsWith('PG')&&!k.startsWith('SUPABASE_')));
const root=new URL('../',import.meta.url),version='20261110100000',name=`${version}_ingredient_label_comparison_evidence.sql`;
const candidate=await readFile(new URL('supabase/migrations/'+name,root),'utf8');const sha256=createHash('sha256').update(candidate).digest('hex');
const schema=await readFile(new URL('tests/label-review/schema.sql',root),'utf8');
const output=resolve('.artifacts/label-evidence-postgres');await mkdir(output,{recursive:true});
const work=await mkdtemp(join(tmpdir(),'label-evidence-pg-'));const databases=[];const results=[];
const run=(file,args,input='',extra={})=>spawnSync(file,args,{env:{...env,...extra},input,encoding:'utf8',maxBuffer:10*1024*1024});
const psql=(uri,sql,extra={})=>{const r=run('psql',['-X','-q','-A','-t','-v','ON_ERROR_STOP=1','--dbname',uri,'-c',sql],'',extra);assert.equal(r.status,0,r.stderr);return r.stdout.trim();};
const q=(u,s)=>JSON.parse(psql(u,s));const quote=s=>"'"+String(s).replaceAll("'","''")+"'";
const pid='00000000-0000-4000-8000-000000000001';const ids='["00000000-0000-4000-8000-000000000003","00000000-0000-4000-8000-000000000004"]';
const obs=JSON.stringify({identityConfirmed:true,wholeLabelCompared:true,sourceReference:'fixture:retained-package',identityNotes:'synthetic package identity',coverageNotes:'all raw label tokens reviewed'});
const review=u=>q(u,`SELECT admin_get_label_comparison_review('${pid}')`);
const receipt=u=>q(u,`SELECT get_public_label_comparison(ARRAY['${pid}'::uuid])`);
const approve=r=>`SELECT admin_approve_label_comparison('${pid}',${quote(r)},${quote(ids)}::jsonb,${quote(obs)}::jsonb,'synthetic-admin')`;
const state=u=>q(u,`SELECT json_build_object('objects',(SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE (n.nspname='private' AND c.relname='ingredient_label_revisions') OR(n.nspname='public' AND c.relname='ingredient_label_comparisons')),'ledger',(SELECT count(*) FROM supabase_migrations.schema_migrations WHERE version='${version}'),'events',(SELECT coalesce(json_agg(e),'[]'::json) FROM fixture_events e))`);
const business=u=>q(u,"SELECT json_build_object('evidence',(SELECT count(*) FROM ingredient_label_comparisons),'audit',(SELECT count(*) FROM admin_audit_log))");
async function fresh(label){const db=`label_evidence_${process.pid}_${databases.length}`;databases.push(db);psql(admin.href,`CREATE DATABASE ${db}`);const u=new URL(admin);u.pathname='/'+db;psql(u.href,schema+`
 CREATE SCHEMA supabase_migrations;CREATE TABLE supabase_migrations.schema_migrations(version text PRIMARY KEY,name text,statements text[]);
 CREATE TABLE fixture_events(kind text,pid int,txid bigint);
 CREATE FUNCTION trace_ddl() RETURNS event_trigger LANGUAGE plpgsql AS $$ BEGIN INSERT INTO fixture_events VALUES('ddl',pg_backend_pid(),txid_current()); END $$;
 CREATE EVENT TRIGGER trace_label_ddl ON ddl_command_end WHEN TAG IN ('CREATE TABLE','CREATE FUNCTION','CREATE TRIGGER') EXECUTE FUNCTION trace_ddl();
 CREATE FUNCTION trace_ledger() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN INSERT INTO fixture_events VALUES('ledger',pg_backend_pid(),txid_current()); RETURN NEW; END $$;
 CREATE TRIGGER trace_label_ledger AFTER INSERT ON supabase_migrations.schema_migrations FOR EACH ROW EXECUTE FUNCTION trace_ledger();TRUNCATE fixture_events;`);
 const dir=join(work,label);await mkdir(join(dir,'supabase/migrations'),{recursive:true});await writeFile(join(dir,'supabase/migrations',name),candidate);await writeFile(join(dir,'supabase/config.toml'),'project_id="label-evidence-local"\n[db]\nmajor_version=17\n[db.seed]\nenabled=false\nsql_paths=[]\n');return {uri:u.href,dir,label};}
async function push(f,dry=false){const r=run(cli,['db','push','--db-url',f.uri,'--workdir',f.dir,...(dry?['--dry-run']:[])],'y\n');await writeFile(join(output,f.label+(dry?'-dry':'-apply')+'.log'),r.stdout+'\n'+r.stderr);return r;}
async function session(uri,sql,label){const child=spawn('psql',['-X','-q','-A','-t','-v','ON_ERROR_STOP=1','--dbname',uri,'-c',sql],{env:{...env,PGAPPNAME:label}});let stdout='',stderr='';child.stdout.on('data',d=>stdout+=d);child.stderr.on('data',d=>stderr+=d);const done=new Promise(resolve=>child.on('close',code=>resolve({code,stdout,stderr})));return {done};}
async function asleep(u,label){for(let n=0;n<60;n++){if(psql(u,`SELECT count(*) FROM pg_stat_activity WHERE application_name=${quote(label)} AND wait_event='PgSleep'`)==='1')return;await new Promise(r=>setTimeout(r,50));}throw Error('Holder did not reach its independent PG connection barrier');}
try{
 assert.equal(run(cli,['--version']).stdout.trim(),'2.118.0');
 const f=await fresh('normal');const dry=await push(f,true);assert.equal(dry.status,0,dry.stderr);assert.ok((dry.stdout+dry.stderr).includes(name));assert.equal((await push(f)).status,0);
 const s=state(f.uri);assert.equal(s.objects,2);assert.equal(s.ledger,1);const idsTx=[...new Set(s.events.map(e=>e.txid))];assert.equal(idsTx.length,1,'DDL and actual CLI ledger must share one transaction');
 assert.equal((await push(f)).status,0);assert.equal(state(f.uri).ledger,1);results.push({case:'real_cli_apply_and_ledger_atomic',pass:true,transactionCount:idsTx.length});
 const sharedRevision=review(f.uri).revision;
 const firstApproval=await session(f.uri,`BEGIN;${approve(sharedRevision)};SELECT pg_sleep(0.7);COMMIT;`,'label_first_approval');await asleep(f.uri,'label_first_approval');
 const secondApproval=await session(f.uri,approve(sharedRevision),'label_second_approval');
 assert.equal((await firstApproval.done).code,0);const secondResult=await secondApproval.done;
 assert.equal(secondResult.code,0);assert.match(secondResult.stdout,/already_reviewed/);assert.deepEqual(business(f.uri),{evidence:1,audit:1});results.push({case:'concurrent_same_revision_one_evidence_one_audit',pass:true});
 for(const table of ['products','product_ingredient_label_sets','product_ingredient_label_items']){
  const r=review(f.uri).revision;const column=table==='products'?'name':table==='product_ingredient_label_sets'?'raw_label_text':'raw_ingredient_text';const before=business(f.uri);
  const holder=await session(f.uri,`BEGIN;UPDATE ${table} SET ${column}=${column}||' ';SELECT pg_sleep(0.7);COMMIT;`,'label_writer');await asleep(f.uri,'label_writer');
  const answer=run('psql',['-X','-q','-v','ON_ERROR_STOP=1','--dbname',f.uri,'-c',approve(r)]);
  assert.notEqual(answer.status,0);assert.match(answer.stderr,/review_revision_conflict/);assert.equal((await holder.done).code,0);assert.deepEqual(business(f.uri),before);results.push({case:`writer_before_approve_${table}`,pass:true});
 }
 // Recreate clean business fixture for each independent direction, no production state.
 const g=await fresh('concurrency');assert.equal((await push(g)).status,0);
 for(const table of ['products','product_ingredient_label_sets','product_ingredient_label_items']){
  const r=review(g.uri).revision;const holder=await session(g.uri,`BEGIN;${approve(r)};SELECT pg_sleep(0.7);COMMIT;`,'label_approver');await asleep(g.uri,'label_approver');
  const column=table==='products'?'name':table==='product_ingredient_label_sets'?'raw_label_text':'raw_ingredient_text';const writer=await session(g.uri,`UPDATE ${table} SET ${column}=${column}||' ';`,'label_after_writer');
  assert.equal((await holder.done).code,0);assert.equal((await writer.done).code,0);assert.notEqual(receipt(g.uri)[0].state,'verified');results.push({case:`approve_before_writer_${table}`,pass:true});
 }
 const h=await fresh('aba');assert.equal((await push(h)).status,0);psql(h.uri,approve(review(h.uri).revision));psql(h.uri,"UPDATE product_ingredient_label_sets SET raw_label_text='temporary';UPDATE product_ingredient_label_sets SET raw_label_text='닭고기, 대두'");assert.equal(receipt(h.uri)[0].state,'stale');results.push({case:'ABA_revision_trigger',pass:true});
 for(const stage of ['ddl','ledger_before','ledger_after']){
  const x=await fresh(stage);
  if(stage==='ddl')psql(x.uri,"CREATE FUNCTION fail_candidate_ddl() RETURNS event_trigger LANGUAGE plpgsql AS $$ BEGIN IF to_regclass('public.ingredient_label_comparisons') IS NOT NULL THEN RAISE EXCEPTION 'synthetic ddl failure';END IF;END $$;CREATE EVENT TRIGGER fail_label_ddl ON ddl_command_end WHEN TAG IN ('CREATE TABLE') EXECUTE FUNCTION fail_candidate_ddl();");
  else psql(x.uri,`CREATE FUNCTION fail_candidate_ledger() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RAISE EXCEPTION 'synthetic ledger failure';END$$;CREATE TRIGGER fail_label_ledger ${stage==='ledger_before'?'BEFORE':'AFTER'} INSERT ON supabase_migrations.schema_migrations FOR EACH ROW EXECUTE FUNCTION fail_candidate_ledger();`);
  const answer=await push(x);assert.notEqual(answer.status,0);const st=state(x.uri);assert.equal(st.objects,0);assert.equal(st.ledger,0);results.push({case:stage+'_rollback',pass:true});
 }
 const auditFailure=await fresh('audit_failure');assert.equal((await push(auditFailure)).status,0);
 psql(auditFailure.uri,"CREATE FUNCTION fail_label_audit() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RAISE EXCEPTION 'synthetic audit failure';END$$;CREATE TRIGGER fail_label_audit BEFORE INSERT ON admin_audit_log FOR EACH ROW EXECUTE FUNCTION fail_label_audit();");
 const failedApproval=run('psql',['-X','-q','-v','ON_ERROR_STOP=1','--dbname',auditFailure.uri,'-c',approve(review(auditFailure.uri).revision)]);
 assert.notEqual(failedApproval.status,0);assert.deepEqual(business(auditFailure.uri),{evidence:0,audit:0});results.push({case:'approval_audit_failure_atomic',pass:true});
 const lock=await fresh('lock_timeout');const holder=await session(lock.uri,'BEGIN;LOCK TABLE products IN ACCESS EXCLUSIVE MODE;SELECT pg_sleep(5);COMMIT;','label_ddl_lock');await asleep(lock.uri,'label_ddl_lock');assert.notEqual((await push(lock)).status,0);await holder.done;assert.equal(state(lock.uri).objects,0);assert.equal(state(lock.uri).ledger,0);results.push({case:'migration_lock_timeout_rollback',pass:true});
 const approvalLock=await session(h.uri,'BEGIN;LOCK TABLE products IN ROW EXCLUSIVE MODE;SELECT pg_sleep(5);COMMIT;','label_approval_lock');await asleep(h.uri,'label_approval_lock');const before=business(h.uri);const ans=run('psql',['-X','-q','-v','ON_ERROR_STOP=1','--dbname',h.uri,'-c',approve(review(h.uri).revision)]);assert.notEqual(ans.status,0);await approvalLock.done;assert.deepEqual(business(h.uri),before);results.push({case:'approval_lock_timeout_no_partial_write',pass:true});
 await writeFile(join(output,'results.json'),JSON.stringify({passed:true,cli:'2.118.0',postgres:'17',candidate:name,sha256,seeds:[],roles:[],results,limits:['Loopback trust-auth synthetic only','Same CLI executor as linked release; --db-url instead of operating --linked','No operating linked dry-run or live approval']},null,2));console.log(`PASS actual PostgreSQL/CLI: ${results.length} cases, no operating connection`);
}finally{for(const db of databases)psql(admin.href,`DROP DATABASE ${db} WITH(FORCE)`);}
