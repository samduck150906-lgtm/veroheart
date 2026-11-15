import assert from 'node:assert/strict';
import {automaticMatchingFixtureSQL} from './label-matching-automatic-fixture.mjs';
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
   const signatures={admin_get_label_item_workspace:['p_product_id'],admin_search_label_item_candidates:['p_query'],admin_review_label_item_match:['p_product_id','p_revision','p_item_id','p_decision','p_target_kind','p_target_id','p_target_revision','p_reason','p_actor'],admin_get_label_comparison_review:['p_product_id'],admin_approve_label_comparison:['p_product_id','p_revision','p_item_ids','p_observation','p_actor']};
   assert.ok(signatures[name]);
   const params=signatures[name].map(k=>args[k]!==null&&typeof args[k]==='object'?JSON.stringify(args[k]):args[k]);
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
 const f=await load('tests/label-review/database.ts');await f.link(link);await f.evaluate();fixture=f.namespace;db=await fixture.labelReviewDatabase();await db.exec(readFileSync('tests/label-item-matching/fixture.sql','utf8'));await db.exec(automaticMatchingFixtureSQL());await db.exec(readFileSync('supabase/migrations/20261111150000_restrict_label_evidence_sequence.sql','utf8'));await db.exec('ALTER DEFAULT PRIVILEGES GRANT ALL ON TABLES TO anon,authenticated,service_role;ALTER DEFAULT PRIVILEGES GRANT ALL ON SEQUENCES TO anon,authenticated,service_role;ALTER DEFAULT PRIVILEGES GRANT ALL ON FUNCTIONS TO anon,authenticated,service_role');await db.exec(readFileSync('supabase/migrations/20261114090000_admin_label_item_matching.sql','utf8'));
 const edge=await load('supabase/functions/admin-write/index.ts');await edge.link(link);await edge.evaluate();
 // Share the same linker/cache for actual public modules.
 const originalLoad=load;load=async(file)=>{const m=await originalLoad(file);if(m.status==='unlinked')await m.link(link);if(m.status==='linked')await m.evaluate();return m;};
});
afterEach(async()=>{await db.close();});
function token(actor='synthetic-admin'){const payload=Buffer.from(JSON.stringify({actor,exp:Math.floor(Date.now()/1000)+120})).toString('base64url');const message=`v1.${payload}`;return `${message}.${createHmac('sha256',secret).update(message).digest('base64url')}`;}
async function request(action,body={},authenticated=true){const response=await handler(new Request('https://fixture.invalid/functions/v1/admin-write',{method:'POST',headers:{'content-type':'application/json',...(authenticated?{'x-admin-token':token()}:{})},body:JSON.stringify({action,...(action==='searchLabelItemCandidates'?{}:{productId:fixture.PRODUCT}),...body})}));return {http:response.status,body:await response.json()};}
async function approval(extra={}){const current=await request('getIngredientLabelReview');assert.equal(current.http,200);const review=current.body.review;return request('approveIngredientLabelReview',{revision:review.revision,reviewedItemIds:JSON.parse(JSON.stringify(fixture.ITEMS)),...fixture.observation,...extra});}
async function counts(){return (await db.query('SELECT (SELECT count(*)::int FROM ingredient_label_comparisons) evidence,(SELECT count(*)::int FROM admin_audit_log) audit')).rows[0];}
async function publicReceipt(){return (await db.query('SELECT get_public_label_comparison(ARRAY[$1::uuid]) result',[fixture.PRODUCT])).rows[0].result[0];}

