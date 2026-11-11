import assert from 'node:assert/strict';
import { beforeEach, afterEach, it } from 'node:test';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { createHmac, webcrypto } from 'node:crypto';
import { SourceTextModule, SyntheticModule, createContext } from 'node:vm';
import ts from 'typescript';
import { PGlite } from '@electric-sql/pglite';

// Actual auth/router/shared parser/SQL/public receipt. Only Deno serve,
// SDK transport and minimal schema are substituted. No network or operating data.
const root = new URL('../', import.meta.url);
const secret = 'synthetic-local-only-secret';
let db, handler, fixture, load;
beforeEach(async () => {
 const context=createContext({Request,Response,URL,TextEncoder,TextDecoder,atob,btoa,console,structuredClone,
   crypto:webcrypto, Deno:{env:{get:k=>({SUPABASE_URL:'https://fixture.invalid',SUPABASE_SERVICE_ROLE_KEY:'synthetic-key',ADMIN_SESSION_SECRET:secret})[k]}},
   fetch:()=>{throw new Error('Network forbidden');}});
 const ext=(exports)=>new SyntheticModule(Object.keys(exports),function(){for(const [k,v] of Object.entries(exports))this.setExport(k,v);},{context});
 const http=ext({serve:fn=>{handler=fn;}});
 const sdk=ext({createClient:()=>({rpc:async(name,args)=>{
   const signatures={admin_get_label_comparison_review:['p_product_id'],admin_approve_label_comparison:['p_product_id','p_revision','p_item_ids','p_observation','p_actor']};
   assert.ok(signatures[name]);
   const params=signatures[name].map(k=>typeof args[k]==='object'?JSON.stringify(args[k]):args[k]);
   await db.exec('SET ROLE service_role');
   try {return {data:(await db.query(`SELECT public.${name}(${params.map((_,i)=>`$${i+1}`).join(',')}) result`,params)).rows[0].result,error:null};}
   catch(error){return {data:null,error:{code:error.code}};}
   finally{await db.exec('RESET ROLE');}
 }})});
 const cache=new Map();
 load=async(file)=>{
   const url=new URL(file,root);if(!/\.[a-z]+$/.test(url.pathname))url.pathname+='.ts';
   const key=url.href;
   if(!cache.has(key))cache.set(key,readFile(url,'utf8').then(source=>new SourceTextModule(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText,{context,identifier:key})));
   return cache.get(key);
 };
 const link=(name,parent)=>{
   if(name.startsWith('https://deno.land/'))return http;
   if(name.startsWith('https://esm.sh/'))return sdk;
   if(name==='@electric-sql/pglite')return ext({PGlite});
   if(name==='node:fs')return ext({readFileSync});
   assert.ok(name.startsWith('.'),`Unsupported module ${name}`);
   return load(new URL(name,parent.identifier));
 };
 const f=await load('tests/label-review/database.ts');await f.link(link);await f.evaluate();fixture=f.namespace;db=await fixture.labelReviewDatabase();
 const edge=await load('supabase/functions/admin-write/index.ts');await edge.link(link);await edge.evaluate();
 // Share the same linker/cache for actual public modules.
 const originalLoad=load;load=async(file)=>{const m=await originalLoad(file);if(m.status==='unlinked')await m.link(link);if(m.status==='linked')await m.evaluate();return m;};
});
afterEach(async()=>{await db.close();});
function token(){const payload=Buffer.from(JSON.stringify({actor:'synthetic-admin',exp:Math.floor(Date.now()/1000)+120})).toString('base64url');const message=`v1.${payload}`;return `${message}.${createHmac('sha256',secret).update(message).digest('base64url')}`;}
async function request(action,body={},authenticated=true){const response=await handler(new Request('https://fixture.invalid/functions/v1/admin-write',{method:'POST',headers:{'content-type':'application/json',...(authenticated?{'x-admin-token':token()}:{})},body:JSON.stringify({action,productId:fixture.PRODUCT,...body})}));return {http:response.status,body:await response.json()};}
async function approval(extra={}){const current=await request('getIngredientLabelReview');assert.equal(current.http,200);const review=current.body.review;return request('approveIngredientLabelReview',{revision:review.revision,reviewedItemIds:JSON.parse(JSON.stringify(fixture.ITEMS)),...fixture.observation,...extra});}
async function counts(){return (await db.query('SELECT (SELECT count(*)::int FROM ingredient_label_comparisons) evidence,(SELECT count(*)::int FROM admin_audit_log) audit')).rows[0];}
async function publicReceipt(){return (await db.query('SELECT get_public_label_comparison(ARRAY[$1::uuid]) result',[fixture.PRODUCT])).rows[0].result[0];}
it('normal auth -> server review -> atomic storage/audit -> sanitized public status',async()=>{
 assert.equal((await approval()).body.result.status,'approved');assert.deepEqual(await counts(),{evidence:1,audit:1});
 const receipt=await publicReceipt();assert.equal(receipt.state,'verified');
 assert.doesNotMatch(JSON.stringify(receipt),/synthetic-admin|fixture:source|identityNotes|coverageNotes|raw_label_text/);
 const recheck=await request('getIngredientLabelReview');assert.equal(recheck.body.review.approvalState,'verified');assert.equal(recheck.body.review.auditRecorded,true);
 assert.equal((await approval()).body.result.status,'already_reviewed');assert.deepEqual(await counts(),{evidence:1,audit:1});
});
it('denies non-admin approval before database reads',async()=>{assert.equal((await request('approveIngredientLabelReview',{},false)).http,401);assert.deepEqual(await counts(),{evidence:0,audit:0});});
it('does not accept client flags/hash as coverage when an original item is omitted',async()=>{await db.query('DELETE FROM product_ingredient_label_items WHERE id=$1',[fixture.ITEMS[1]]);const result=await approval({reviewedItemIds:[fixture.ITEMS[0]],snapshot:{complete:true},hash:'client-claim'});assert.equal(result.http,400);assert.deepEqual(await counts(),{evidence:0,audit:0});});
for(const match of ['unmatched','unreviewed','ambiguous'])it(`rejects ${match}`,async()=>{await db.query('UPDATE product_ingredient_label_items SET match_status=$1 WHERE id=$2',[match,fixture.ITEMS[1]]);assert.equal((await approval()).http,400);assert.deepEqual(await counts(),{evidence:0,audit:0});});
it('rejects stale approval and leaves both evidence and audit unchanged',async()=>{const current=(await request('getIngredientLabelReview')).body.review;await db.exec("UPDATE products SET name='New package'");assert.equal((await request('approveIngredientLabelReview',{revision:current.revision,...fixture.observation,reviewedItemIds:JSON.parse(JSON.stringify(fixture.ITEMS))})).http,409);assert.deepEqual(await counts(),{evidence:0,audit:0});});
for(const sql of ["UPDATE products SET name='Changed'","UPDATE product_ingredient_label_sets SET raw_label_text='Changed'","UPDATE product_ingredient_label_items SET raw_ingredient_text='Changed'","UPDATE ingredients SET risk_level='danger'"])it(`invalidates approved snapshot: ${sql.split(' SET')[0]}`,async()=>{assert.equal((await approval()).http,200);await db.exec(sql);assert.notEqual((await publicReceipt()).state,'verified');assert.deepEqual(await counts(),{evidence:1,audit:1});});
it('allows compound labels and repeated names with separate stable item IDs',async()=>{await db.exec("UPDATE product_ingredient_label_sets SET raw_label_text='단백질(닭고기, 연어), 단백질(닭고기, 연어)'; UPDATE product_ingredient_label_items SET raw_ingredient_text='단백질(닭고기, 연어)'");assert.equal((await approval()).http,200);assert.equal((await publicReceipt()).state,'verified');});
it('audit failure rolls back the approved evidence in the same function call',async()=>{await db.exec("CREATE FUNCTION fail_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic audit failure'; END $$; CREATE TRIGGER fail_audit BEFORE INSERT ON admin_audit_log FOR EACH ROW EXECUTE FUNCTION fail_audit()");assert.equal((await approval()).http,503);assert.deepEqual(await counts(),{evidence:0,audit:0});});
it('aggregate-only rollout preflight exposes counts, not product/source text',async()=>{
 const sql=readFileSync(new URL('../docs/sql/label-evidence-rollout-counts.sql',import.meta.url),'utf8');
 const rows=await db.query(sql);const result=rows.rows[0].label_evidence_rollout_counts;
 assert.equal(result.stored_ready,1);assert.equal(result.stored_ready_withheld,1);assert.equal(result.no_approval,1);
 assert.doesNotMatch(JSON.stringify(result),/Synthetic|fixture:|00000000/);
});

