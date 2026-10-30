import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { before, after, beforeEach, describe, it } from 'node:test';
import { createHmac, webcrypto } from 'node:crypto';
import { SourceTextModule, SyntheticModule, createContext } from 'node:vm';
import ts from 'typescript';

// Optional module location supports a pinned, integrity-checked offline test install.
const { PGlite } = await import(process.env.PGLITE_TEST_MODULE ?? '@electric-sql/pglite');
const root = new URL('../', import.meta.url);
const product = '11111111-1111-4111-8111-111111111111';
const target = '22222222-2222-4222-8222-222222222222';
const seller = '33333333-3333-4333-8333-333333333333';
const link = '44444444-4444-4444-8444-444444444444';
const other = '55555555-5555-4555-8555-555555555555';
const identity = { brand: 'Fixture brand', line: 'Fixture line', flavor: 'salmon', unit_size: '12g',
  pack_count: '15', composition: '15 identical sachets', option: 'salmon 15', edition: 'v1' };
const secret = 'synthetic-purchase-link-session-secret';
let db, handler, normalize, calls;

function token() {
  const payload = Buffer.from(JSON.stringify({ actor: 'fixture-admin', exp: Math.floor(Date.now()/1000)+3600 })).toString('base64url');
  const msg = `v1.${payload}`;
  return `${msg}.${createHmac('sha256', secret).update(msg).digest('base64url')}`;
}