async function workspace(){const r=await request('getLabelItemWorkspace');assert.equal(r.http,200);return r.body.result;}
async function candidates(query='닭'){const r=await request('searchLabelItemCandidates',{query});assert.equal(r.http,200);return r.body.result;}
async function decide(item=fixture.ITEMS[0],decision='match',extra={}){
 const w=await workspace();const c=(await candidates(item===fixture.ITEMS[1]?'대두':'닭')).find(c=>c.kind==='legacy');
 return request('reviewLabelItemMatch',{revision:w.review.revision,itemId:item,decision,reason:'synthetic source comparison',...(decision==='match'?{targetKind:c.kind,targetId:c.id,targetRevision:c.revision}:{}),...extra});
}
async function state(){return (await db.query("SELECT jsonb_build_object('items',(SELECT jsonb_agg(to_jsonb(i) ORDER BY id) FROM product_ingredient_label_items i),'epochs',(SELECT jsonb_agg(to_jsonb(g) ORDER BY product_id) FROM private.ingredient_label_revisions g),'decisions',(SELECT count(*) FROM private.label_item_match_decisions),'evidence',(SELECT count(*) FROM ingredient_label_comparisons),'audit',(SELECT count(*) FROM admin_audit_log)) result")).rows[0].result;}
it('normal admin: unreviewed -> candidates -> hold/match -> explicit whole review -> sanitized public verified',async()=>{
 assert.equal((await workspace()).review.eligible,false);
 const oldRaw=(await db.query('SELECT id,raw_ingredient_text,display_order,amount_text,percentage FROM product_ingredient_label_items ORDER BY id')).rows;
 const choices=await candidates('닭 별칭');assert(choices.some(c=>c.kind==='canonical'&&c.selectable));
 assert.equal((await decide(fixture.ITEMS[0],'hold')).body.result.status,'saved');assert.equal((await publicReceipt()).state,'absent');
 assert.equal((await decide()).http,200);assert.equal((await decide(fixture.ITEMS[1])).http,200);
 assert.equal((await workspace()).review.eligible,true);assert.equal((await publicReceipt()).state,'absent');
 const approved=await approval();assert.equal(approved.http,200);assert.equal(approved.body.result.status,'approved');assert.equal((await publicReceipt()).state,'verified');
 assert.equal((await db.query('SELECT count(*)::int n FROM admin_audit_log')).rows[0].n,4);
 assert.equal((await db.query('SELECT count(*)::int n FROM private.label_item_match_decisions')).rows[0].n,3);
 assert.deepEqual((await db.query('SELECT id,raw_ingredient_text,display_order,amount_text,percentage FROM product_ingredient_label_items ORDER BY id')).rows,oldRaw);
 assert.doesNotMatch(JSON.stringify(await publicReceipt()),/synthetic source|synthetic-admin|reason|actor/);
});
it('rejects non-admin before reads and direct application RPC/private-table access',async()=>{
 assert.equal((await request('reviewLabelItemMatch',{},false)).http,401);
 for(const role of ['anon','authenticated']){await db.exec(`SET ROLE ${role}`);await assert.rejects(db.query('SELECT admin_get_label_item_workspace($1)',[fixture.PRODUCT]),{code:'42501'});await assert.rejects(db.query("SELECT admin_search_label_item_candidates('닭')"),{code:'42501'});await assert.rejects(db.query('SELECT * FROM private.label_item_match_decisions'),{code:'42501'});await db.exec('RESET ROLE');}
 assert.equal((await state()).audit,0);
});
it('denies foreign/missing items, unknown fields and completion claims without writes',async()=>{
 const before=await state();for(const extra of [{itemId:'00000000-0000-4000-8000-000000000099'},{rawLabel:'changed'},{reviewed:true},{actor:'injected'},{reason:''},{decision:'ignored'}])assert.equal((await decide(fixture.ITEMS[0],'match',extra)).http,400);
 assert.deepEqual(await state(),before);
});
it('stale source revision conflicts without replacing another decision',async()=>{
 const w=await workspace();assert.equal((await decide()).http,200);const before=await state();assert.equal((await decide(fixture.ITEMS[1],'match',{revision:w.review.revision})).http,409);assert.deepEqual(await state(),before);
});
it('candidate definition drift conflicts instead of silently accepting a changed dictionary row',async()=>{
 const c=(await candidates()).find(c=>c.kind==='legacy');await db.exec("UPDATE ingredients SET name_ko='새 이름' WHERE name_ko='닭고기'");const before=await state();assert.equal((await request('reviewLabelItemMatch',{revision:(await workspace()).review.revision,itemId:fixture.ITEMS[0],decision:'match',reason:'synthetic dictionary review',targetKind:c.kind,targetId:c.id,targetRevision:c.revision})).http,409);assert.deepEqual(await state(),before);
});
it('draft/retired canonical or missing resolved risk is not a usable candidate',async()=>{
 const choices=await candidates('대두');const draft=choices.find(c=>c.kind==='canonical');assert.equal(draft.selectable,false);const before=await state();assert.equal((await decide(fixture.ITEMS[0],'match',{targetKind:draft.kind,targetId:draft.id,targetRevision:draft.revision})).http,400);assert.deepEqual(await state(),before);
});
it('same-state current-revision repeat is no-op; old request revision conflicts, no permanent idempotency claim',async()=>{
 const old=(await workspace()).review.revision;assert.equal((await decide()).http,200);const before=await state();assert.equal((await decide()).body.result.status,'unchanged');assert.deepEqual(await state(),before);assert.equal((await decide(fixture.ITEMS[0],'match',{revision:old})).http,409);assert.deepEqual(await state(),before);
});
it('matching or hold invalidates old evidence and audit failure rolls back the source, epoch, decision and audit',async()=>{
 await decide();await decide(fixture.ITEMS[1]);await approval();assert.equal((await publicReceipt()).state,'verified');
 await db.exec("CREATE FUNCTION fail_matching_audit() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN IF NEW.action='reviewLabelItemMatch' THEN RAISE EXCEPTION 'synthetic audit failure';END IF;RETURN NEW;END$$;CREATE TRIGGER fail_matching_audit BEFORE INSERT ON admin_audit_log FOR EACH ROW EXECUTE FUNCTION fail_matching_audit()");
 const before=await state();assert.equal((await decide(fixture.ITEMS[0],'hold')).http,503);assert.deepEqual(await state(),before);assert.equal((await publicReceipt()).state,'verified');
 await db.exec('DROP TRIGGER fail_matching_audit ON admin_audit_log');assert.equal((await decide(fixture.ITEMS[0],'hold')).http,200);assert.equal((await publicReceipt()).state,'blocked');assert.equal((await workspace()).review.eligible,false);
});
it('keeps legitimate repeated and compound raw labels with distinct stable IDs',async()=>{
 await db.exec("UPDATE product_ingredient_label_sets SET raw_label_text='단백질(닭고기, 연어), 단백질(닭고기, 연어)';UPDATE product_ingredient_label_items SET raw_ingredient_text='단백질(닭고기, 연어)'");
 await decide();await decide(fixture.ITEMS[1]);assert.equal((await approval()).http,200);assert.equal((await publicReceipt()).state,'verified');
 assert.equal((await db.query('SELECT count(*)::int n FROM product_ingredient_label_items')).rows[0].n,2);
});
it('omitted raw item remains blocked even after every remaining stored item is matched',async()=>{
 await db.query('DELETE FROM product_ingredient_label_items WHERE id=$1',[fixture.ITEMS[1]]);await decide();assert.equal((await approval()).http,400);assert.equal((await state()).evidence,0);
});
it('multiple current labels cannot be silently resolved by matching',async()=>{
 await db.query("INSERT INTO product_ingredient_label_sets(id,product_id,raw_label_text,is_current) VALUES('00000000-0000-4000-8000-000000000055',$1,'별도 원문',true)",[fixture.PRODUCT]);const before=await state();assert.equal((await decide()).http,400);assert.deepEqual(await state(),before);
});

