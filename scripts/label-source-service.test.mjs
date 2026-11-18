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
   const signatures={admin_get_label_source_workspace:['p_product_id'],admin_register_label_source:['p_product_id','p_revision','p_label_set_id','p_payload','p_actor'],admin_get_label_item_workspace:['p_product_id'],admin_search_label_item_candidates:['p_query'],admin_review_label_item_match:['p_product_id','p_revision','p_item_id','p_decision','p_target_kind','p_target_id','p_target_revision','p_reason','p_actor'],admin_get_label_comparison_review:['p_product_id'],admin_approve_label_comparison:['p_product_id','p_revision','p_item_ids','p_observation','p_actor']};
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
 await db.exec('ALTER TABLE product_ingredient_label_sets ADD COLUMN captured_at timestamptz;CREATE UNIQUE INDEX idx_product_ingredient_label_sets_one_current ON product_ingredient_label_sets(product_id) WHERE is_current');const oldSnapshot=(await db.query('SELECT private.label_review_snapshot($1) s',[fixture.PRODUCT])).rows[0].s;await db.exec(readFileSync('supabase/migrations/20261116090000_admin_label_source_registration.sql','utf8'));assert.deepEqual((await db.query('SELECT private.label_review_snapshot($1) s',[fixture.PRODUCT])).rows[0].s,oldSnapshot);
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