async function loadRouter() {
  const env = new Map([['SUPABASE_URL','https://fixture.invalid'],['SUPABASE_SERVICE_ROLE_KEY','synthetic-service'],['ADMIN_SESSION_SECRET',secret]]);
  const context = createContext({ Request, Response, URL, TextEncoder, TextDecoder, atob, btoa,
    crypto: webcrypto, console,
    Deno: { env: { get: (key) => env.get(key) } },
    fetch: () => { throw Error('No network allowed'); } });
  const http = new SyntheticModule(['serve'], function () { this.setExport('serve', (fn) => { handler=fn; }); }, { context });
  const sdk = new SyntheticModule(['createClient'], function () {
    this.setExport('createClient', () => ({ async rpc(name,args) {
      calls++;
      assert.equal(name,'admin_save_product_purchase_link');
      assert.equal(args.p_actor,'fixture-admin');
      try {
        await db.exec('SET ROLE service_role');
        const result = await db.query('SELECT public.admin_save_product_purchase_link($1::jsonb,$2) AS result',
          [JSON.stringify(args.p_input),args.p_actor]);
        return {data:result.rows[0].result,error:null};
      } catch(error) { return {data:null,error}; }
      finally { await db.exec('RESET ROLE'); }
    }}));
  }, { context });
  const modules = new Map();
  async function source(name) {
    if (!modules.has(name)) modules.set(name,(async()=>new SourceTextModule(ts.transpileModule(
      await readFile(new URL(`supabase/functions/admin-write/${name}`,root),'utf8'),
      {compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText,
    {context,identifier:name}))());
    return modules.get(name);
  }
  const router=await source('index.ts');
  await router.link(async (specifier) => {
    if (specifier.startsWith('https://deno.land/')) return http;
    if (specifier.startsWith('https://esm.sh/')) return sdk;
    return source(specifier.replace('./',''));
  });
  await router.evaluate();
  normalize=(await source('purchaseLinks.ts')).namespace.normalizePurchaseLinkRequest;
}

function payload(overrides={}) {
  return {id:link,product_id:product,expected_revision:0,merchant:'coupang',
    original_url:'https://link.coupang.com/a/fixture',resolved_url:'https://www.coupang.com/vp/products/100?itemId=200&vendorItemId=300',
    link_kind:'product',verification_status:'verified',seller_product_id:'100',seller_item_id:'200',seller_offer_id:'300',
    target_observation_id:target,seller_observation_id:seller,
    verification_valid_until:new Date(Date.now()+3600_000).toISOString(),availability:'unknown',
    availability_valid_until:null,hold_reason:null,...overrides};
}
async function request(input,auth=token()) {
  const response=await handler(new Request('https://fixture.invalid/functions/v1/admin-write',{
    method:'POST',headers:{'Content-Type':'application/json','x-admin-token':auth},
    body:JSON.stringify({action:'saveProductPurchaseLink',link:input})}));
  return {status:response.status,body:await response.json()};
}
async function snapshot() {
  const result={};
  for (const table of ['products','product_purchase_links','admin_audit_log'])
    result[table]=(await db.query(`SELECT * FROM public.${table} ORDER BY id`)).rows;
  return result;
}
async function publicRows(role='anon') {
  await db.exec(`SET ROLE ${role}`);
  try { return (await db.query('SELECT * FROM public.get_product_purchase_links($1)',[product])).rows; }
  finally { await db.exec('RESET ROLE'); }
}

describe('purchase-link real auth/router + draft PostgreSQL contract',()=>{
  before(async()=>{
    db=await PGlite.create();
    await db.exec(await readFile(new URL('scripts/fixtures/purchase-link-schema.sql',root),'utf8'));
    await db.exec(await readFile(new URL('supabase/migration_drafts/20261030090000_product_purchase_links.sql',root),'utf8'));
    await loadRouter();
  });
  after(async()=>{await db?.close();});
  beforeEach(async()=>{
    await db.exec(`ALTER TABLE public.admin_audit_log DROP CONSTRAINT IF EXISTS reject_audit;
      TRUNCATE public.products,public.product_observations,public.product_purchase_links,public.admin_audit_log CASCADE;
      CREATE OR REPLACE FUNCTION private.hide_unverified_products_enabled() RETURNS boolean LANGUAGE sql AS 'SELECT false';`);
    await db.query('INSERT INTO public.products(id,name,brand_name,is_visible,verification_status,coupang_link,unrelated) VALUES ($1,$2,$3,true,$4,$5,$6)',
      [product,'Fixture salmon 12g x 15','Fixture brand','pending','https://link.coupang.com/a/legacy','{"sentinel":true}']);
    await db.query(`INSERT INTO public.product_observations(id,product_id,source_url,raw_name,raw_brand,extracted_data)
      VALUES($1,$2,'https://brand.example/fixture','Fixture salmon 12g x 15','Fixture brand',$3),
        ($4,$2,$5,null,null,$6)`,[target,product,JSON.stringify({purchase_identity_v1:identity}),seller,payload().resolved_url,
      JSON.stringify({purchase_identity_v1:identity,link_kind:'product',seller_product_id:'100',seller_item_id:'200',seller_offer_id:'300',availability:'in_stock'})]);
    calls=0;
  });

  it('executes real session authentication before RPC; rejects missing/invalid token',async()=>{
    for(const auth of ['', 'invalid']) assert.equal((await request(payload(),auth)).status,401);
    assert.equal(calls,0); assert.equal((await snapshot()).admin_audit_log.length,0);
  });
  it('validates UUIDs, revision, fields and HTTPS merchant URLs without writes',async()=>{
    for(const patch of [{id:'bad'},{expected_revision:-1},{actor:'forged'},
      {original_url:'https://www.coupang.com.evil.test/x'},{original_url:'https://name:pass@www.coupang.com/x'},
      {resolved_url:'http://www.coupang.com/x'},{name:'overwrite'}])
      assert.equal((await request(payload(patch))).status,400);
    assert.equal(calls,0);
  });
  it('creates with atomic before/after audit and preserves all product columns',async()=>{
    const before=(await snapshot()).products;
    assert.equal((await request(payload())).body.result.status,'applied');
    const after=await snapshot();assert.deepEqual(after.products,before);
    assert.equal(after.admin_audit_log.length,1);
    assert.equal(after.admin_audit_log[0].detail.before,null);
    assert.equal(after.admin_audit_log[0].detail.after.original_url,payload().original_url);
    assert.equal(after.admin_audit_log[0].actor,'fixture-admin');
  });
  it('requires the destination URL to identify exactly the observed product/item/offer',async()=>{
    for(const url of [
      'https://www.coupang.com/np/search?q=fixture',
      'https://link.coupang.com/a/fixture',
      payload().resolved_url.replace('/100?', '/999?'),
      payload().resolved_url.replace('itemId=200', 'itemId=999'),
      payload().resolved_url+'&itemId=200',
      payload().resolved_url+'#other-option',
      payload().resolved_url+'\n',
    ]) assert.equal((await request(payload({resolved_url:url}))).status,400);
    assert.equal(calls,0);
    // A coherent but incorrect observation must not bypass the SQL URL/ID guard.
    const url=payload().resolved_url.replace('vendorItemId=300','vendorItemId=999');
    await db.query('UPDATE public.product_observations SET source_url=$1 WHERE id=$2',[url,seller]);
    await assert.rejects(db.query('SELECT public.admin_save_product_purchase_link($1,$2)',[
      JSON.stringify(payload({resolved_url:url})),'fixture-admin']));
    assert.equal((await snapshot()).admin_audit_log.length,0);
  });
  it('returns already_applied for identical retry and conflict for stale changed payload',async()=>{
    const input=payload();await request(input);const before=await snapshot();
    assert.equal((await request(input)).body.result.status,'already_applied');
    assert.equal((await request({...input,hold_reason:'changed'})).body.result.status,'conflict');
    assert.deepEqual(await snapshot(),before);
  });
  it('provides state-based retries, not a permanent replay receipt after an intervening change',async()=>{
    const original=payload();await request(original);
    await request({...original,expected_revision:1,hold_reason:'later review'});
    const before=await snapshot();
    assert.equal((await request(original)).body.result.status,'conflict');
    assert.deepEqual(await snapshot(),before);
    const current={...original,hold_reason:'later review'};
    assert.equal((await request(current)).body.result.status,'already_applied');
    assert.deepEqual(await snapshot(),before);
  });
  it('rolls the connection back when audit insertion fails',async()=>{
    await db.exec("ALTER TABLE public.admin_audit_log ADD CONSTRAINT reject_audit CHECK(action<>'saveProductPurchaseLink')");
    const before=await snapshot();assert.equal((await request(payload())).status,400);
    assert.deepEqual(await snapshot(),before);
  });
  it('also rolls back an existing connection update on audit failure',async()=>{
    const input=payload();await request(input);
    await db.exec("ALTER TABLE public.admin_audit_log ADD CONSTRAINT reject_audit CHECK(action<>'saveProductPurchaseLink') NOT VALID");
    const before=await snapshot();
    assert.equal((await request({...input,expected_revision:1,verification_status:'stale'})).status,400);
    assert.deepEqual(await snapshot(),before);
  });
  it('keeps search/unknown and existing legacy links unverified and out of public results',async()=>{
    assert.deepEqual(await publicRows(),[]);
    for(const kind of ['search','unknown']) {
      const input=payload({link_kind:kind,verification_status:'unverified'});
      if(kind==='unknown') input.expected_revision=1;
      assert.equal((await request(input)).body.result.status,'applied');
      assert.deepEqual(await publicRows(),[]);
    }
    assert.equal((await request(payload({link_kind:'search'}))).status,400);
  });
  it('rejects absent, foreign, changed-flavor and incomplete option evidence',async()=>{
    assert.equal((await request(payload({target_observation_id:null}))).status,400);
    assert.equal((await request(payload({seller_item_id:'999'}))).status,400);
    await db.query("UPDATE public.product_observations SET extracted_data=jsonb_set(extracted_data,'{purchase_identity_v1,flavor}','\"chicken\"') WHERE id=$1",[seller]);
    assert.equal((await request(payload())).status,400);
    await db.query("UPDATE public.product_observations SET extracted_data=jsonb_set(extracted_data,'{purchase_identity_v1,flavor}','\"unknown\"')",[]);
    assert.equal((await request(payload())).status,400);
    assert.equal((await snapshot()).admin_audit_log.length,0);
  });
  it('rejects a different pack, quantity, composition or option, even with identical seller IDs',async()=>{
    for(const [key,value] of [['unit_size','180g'],['pack_count','1'],['composition','mixed flavors'],['option','chicken 15']]) {
      const changed={...identity,[key]:value};
      await db.query("UPDATE public.product_observations SET extracted_data=jsonb_set(extracted_data,'{purchase_identity_v1}',$1) WHERE id=$2",[JSON.stringify(changed),seller]);
      assert.equal((await request(payload())).status,400);
    }
    assert.equal((await snapshot()).product_purchase_links.length,0);
  });
  it('rejects another product evidence and stale/future seller observations',async()=>{
    await db.query('INSERT INTO public.products(id,name,brand_name) VALUES($1,$2,$3)',[other,'Other','Fixture brand']);
    await db.query('UPDATE public.product_observations SET product_id=$1 WHERE id=$2',[other,seller]);
    assert.equal((await request(payload())).status,400);
    await db.query('UPDATE public.product_observations SET product_id=$1 WHERE id=$2',[product,seller]);
    for(const offset of ["-interval '2 days'","+interval '1 day'"]) {
      await db.exec(`UPDATE public.product_observations SET retrieved_at=now()${offset}`);
      assert.equal((await request(payload())).status,400);
    }
  });
  it('requires bounded future identity and availability expiry',async()=>{
    for(const until of [new Date(Date.now()-1000).toISOString(),new Date(Date.now()+2*86400_000).toISOString()])
      assert.equal((await request(payload({verification_valid_until:until}))).status,400);
    assert.equal((await request(payload({availability:'in_stock'}))).status,400);
    await db.exec("UPDATE public.product_observations SET retrieved_at=now()-interval '23 hours 30 minutes'");
    assert.equal((await request(payload())).status,400);
  });
  it('projects only safe fields; unknown stock allows seller confirmation without price',async()=>{
    await request(payload());const rows=await publicRows();assert.equal(rows.length,1);
    assert.equal(rows[0].action,'check_at_seller');assert.equal(rows[0].availability,'unknown');
    assert.deepEqual(Object.keys(rows[0]).sort(),['id','product_id','merchant','destination_url','action',
      'verified_at','verification_valid_until','availability'].sort());
    assert.ok(!JSON.stringify(rows).includes('fixture-admin'));
    assert.equal((await publicRows('authenticated')).length,1);
  });
  it('handles fresh stock, confirmed sold-out and expired stock separately from identity',async()=>{
    const input=payload({availability:'in_stock',availability_valid_until:new Date(Date.now()+1800_000).toISOString()});
    await request(input);assert.equal((await publicRows())[0].action,'buy');
    const verifiedAt=(await snapshot()).product_purchase_links[0].verified_at;
    await db.query("UPDATE public.product_observations SET extracted_data=jsonb_set(extracted_data,'{availability}','\"out_of_stock\"') WHERE id=$1",[seller]);
    assert.equal((await publicRows())[0].action,'check_at_seller');
    const result=await request({...input,expected_revision:1,availability:'out_of_stock'});assert.equal(result.status,200);
    const row=(await publicRows())[0];assert.equal(row.action,'unavailable');assert.equal(row.destination_url,null);
    assert.equal((await snapshot()).product_purchase_links[0].identity_revision,1);
    assert.deepEqual((await snapshot()).product_purchase_links[0].verified_at,verifiedAt);
    await db.exec("UPDATE public.product_purchase_links SET availability_valid_until=now()-interval '1 second'");
    assert.equal((await publicRows())[0].action,'check_at_seller');
  });
  it('invalidates changed identity evidence and separates stock observation age from identity age',async()=>{
    await request(payload());
    await db.query("UPDATE public.product_observations SET extracted_data=jsonb_set(extracted_data,'{purchase_identity_v1,edition}','\"v2\"') WHERE id=$1",[seller]);
    assert.deepEqual(await publicRows(),[]);
    await db.query("UPDATE public.product_observations SET extracted_data=jsonb_set(extracted_data,'{purchase_identity_v1,edition}','\"v1\"') WHERE id=$1",[seller]);
    await db.query("UPDATE public.product_observations SET source_url=source_url||'?changed' WHERE id=$1",[seller]);
    assert.deepEqual(await publicRows(),[]);
    await db.query('UPDATE public.product_observations SET source_url=$1 WHERE id=$2',[payload().resolved_url,seller]);
    await db.query("UPDATE public.product_observations SET retrieved_at=retrieved_at-interval '1 second' WHERE id=$1",[target]);
    assert.deepEqual(await publicRows(),[]);
  });
  it('does not expose fresh stock from stale or future observation timestamps',async()=>{
    await request(payload({availability:'in_stock',availability_valid_until:new Date(Date.now()+1800_000).toISOString()}));
    await db.query("UPDATE public.product_observations SET retrieved_at=now()-interval '2 hours' WHERE id=$1",[seller]);
    assert.equal((await publicRows())[0].action,'check_at_seller');
    await db.query("UPDATE public.product_observations SET retrieved_at=now()+interval '1 minute' WHERE id=$1",[seller]);
    assert.deepEqual(await publicRows(),[]);
    await db.query("UPDATE public.product_observations SET retrieved_at=now()-interval '25 hours' WHERE id=$1",[seller]);
    assert.deepEqual(await publicRows(),[]);
  });
  it('invalidates an existing approval on life-stage, formulation or canonical identity changes',async()=>{
    await request(payload());
    for(const [column,value] of [['target_pet_type',"'cat'"],['target_life_stage',"ARRAY['senior']"],
      ['formulation',"'wet'"],['canonical_product_key',"'new-edition'"],['display_name',"'Changed displayed option'"]]) {
      await db.exec(`UPDATE public.products SET ${column}=${value}`);
      assert.deepEqual(await publicRows(),[]);
      await db.exec(`UPDATE public.products SET ${column}=NULL`);
      assert.equal((await publicRows()).length,1);
    }
  });
  it('blocks stale identity, product/evidence mutation, visibility and verification gates',async()=>{
    await request(payload());
    await db.exec("UPDATE public.product_purchase_links SET verification_valid_until=now()-interval '1 second'");
    assert.deepEqual(await publicRows(),[]);
    await db.exec("UPDATE public.product_purchase_links SET verification_valid_until=now()+interval '1 hour'");
    await db.exec("UPDATE public.products SET name='Changed option'");assert.deepEqual(await publicRows(),[]);
    await db.exec("UPDATE public.products SET name='Fixture salmon 12g x 15', is_visible=false");assert.deepEqual(await publicRows(),[]);
    await db.exec("UPDATE public.products SET is_visible=true; CREATE OR REPLACE FUNCTION private.hide_unverified_products_enabled() RETURNS boolean LANGUAGE sql AS 'SELECT true'");
    assert.deepEqual(await publicRows(),[]);
    await db.exec("UPDATE public.products SET verification_status='verified'");assert.equal((await publicRows()).length,1);
    await db.exec('UPDATE public.product_observations SET is_current=false');assert.deepEqual(await publicRows(),[]);
  });
  it('enforces role permissions and server-side validation even when TS is bypassed',async()=>{
    for(const role of ['anon','authenticated']) {
      await db.exec(`SET ROLE ${role}`);
      try {
        await assert.rejects(db.query('SELECT * FROM public.product_purchase_links'));
        await assert.rejects(db.query('SELECT public.admin_save_product_purchase_link($1,$2)',[JSON.stringify(payload()),'forged']));
        await assert.rejects(db.query('SELECT public.purchase_link_fingerprint($1,$2,$3)',[product,target,seller]));
      } finally {await db.exec('RESET ROLE');}
    }
    assert.throws(()=>normalize(payload({extra:'bad'})));
    await db.exec('SET ROLE service_role');
    try {
      const raw={...normalize(payload()),extra:'bad'};
      await assert.rejects(db.query('SELECT public.admin_save_product_purchase_link($1,$2)',[JSON.stringify(raw),'fixture-admin']));
      await assert.rejects(db.query('INSERT INTO public.product_purchase_links(id) VALUES ($1)',[link]));
    } finally { await db.exec('RESET ROLE'); }
  });
  it('keeps originals immutable and prevents a second verified link',async()=>{
    const input=payload();await request(input);
    assert.equal((await request({...input,expected_revision:1,original_url:'https://link.coupang.com/a/new'})).status,400);
    assert.equal((await request({...input,id:other})).body.result.reason,'active_link_exists');
    assert.equal((await snapshot()).admin_audit_log.length,1);
  });
  it('detects competing reviews of the same revision without overwriting the winner',async()=>{
    const input=payload();await request(input);
    assert.equal((await request({...input,expected_revision:1,hold_reason:'first review'})).body.result.status,'applied');
    const before=await snapshot();
    assert.equal((await request({...input,expected_revision:1,hold_reason:'second review'})).body.result.status,'conflict');
    assert.deepEqual(await snapshot(),before);
  });
});