it('does not approve a flag/hash-only request with no new review observation',async()=>{
 const result=await approval({sourceReference:'',identityNotes:'',coverageNotes:'',hash:'client-assertion'});
 assert.equal(result.http,400);assert.deepEqual(await counts(),{evidence:0,audit:0});
});

it('invalidates a changed target species even if an old updated_at is retained',async()=>{
 assert.equal((await approval()).http,200);await db.exec("UPDATE products SET target_pet_type='cat'");
 assert.equal((await publicReceipt()).state,'stale');assert.deepEqual(await counts(),{evidence:1,audit:1});
});
it('does not reuse approval after an ABA edit with restored timestamps',async()=>{
 assert.equal((await approval()).http,200);
 await db.exec("UPDATE product_ingredient_label_sets SET raw_label_text='temporary'; UPDATE product_ingredient_label_sets SET raw_label_text='닭고기, 대두'");
 assert.notEqual((await publicReceipt()).state,'verified');
});
it('does not publish pending status when optional verified-only mode is disabled',async()=>{
 await db.exec("UPDATE products SET verification_status='pending'");
 for(const role of ['anon','authenticated']) {
  await db.exec(`SET ROLE ${role}`);
  const rows=(await db.query('SELECT get_public_label_comparison(ARRAY[$1::uuid]) result',[fixture.PRODUCT])).rows[0].result;
  assert.deepEqual(rows,[]);await db.exec('RESET ROLE');
 }
});
it('invalidates canonical definition ABA through the shared writer trigger',async()=>{
 await db.query("INSERT INTO canonical_ingredients(id,legacy_ingredient_id,canonical_name_ko,status) VALUES($1,$1,'닭고기','active')",[fixture.ITEMS[0]]);
 await db.query('UPDATE product_ingredient_label_items SET canonical_ingredient_id=$1 WHERE id=$1',[fixture.ITEMS[0]]);
 assert.equal((await approval()).http,200);
 await db.exec("UPDATE canonical_ingredients SET canonical_name_ko='임시';UPDATE canonical_ingredients SET canonical_name_ko='닭고기'");
 assert.equal((await publicReceipt()).state,'stale');
});

it('rollout counts null-status fallback eligibility instead of only stored ready',async()=>{
 await db.exec('UPDATE products SET analysis_status=NULL');
 const sql=readFileSync(new URL('../docs/sql/label-evidence-rollout-counts.sql',import.meta.url),'utf8');
 let result=(await db.query(sql)).rows[0].label_evidence_rollout_counts;
 assert.equal(result.stored_ready,0);assert.equal(result.baseline_ready_candidates,1);assert.equal(result.baseline_ready_withheld,1);
 assert.equal((await approval()).http,200);
 result=(await db.query(sql)).rows[0].label_evidence_rollout_counts;
 assert.equal(result.baseline_ready_current_proof,1);assert.equal(result.baseline_ready_withheld,0);
 assert.doesNotMatch(JSON.stringify(result),/Synthetic|fixture:|00000000/);
});