const payload=()=>({rawText:'닭고기, 대두',sourceType:'package_image',sourceReference:'package:synthetic-front-back',observedAt:'2026-01-01T00:00:00Z',identityNotes:'Synthetic exact flavour weight pack',reason:'Complete raw source replacement',items:[{rawText:'닭고기',section:'ingredients'},{rawText:'대두',section:'ingredients'}],stage:'draft',holdReason:''});
async function source(){return (await request('getLabelSourceWorkspace')).body.result;}
async function register(p=payload(),extra={}){const w=await source();return request('registerIngredientLabelSource',{revision:w.review.revision,labelSetId:w.review.snapshot.labels[0]?.id??null,payload:p,...extra});}
async function fullState(){return (await db.query("SELECT jsonb_build_object('labels',(SELECT jsonb_agg(to_jsonb(l) ORDER BY id) FROM product_ingredient_label_sets l),'source',(SELECT jsonb_agg(to_jsonb(r) ORDER BY id) FROM private.label_source_registrations r),'items',(SELECT jsonb_agg(to_jsonb(i) ORDER BY id) FROM product_ingredient_label_items i),'audit',(SELECT jsonb_agg(to_jsonb(a) ORDER BY id) FROM admin_audit_log a)) result")).rows[0].result;}
it('register -> individually match -> whole review -> public verified -> replace invalidates and preserves old history',async()=>{
 const before=await fullState();const r=await register();assert.equal(r.http,200,JSON.stringify(r));
 let w=await source();if(process.env.LABEL_CONSUMER_CHECK==='1')assert.notEqual((await status(await publicRead(await mappedPublic()))).status,'ready');const label=w.review.snapshot.labels[0];assert.equal(label.raw,payload().rawText);assert.equal(w.review.eligible,false);assert.equal(label.items.length,2);
 for(const i of label.items){assert.equal(i.match,'unreviewed');assert.equal(i.legacy,null);assert.equal(i.canonical,null);const c=(await candidates(i.raw)).find(x=>x.kind==='legacy');const current=await workspace();assert.equal((await request('reviewLabelItemMatch',{revision:current.review.revision,itemId:i.id,decision:'match',reason:'Synthetic source identity reviewed',targetKind:c.kind,targetId:c.id,targetRevision:c.revision})).http,200);}
 w=await source();assert.equal(w.review.eligible,true);
 const a=await request('approveIngredientLabelReview',{revision:w.review.revision,reviewedItemIds:w.review.snapshot.labels[0].items.map(i=>i.id),...fixture.observation});assert.equal(a.http,200,JSON.stringify(a));assert.equal((await publicReceipt()).state,'verified');if(process.env.LABEL_CONSUMER_CHECK==='1')assert.equal((await status(await publicRead(await mappedPublic()))).status,'ready');
 assert.doesNotMatch(JSON.stringify(await publicReceipt()),/synthetic-front-back|identityNotes|synthetic-admin|payload|sourceRegistration/);
 const p=payload();p.rawText+='\n';p.reason='New photograph explicitly reviewed';assert.equal((await register(p)).http,200);assert.notEqual((await publicReceipt()).state,'verified');assert.equal((await source()).review.eligible,false);if(process.env.LABEL_CONSUMER_CHECK==='1')assert.notEqual((await status(await publicRead(await mappedPublic()))).status,'ready');
 const after=await fullState();assert.equal(after.labels.filter(l=>l.is_current).length,1);assert.equal(after.labels.length,before.labels.length+2);assert.equal(after.source.length,2);assert.equal(after.audit.filter(a=>a.action==='registerIngredientLabelSource').length,2);
 for(const old of before.items)assert.deepEqual(after.items.find(i=>i.id===old.id),old);
});
it('first label works without legacy raw; original Unicode newlines repeats compounds retained',async()=>{
 await db.exec('UPDATE product_ingredient_label_sets SET is_current=false');
 const p=payload();p.rawText='닭고기(육수, 간), 닭고기(육수, 간)\n대두';p.items=[{rawText:'닭고기(육수, 간)',section:'ingredients'},{rawText:'닭고기(육수, 간)',section:'ingredients'},{rawText:'대두',section:'additives'}];
 assert.equal((await register(p)).http,200);assert.equal((await source()).review.snapshot.labels[0].raw,p.rawText);assert.deepEqual((await source()).review.snapshot.labels[0].items.map(i=>i.raw),p.items.map(i=>i.rawText));
});
it('held malformed/unresolved draft cannot become eligible or inherit prior approval',async()=>{
 const p=payload();p.rawText='닭고기(미확인';p.stage='held';p.holdReason='Package damaged, missing portion';p.items=[{rawText:'닭고기(미확인',section:'unresolved'}];assert.equal((await register(p)).http,200);
 const label=(await source()).review.snapshot.labels[0];await db.exec(`UPDATE product_ingredient_label_items SET match_status='matched',legacy_ingredient_id='${fixture.ITEMS[0]}' WHERE label_set_id='${label.id}'`);assert.equal((await source()).review.eligible,false);
 assert.equal((await request('approveIngredientLabelReview',{revision:(await source()).review.revision,reviewedItemIds:label.items.map(i=>i.id),...fixture.observation})).http,400);
});
it('non-admin/direct anon/authenticated and unknown completion claims rejected without writes',async()=>{
 const before=await fullState();assert.equal((await request('registerIngredientLabelSource',{},false)).http,401);
 for(const p of [{...payload(),reviewed:true},{...payload(),items:[{rawText:'닭고기',section:'ingredients',canonicalId:fixture.ITEMS[0]}]},{...payload(),rawText:'닭고기(미확인'},{...payload(),sourceReference:'https://example.invalid/file?token=synthetic'}])assert.equal((await register(p)).http,400);
 for(const role of ['anon','authenticated']){await db.exec(`SET ROLE ${role}`);await assert.rejects(db.query('SELECT admin_get_label_source_workspace($1)',[fixture.PRODUCT]),{code:'42501'});await assert.rejects(db.query('SELECT * FROM private.label_source_registrations'),{code:'42501'});await db.exec('RESET ROLE');}
 assert.deepEqual(await fullState(),before);
});
it('stale/foreign label conflict; same state at fresh revision no-op; old retry is conflict',async()=>{
 const w=await source();const input={revision:w.review.revision,labelSetId:w.review.snapshot.labels[0].id,payload:payload()};assert.equal((await request('registerIngredientLabelSource',input)).http,200);const stable=await fullState();assert.equal((await request('registerIngredientLabelSource',input)).http,409);assert.equal((await register()).body.result.status,'unchanged');assert.deepEqual(await fullState(),stable);
 assert.equal((await register(payload(),{labelSetId:fixture.LABEL})).http,409);assert.deepEqual(await fullState(),stable);
});
it('audit failure rolls back transition, new rows, items, holds and source history',async()=>{
 await db.exec("CREATE FUNCTION reject_source_audit() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RAISE EXCEPTION 'synthetic audit failure'; END$$;CREATE TRIGGER reject_source_audit BEFORE INSERT ON admin_audit_log FOR EACH ROW EXECUTE FUNCTION reject_source_audit()");const before=await fullState();assert.equal((await register()).http,503);assert.deepEqual(await fullState(),before);
});

it('oversized and malformed bracket draft is held without crashing or losing raw text',async()=>{
 const p=payload();p.rawText=Array.from({length:101},()=> '닭고기').join(', ');p.stage='held';p.holdReason='Too many entries for parser; preserve source for review';p.items=[];assert.equal((await register(p)).http,200);assert.equal((await source()).review.snapshot.labels[0].raw,p.rawText);assert.equal((await source()).review.eligible,false);
 const malformed=payload();malformed.rawText='닭고기【닫히지 않음';malformed.items=[{rawText:malformed.rawText,section:'ingredients'}];assert.equal((await register(malformed)).http,400);
});

