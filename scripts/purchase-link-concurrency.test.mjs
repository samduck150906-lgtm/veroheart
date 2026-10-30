import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { before, it } from 'node:test';

// Deliberately refuse any non-local or non-disposable database target.
assert.equal(process.env.PGHOST, '127.0.0.1');
assert.equal(process.env.PGDATABASE, 'purchase_link_contract_test');
assert.equal(process.env.PGUSER, 'postgres');
const root = new URL('../', import.meta.url);
const product = '11111111-1111-4111-8111-111111111111';
const target = '22222222-2222-4222-8222-222222222222';
const seller = '33333333-3333-4333-8333-333333333333';
const link = '44444444-4444-4444-8444-444444444444';
const other = '55555555-5555-4555-8555-555555555555';
const destination = 'https://www.coupang.com/vp/products/100?itemId=200&vendorItemId=300';
const identity = {brand:'Fixture brand',line:'Fixture line',flavor:'salmon',unit_size:'12g',
  pack_count:'15',composition:'15 identical sachets',option:'salmon 15',edition:'v1'};
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const json = (value) => `${quote(JSON.stringify(value))}::jsonb`;

function session() {
  const child = spawn('psql', ['-X', '--no-password', '--quiet', '--tuples-only', '--no-align', '-v', 'ON_ERROR_STOP=1'],
    {env:{...process.env,PGSSLMODE:'disable'},stdio:['pipe','pipe','pipe']});
  let output='', errors='';
  child.stdout.on('data', (chunk)=>{output+=chunk;});
  child.stderr.on('data', (chunk)=>{errors+=chunk;});
  const done = new Promise((resolve,reject)=>{
    child.on('error',reject);
    child.on('close',(code)=>code===0 ? resolve(output.trim()) : reject(Error(`Synthetic psql failure (${code}): ${errors}`)));
  });
  done.catch(()=>{});
  return {child,done,output:()=>output};
}
async function sql(statement) {
  const s=session();s.child.stdin.end(statement);return s.done;
}
function payload(patch={}) {
  return {id:link,product_id:product,expected_revision:0,merchant:'coupang',
    original_url:'https://link.coupang.com/a/fixture',resolved_url:destination,
    link_kind:'product',verification_status:'verified',seller_product_id:'100',seller_item_id:'200',seller_offer_id:'300',
    target_observation_id:target,seller_observation_id:seller,
    verification_valid_until:new Date(Date.now()+3600_000).toISOString(),
    availability:'unknown',availability_valid_until:null,hold_reason:null,...patch};
}
const call = (input)=>`SELECT public.admin_save_product_purchase_link(${json(input)},'fixture-admin');`;

before(async()=>{
  assert.equal(await sql("SELECT count(*) FROM pg_tables WHERE schemaname='public';"),'0', 'Requires an empty disposable database');
  await sql(await readFile(new URL('scripts/fixtures/purchase-link-schema.sql',root),'utf8'));
  await sql(await readFile(new URL('supabase/migration_drafts/20261030090000_product_purchase_links.sql',root),'utf8'));
  await sql(`INSERT INTO public.products(id,name,brand_name,is_visible,verification_status,unrelated)
    VALUES(${quote(product)},'Fixture salmon 12g x 15','Fixture brand',true,'verified','{"sentinel":true}');
    INSERT INTO public.product_observations(id,product_id,source_url,raw_name,raw_brand,extracted_data)
    VALUES(${quote(target)},${quote(product)},'https://brand.example/fixture','Fixture salmon 12g x 15','Fixture brand',
      ${json({purchase_identity_v1:identity})}),
      (${quote(seller)},${quote(product)},${quote(destination)},null,null,
      ${json({purchase_identity_v1:identity,link_kind:'product',seller_product_id:'100',seller_item_id:'200',seller_offer_id:'300'})});`);
});

async function race(first, second) {
  const winner=session(), loser=session();
  try {
    winner.child.stdin.write(`BEGIN; SET LOCAL statement_timeout='15s'; SET LOCAL ROLE service_role;
      ${call(first)} SELECT 'WINNER_READY';\n`);
    for(let i=0;!winner.output().includes('WINNER_READY') && i<100;i++) await delay(50);
    assert.ok(winner.output().includes('WINNER_READY'),'First transaction must hold the uncommitted locks');
    loser.child.stdin.end(`SET application_name='purchase-link-loser'; SET statement_timeout='15s';
      SET ROLE service_role; ${call(second)}`);
    let waiting=false;
    for(let i=0;i<100 && !waiting;i++) {
      waiting=(await sql(`SELECT count(*) FROM pg_stat_activity WHERE datname=current_database()
        AND application_name='purchase-link-loser' AND wait_event_type='Lock';`))==='1';
      if(!waiting) await delay(50);
    }
    assert.ok(waiting,'Second real connection must actually wait on the first transaction');
    winner.child.stdin.end('COMMIT;\n');
    const [a,b]=await Promise.all([winner.done,loser.done]);
    assert.ok(a.includes('"status": "applied"'));
    assert.ok(b.includes('"status": "conflict"'));
  } finally {
    for(const s of [winner,loser]) if(s.child.exitCode===null) s.child.kill();
    await Promise.allSettled([winner.done,loser.done]);
  }
}

it('serializes two actual connections creating different verified links for one product',async()=>{
  const before=await sql('SELECT to_jsonb(p)::text FROM public.products p;');
  await race(payload(),payload({id:other}));
  assert.equal(await sql("SELECT count(*) FROM public.product_purchase_links WHERE verification_status='verified';"),'1');
  assert.equal(await sql('SELECT count(*) FROM public.admin_audit_log;'),'1');
  assert.equal(await sql('SELECT to_jsonb(p)::text FROM public.products p;'),before);
});

it('serializes two actual connections reviewing the same revision without duplicate audit',async()=>{
  const current=JSON.parse(await sql('SELECT request_payload::text FROM public.product_purchase_links;'));
  await race({...current,expected_revision:1,hold_reason:'winning review'},
    {...current,expected_revision:1,hold_reason:'losing review'});
  assert.equal(await sql('SELECT revision FROM public.product_purchase_links;'),'2');
  assert.equal(await sql('SELECT hold_reason FROM public.product_purchase_links;'),'winning review');
  assert.equal(await sql('SELECT count(*) FROM public.admin_audit_log;'),'2');
});