it('a changed rationale alone also invalidates previously verified comparison evidence',async()=>{
 await decide();await decide(fixture.ITEMS[1]);await approval();assert.equal((await publicReceipt()).state,'verified');
 assert.equal((await decide(fixture.ITEMS[0],'match',{reason:'new original-package observation'})).http,200);
 assert.equal((await publicReceipt()).state,'stale');
});

async function mappedPublic(){const current=(await request('getIngredientLabelReview')).body.review.snapshot;const label=current.labels[0];const row={id:fixture.PRODUCT,name:current.product[1],brand_name:current.product[2],product_type:'food',target_pet_type:'dog',analysis_status:'ready',product_ingredient_label_sets:[{id:label.id,is_current:true,product_ingredient_label_items:label.items.map(i=>({display_order:i.order,raw_ingredient_text:i.raw,match_status:i.match,ingredients:i.resolvedDefinition}))}]};
 const mapper=(await load('src/lib/supabaseRowTypes.ts')).namespace;return mapper.mapProductFromSupabaseRow(row);}
async function publicRead(product){const reader=(await load('src/lib/labelComparisonRead.ts')).namespace;return (await reader.loadLabelComparisons([product],async ids=>({data:(await db.query('SELECT get_public_label_comparison($1::uuid[]) result',[ids])).rows[0].result,error:null})))[0];}
async function status(product){return (await load('src/analysis/analysisReadiness.ts')).namespace.productAnalysisReadiness(product);}


it('temporary consumer integration: matching -> explicit approval -> ready -> hold blocks again', {skip:process.env.LABEL_CONSUMER_CHECK!=='1'},async()=>{
 await decide();await decide(fixture.ITEMS[1]);assert.notEqual((await status(await publicRead(await mappedPublic()))).status,'ready');
 assert.equal((await approval()).http,200);assert.equal((await status(await publicRead(await mappedPublic()))).status,'ready');
 await decide(fixture.ITEMS[0],'hold');assert.notEqual((await status(await publicRead(await mappedPublic()))).status,'ready');
});