// Reuse the synthetic main-branch adapter; no #122 production code is copied.
async function mappedPublic(){const current=(await request('getIngredientLabelReview')).body.review.snapshot;const label=current.labels[0];const row={id:fixture.PRODUCT,name:current.product[1],brand_name:current.product[2],variant_name:current.product[3],net_weight_text:current.product[4],barcode:current.product[5],target_pet_type:current.product[6],target_life_stage:current.product[7],product_type:current.product[8],formulation:current.product[9],analysis_status:'ready',product_ingredient_label_sets:[{id:label.id,is_current:true,product_ingredient_label_items:label.items.map(i=>({display_order:i.order,raw_ingredient_text:i.raw,match_status:i.match,ingredients:i.resolvedDefinition}))}]};
 const mapper=(await load('src/lib/supabaseRowTypes.ts')).namespace;return mapper.mapProductFromSupabaseRow(row);}
async function publicRead(product){const reader=(await load('src/lib/labelComparisonRead.ts')).namespace;return (await reader.loadLabelComparisons([product],async ids=>({data:(await db.query('SELECT get_public_label_comparison($1::uuid[]) result',[ids])).rows[0].result,error:null})))[0];}
async function status(product){return (await load('src/analysis/analysisReadiness.ts')).namespace.productAnalysisReadiness(product);}

it('server foundation absent is unavailable, never an absent raw label or successful registration',async()=>{
 const before=await fullState();await db.exec('DROP FUNCTION public.admin_get_label_source_workspace(uuid)');const read=await request('getLabelSourceWorkspace');assert.equal(read.http,503);assert.equal(read.body.ok,undefined);assert.deepEqual(await fullState(),before);
});

it('migration rejects a same-named unique index on a different table',async()=>{
 const before=await fullState();await db.exec('ALTER INDEX idx_product_ingredient_label_sets_one_current RENAME TO fixture_preserved_current;CREATE TABLE source_index_lookalike(product_id uuid,is_current boolean);CREATE UNIQUE INDEX idx_product_ingredient_label_sets_one_current ON source_index_lookalike(product_id) WHERE is_current');
 await assert.rejects(db.exec(readFileSync('supabase/migrations/20261116090000_admin_label_source_registration.sql','utf8')),/expected one-current-label unique index required/);assert.deepEqual(await fullState(),before);
});

// Local synthetic UPDATE represents another authorized identity-writing path.
// It is never an operating request and does not replace normal admin mutation tests.
it('registered source -> reviewed mappings -> public proof -> changed option withholds without deleting history', {skip:process.env.LABEL_CONSUMER_CHECK!=='1'},async()=>{
 assert.equal((await register()).http,200);
 const label=(await source()).review.snapshot.labels[0];
 for(const i of label.items){const c=(await candidates(i.raw)).find(x=>x.kind==='legacy');const w=await source();assert.equal((await request('reviewLabelItemMatch',{revision:w.review.revision,itemId:i.id,decision:'match',reason:'Synthetic package-to-definition comparison',targetKind:c.kind,targetId:c.id,targetRevision:c.revision})).http,200);}
 const w=await source();assert.equal((await request('approveIngredientLabelReview',{revision:w.review.revision,reviewedItemIds:w.review.snapshot.labels[0].items.map(i=>i.id),...fixture.observation})).http,200);
 const cached=await publicRead(await mappedPublic());assert.equal((await status(cached)).status,'ready');
 const before=await fullState();const evidence=(await db.query('SELECT jsonb_agg(to_jsonb(e) ORDER BY id) rows FROM ingredient_label_comparisons e')).rows[0].rows;
 await db.query('UPDATE products SET variant_name=$1 WHERE id=$2',['Synthetic different option',fixture.PRODUCT]);
 // Even before refetch, an old receipt cannot authorize a newly changed identity.
 assert.notEqual((await status({...cached,variantName:'Synthetic different option'})).status,'ready');
 const receipt=await publicReceipt();assert.equal(receipt.state,'stale');
 const fresh=await publicRead(await mappedPublic());assert.notEqual((await status(fresh)).status,'ready');
 assert.deepEqual(await fullState(),before);assert.deepEqual((await db.query('SELECT jsonb_agg(to_jsonb(e) ORDER BY id) rows FROM ingredient_label_comparisons e')).rows[0].rows,evidence);
});
