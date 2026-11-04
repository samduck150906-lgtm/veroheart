import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const product='71111111-1111-4111-8111-111111111111';
const target='72222222-2222-4222-8222-222222222222';
const seller='73333333-3333-4333-8333-333333333333';
const link='74444444-4444-4444-8444-444444444444';
const freshTarget='75555555-5555-4555-8555-555555555555';
const freshSeller='76666666-6666-4666-8666-666666666666';
const quote=(value)=>`'${String(value).replaceAll("'","''")}'`;
const json=(value)=>`${quote(JSON.stringify(value))}::jsonb`;
const identity={brand:'Full schema fixture',line:'Fixture line',flavor:'salmon',unit_size:'12g',
  pack_count:'15',composition:'15 identical sachets',option:'salmon 15',edition:'v1'};
const destination='https://www.coupang.com/vp/products/100?itemId=200&vendorItemId=300';

// The adapters accept only synthetic SQL in a disposable database. No HTTP/API or
// production connection is available here. This exercises repository SQL, not Auth HTTP.
export async function assertPurchaseLinkFullSchema(db) {
  const rows=async(sql,role)=>(await db.query(sql,role)).rows;
  const unchangedObjects=async()=>({
    policies:await rows("SELECT * FROM pg_policies WHERE schemaname='public' AND tablename<>'product_purchase_links' ORDER BY tablename,policyname"),
    functions:await rows(`SELECT p.oid::text,pg_get_functiondef(p.oid) AS definition FROM pg_proc p
      JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','private') AND p.prokind='f'
      AND p.proname NOT LIKE 'purchase_%' AND p.proname NOT IN ('admin_save_product_purchase_link','get_product_purchase_links','admin_delete_product') ORDER BY p.oid`),
    columns:await rows("SELECT * FROM information_schema.columns WHERE table_schema='public' AND table_name<>'product_purchase_links' ORDER BY table_name,ordinal_position"),
  });
  const before=await unchangedObjects();
  await db.exec(await readFile(new URL('../supabase/migration_drafts/20261030090000_product_purchase_links.sql',import.meta.url),'utf8'));
  assert.deepEqual(await unchangedObjects(),before,'draft does not alter existing columns, functions or policies');
  const grants=await rows(`SELECT role,has_function_privilege(role,'public.admin_save_product_purchase_link(jsonb,text)','EXECUTE') AS write,
    has_table_privilege(role,'public.product_purchase_links','SELECT') AS private_read,
    has_table_privilege(role,'public.product_purchase_links','UPDATE') AS direct_write
    FROM unnest(ARRAY['anon','authenticated','service_role']) role ORDER BY role`);
  assert.deepEqual(grants,[
    {role:'anon',write:false,private_read:false,direct_write:false},
    {role:'authenticated',write:false,private_read:false,direct_write:false},
    {role:'service_role',write:true,private_read:true,direct_write:false},
  ]);
  assert.equal((await rows("SELECT relrowsecurity FROM pg_class WHERE oid='public.product_purchase_links'::regclass"))[0].relrowsecurity,true);
  await db.exec(`INSERT INTO public.products(id,name,brand_name,product_type,main_category,target_pet_type,is_visible,verification_status)
    VALUES(${quote(product)},'Full schema fixture salmon 12g x 15','Full schema fixture','food','사료','dog',true,'reviewed')`);
  const proof=async()=>{
    // A capture of current product identity is evidence, not a client-supplied overwrite.
    const p=(await rows(`SELECT to_jsonb(p) AS p FROM public.products p WHERE id=${quote(product)}`))[0].p;
    return {name:p.name,brand:p.brand_name,variant:p.variant_name,weight:p.net_weight_text,barcode:p.barcode,
      display_name:p.display_name,canonical_key:p.canonical_product_key,pet_type:p.target_pet_type,
      life_stage:p.target_life_stage,formulation:p.formulation};
  };
  const observe=async(t,s)=>{
    await db.exec(`INSERT INTO public.product_observations(id,product_id,source_type,source_url,raw_name,raw_brand,extracted_data)
      VALUES(${quote(t)},${quote(product)},'brand_official','https://brand.example/fixture',
        'Full schema fixture salmon 12g x 15','Full schema fixture',${json({purchase_identity_v1:identity,purchase_product_identity_v1:await proof()})}),
      (${quote(s)},${quote(product)},'retailer',${quote(destination)},NULL,NULL,
        ${json({purchase_identity_v1:identity,link_kind:'product',seller_product_id:'100',seller_item_id:'200',seller_offer_id:'300',availability:'in_stock'})})`);
  };
  await observe(target,seller);
  let input={id:link,product_id:product,expected_revision:0,merchant:'coupang',
    original_url:'https://link.coupang.com/a/full-schema-fixture',resolved_url:destination,
    link_kind:'product',verification_status:'verified',seller_product_id:'100',seller_item_id:'200',seller_offer_id:'300',
    target_observation_id:target,seller_observation_id:seller,
    verification_valid_until:new Date(Date.now()+3600_000).toISOString(),availability:'unknown',
    availability_valid_until:null,hold_reason:null};
  const save=async(p)=> (await rows(`SELECT public.admin_save_product_purchase_link(${json(p)},'schema-fixture-admin') AS r`,'service_role'))[0].r;
  const publicRows=(role='anon')=>rows(`SELECT * FROM public.get_product_purchase_links(${quote(product)})`,role);
  const state=async()=>({
    product:await rows(`SELECT to_jsonb(p) AS p FROM public.products p WHERE id=${quote(product)}`),
    links:await rows(`SELECT to_jsonb(l) AS l FROM public.product_purchase_links l WHERE product_id=${quote(product)}`),
    audit:await rows(`SELECT to_jsonb(a) AS a FROM public.admin_audit_log a WHERE target_id IN (${quote(product)},${quote(link)}) ORDER BY id`),
  });
  try {
    for(const role of ['anon','authenticated']) {
      await assert.rejects(saveAsRole(role));
      await assert.rejects(rows('SELECT * FROM public.product_purchase_links',role));
    }
    async function saveAsRole(role) {
      return rows(`SELECT public.admin_save_product_purchase_link(${json(input)},'forged')`,role);
    }
    const productBefore=(await state()).product;
    assert.equal((await save(input)).status,'applied');
    assert.deepEqual((await state()).product,productBefore,'all actual product columns preserved');
    assert.equal((await state()).audit.length,1);
    assert.equal((await publicRows())[0].action,'check_at_seller');
    const same=await state();
    assert.equal((await save(input)).status,'already_applied');
    assert.equal((await save({...input,hold_reason:'stale reviewer'})).status,'conflict');
    assert.deepEqual(await state(),same);
    await db.exec("ALTER TABLE public.admin_audit_log ADD CONSTRAINT purchase_contract_reject_audit CHECK(action<>'saveProductPurchaseLink') NOT VALID");
    try {
      await assert.rejects(save({...input,expected_revision:1,hold_reason:'audit rollback witness'}));
      assert.deepEqual(await state(),same,'actual audit-table failure rolls back the link update');
    } finally { await db.exec('ALTER TABLE public.admin_audit_log DROP CONSTRAINT purchase_contract_reject_audit'); }
    await assert.rejects(db.exec(`DELETE FROM public.products WHERE id=${quote(product)}`,'service_role'),/foreign key/i);
    assert.deepEqual(await state(),same,'connected product cannot silently cascade away its link/evidence');
    for(const role of ['anon','authenticated']) {
      const visible=(await publicRows(role))[0];
      assert.deepEqual(Object.keys(visible).sort(),['id','product_id','merchant','destination_url','action','verified_at','verification_valid_until','availability'].sort());
      for(const [status,expected] of [['pending',0],['reviewed',1],['verified',1]]) {
        await db.exec(`UPDATE public.products SET verification_status=${quote(status)} WHERE id=${quote(product)}`);
        assert.equal((await publicRows(role)).length,expected);
      }
    }
    await db.exec("UPDATE public.app_settings SET value='true'::jsonb WHERE key='hide_unverified_products'");
    await db.exec(`UPDATE public.products SET verification_status='reviewed' WHERE id=${quote(product)}`);
    assert.deepEqual(await publicRows(),[]);
    await db.exec("UPDATE public.app_settings SET value='false'::jsonb WHERE key='hide_unverified_products'");
    assert.equal((await publicRows()).length,1);

    // Regression: a new revision alone must not recertify obsolete product evidence.
    await db.exec(`UPDATE public.products SET net_weight_text='24g' WHERE id=${quote(product)}`);
    assert.deepEqual(await publicRows(),[]);
    const changed=await state();
    await assert.rejects(save({...input,expected_revision:1}),'old target evidence cannot approve changed product fields');
    assert.deepEqual(await state(),changed);
    await observe(freshTarget,freshSeller);
    input={...input,expected_revision:1,target_observation_id:freshTarget,seller_observation_id:freshSeller};
    assert.equal((await save(input)).status,'applied','fresh captured target and seller evidence can be approved');
    assert.equal((await publicRows()).length,1);
    await db.exec(`UPDATE public.product_observations SET is_current=false WHERE id=${quote(freshSeller)}`);
    const stale=await state();
    assert.deepEqual(await publicRows(),[]);
    await assert.rejects(save({...input,expected_revision:2}));
    assert.deepEqual(await state(),stale);
    await db.exec(`UPDATE public.product_observations SET is_current=true WHERE id=${quote(freshSeller)}`);

    // Logical clock fixture: make the stored deadline and request expire together.
    input={...input,expected_revision:2,verification_valid_until:new Date(Date.now()-10000).toISOString()};
    await db.exec(`UPDATE public.product_purchase_links SET verification_valid_until=${quote(input.verification_valid_until)},
      request_payload=${json(Object.fromEntries(Object.entries(input).filter(([k])=>k!=='expected_revision')))} WHERE id=${quote(link)}`);
    assert.deepEqual(await publicRows(),[]);
    const expired=await state();
    await assert.rejects(save(input));
    assert.deepEqual(await state(),expired,'expired replay never writes or audits');
    input={...input,verification_valid_until:new Date(Date.now()+3600_000).toISOString()};
    assert.equal((await save(input)).status,'applied');

    // Exercise an existing administrator RPC against the same real product/audit schema.
    const cleanup=[{id:product,expected_name:'Full schema fixture salmon 12g x 15',expected_brand_name:'Full schema fixture',name:'Reviewed full schema fixture salmon 12g x 15'}];
    const result=(await rows(`SELECT public.admin_apply_product_cleanup(${json(cleanup)},'schema-fixture-admin') AS r`,'service_role'))[0].r;
    assert.equal(result.applied,1);
    assert.deepEqual(await publicRows(),[],'existing cleanup invalidates purchase identity');
    const afterCleanup=await state();
    await assert.rejects(save({...input,expected_revision:3}));
    assert.deepEqual(await state(),afterCleanup);
    const trashBefore=await rows('SELECT * FROM public.admin_trash ORDER BY id');
    assert.equal((await rows(`SELECT public.admin_delete_product(${quote(product)},'schema-fixture-admin') AS r`,'service_role'))[0].r.status,'blocked_purchase_history');
    assert.deepEqual(await state(),afterCleanup);
    assert.deepEqual(await rows('SELECT * FROM public.admin_trash ORDER BY id'),trashBefore);
    for(const role of ['anon','authenticated']) {
      assert.equal((await rows(`SELECT has_function_privilege('${role}','public.admin_delete_product(uuid,text)','EXECUTE') AS allowed`))[0].allowed,false);
    }
    const unlinked='77777777-7777-4777-8777-777777777777';
    await db.exec(`INSERT INTO public.products(id,name,brand_name,product_type,main_category,target_pet_type)
      VALUES(${quote(unlinked)},'Unlinked deletion fixture','Synthetic','food','사료','dog')`);
    const original=(await rows(`SELECT to_jsonb(p) AS p FROM public.products p WHERE id=${quote(unlinked)}`))[0].p;
    await db.exec("ALTER TABLE public.admin_audit_log ADD CONSTRAINT delete_contract_reject_audit CHECK(action<>'deleteProduct') NOT VALID");
    try {
      await assert.rejects(rows(`SELECT public.admin_delete_product(${quote(unlinked)},'schema-fixture-admin')`,'service_role'));
      assert.deepEqual((await rows(`SELECT to_jsonb(p) AS p FROM public.products p WHERE id=${quote(unlinked)}`))[0].p,original);
      assert.deepEqual(await rows('SELECT * FROM public.admin_trash ORDER BY id'),trashBefore);
    } finally { await db.exec('ALTER TABLE public.admin_audit_log DROP CONSTRAINT delete_contract_reject_audit'); }
    assert.equal((await rows(`SELECT public.admin_delete_product(${quote(unlinked)},'schema-fixture-admin') AS r`,'service_role'))[0].r.status,'deleted');
    const trash=(await rows(`SELECT snapshot FROM public.admin_trash WHERE entity_id=${quote(unlinked)}`))[0];
    assert.deepEqual(trash.snapshot.product,original);
    assert.equal((await rows(`SELECT public.admin_delete_product(${quote(unlinked)},'schema-fixture-admin') AS r`,'service_role'))[0].r.status,'not_found');
    assert.equal((await rows(`SELECT count(*)::integer AS n FROM public.admin_audit_log WHERE action='deleteProduct' AND target_id=${quote(unlinked)}`))[0].n,1);
    await db.exec(`DELETE FROM public.admin_trash WHERE entity_id=${quote(unlinked)};
      DELETE FROM public.admin_audit_log WHERE target_id=${quote(unlinked)}`);
    console.log(JSON.stringify({purchaseLinkFullSchema:true,roleMatrix:true,publicPolicy:true,
      actualProductAndAuditSchema:true,existingCleanupCompatible:true,snapshotGuard:true,
      auditFailureAtomic:true,connectedProductDeletion:'transactionally blocked; unlinked trash/delete/audit atomic',
      expiredReplayRejectedWithoutWrite:true,originalObjectDefinitionsUnchanged:true}));
  } finally {
    await db.exec(`DELETE FROM public.product_purchase_links WHERE product_id=${quote(product)};
      DELETE FROM public.product_observations WHERE product_id=${quote(product)};
      DELETE FROM public.admin_audit_log WHERE target_id IN (${quote(product)},${quote(link)});
      DELETE FROM public.products WHERE id=${quote(product)};`);
  }
  assert.deepEqual(await unchangedObjects(),before,'existing schema and policies still unchanged');
}