it('creation under platform default grants leaves effective private/sequence/RPC rights minimal',async()=>{
 for(const role of ['anon','authenticated','service_role']){
  assert.equal((await db.query("SELECT has_table_privilege($1,'private.label_item_match_decisions','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') allowed",[role])).rows[0].allowed,false);
  assert.equal((await db.query("SELECT has_sequence_privilege($1,'ingredient_label_comparisons_sequence_seq','SELECT,USAGE,UPDATE') allowed",[role])).rows[0].allowed,false);
  const rs=(await db.query("SELECT has_function_privilege($1,p.oid,'EXECUTE') allowed FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('admin_get_label_item_workspace','admin_search_label_item_candidates','admin_review_label_item_match')",[role])).rows;assert.equal(rs.length,3);assert(rs.every(r=>r.allowed===(role==='service_role')));
 }
 assert.equal((await db.query("SELECT count(*)::int n FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='private' AND c.relkind='S' AND c.relname LIKE 'label_item_match%'")).rows[0].n,0);
});
it('retired or deleted canonical/dictionary targets and foreign label items cannot be selected',async()=>{
 const choice=(await candidates('닭')).find(c=>c.kind==='canonical');
 await db.query("UPDATE canonical_ingredients SET status='retired' WHERE id=$1",[choice.id]);const before=await state();
 assert.equal((await decide(fixture.ITEMS[0],'match',{targetKind:'canonical',targetId:choice.id,targetRevision:choice.revision})).http,400);assert.deepEqual(await state(),before);
 await db.exec("INSERT INTO products(id,name) VALUES('00000000-0000-4000-8000-000000000066','other synthetic'); INSERT INTO product_ingredient_label_sets(id,product_id,raw_label_text) VALUES('00000000-0000-4000-8000-000000000067','00000000-0000-4000-8000-000000000066','other'); INSERT INTO product_ingredient_label_items(id,label_set_id,display_order,raw_ingredient_text,match_status) VALUES('00000000-0000-4000-8000-000000000068','00000000-0000-4000-8000-000000000067',0,'other','unreviewed')");
 const unchanged=await state();assert.equal((await decide('00000000-0000-4000-8000-000000000068')).http,400);assert.deepEqual(await state(),unchanged);
 await db.query('DELETE FROM canonical_ingredients WHERE id=$1',[choice.id]);assert.equal((await decide(fixture.ITEMS[0],'match',{targetKind:'canonical',targetId:choice.id,targetRevision:choice.revision})).http,400);
 const legacy=(await candidates('닭')).find(c=>c.kind==='legacy');await db.query('DELETE FROM ingredients WHERE id=$1',[legacy.id]);
 assert.equal((await request('reviewLabelItemMatch',{revision:(await workspace()).review.revision,itemId:fixture.ITEMS[0],decision:'match',reason:'synthetic source',targetKind:'legacy',targetId:legacy.id,targetRevision:legacy.revision})).http,400);
});

it('explicit hold survives the current main automatic matcher and loses force only on source change',async()=>{
 assert.equal((await decide(fixture.ITEMS[0],'hold')).http,200);
 await db.query('UPDATE product_ingredient_label_items SET updated_at=clock_timestamp() WHERE id=$1',[fixture.ITEMS[0]]);
 let w=await workspace();assert.equal(w.review.snapshot.labels[0].items[0].match,'unreviewed');assert.equal(w.decisions[0].currentSource,true);
 assert.equal((await approval()).http,400);
 await db.exec("UPDATE product_ingredient_label_sets SET raw_label_text='닭고기 , 대두'");
 await db.query('UPDATE product_ingredient_label_items SET updated_at=clock_timestamp() WHERE id=$1',[fixture.ITEMS[0]]);
 w=await workspace();assert.equal(w.review.snapshot.labels[0].items[0].match,'matched');assert.equal(w.decisions[0].currentSource,false);
});

it('revoked QA actor cannot use new matching routes even with an otherwise valid signature',async()=>{
 const response=await handler(new Request('https://fixture.invalid/functions/v1/admin-write',{method:'POST',headers:{'content-type':'application/json','x-admin-token':token('qa-synthetic-revoked')},body:JSON.stringify({action:'getLabelItemWorkspace',productId:fixture.PRODUCT})}));
 assert.equal(response.status,401);assert.equal((await state()).audit,0);
});
