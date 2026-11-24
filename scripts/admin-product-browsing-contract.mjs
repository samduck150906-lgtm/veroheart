import assert from 'node:assert/strict';

export async function assertAdminProductBrowsing(db) {
  await db.exec('BEGIN');
  try {
    await db.exec("SET LOCAL request.jwt.claim.role='service_role'; ALTER TABLE public.products ALTER COLUMN verification_status DROP NOT NULL;");
    const id = n => `f2000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
    const ids=Array.from({length:45},(_,i)=>id(i+1));
    for(let n=1;n<=45;n++) await db.query(`INSERT INTO public.products(id,name,brand_name,main_category,target_pet_type,verification_status,is_visible,image_url,created_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,'2026-11-17T00:00:00Z')`,[
      id(n),`admin-browse-fixture ${n}`,n===43?'Royal Canin':n===44?'로얄캐닌':n===45?'':'QA browse',n%2?'간식':'사료',n%6===0?null:n%2?'dog':'cat',n%7===0?null:['pending','reviewed','verified'][n%3],n%2===0,n%2?'https://example.invalid/synthetic.png':null]);
    await db.query("UPDATE public.products SET catalog_archived_at=now(),catalog_archive_reason='synthetic test archive',is_visible=false WHERE id=$1",[id(42)]);
    const ingredientIds=[1,2,3].map(n=>`f2100000-0000-4000-8000-${String(n).padStart(12,'0')}`);
    for(const [n,ingredient]of ingredientIds.entries()) await db.query('INSERT INTO public.ingredients(id,name_ko,risk_level)VALUES($1,$2,$3)',[ingredient,`합성 조회 원료 ${n}`,'safe']);
    for(let n=1;n<=41;n++) {
      for(let i=0;i<n%4;i++) await db.query('INSERT INTO public.product_ingredients(product_id,ingredient_id)VALUES($1,$2)',[id(n),ingredientIds[i]]);
      if(n%3===0)await db.query('INSERT INTO public.nutritional_profiles(product_id,crude_protein)VALUES($1,20)',[id(n)]);
    }
    await db.query("INSERT INTO public.product_ingredient_label_sets(id,product_id,raw_label_text,is_current)VALUES($1,$1,'Synthetic current label',true),($2,$2,'Synthetic empty label',true)",[id(1),id(3)]);
    await db.query("INSERT INTO public.product_ingredient_label_items(label_set_id,display_order,raw_ingredient_text,match_status)VALUES($1,0,'ignored fixture','ignored'),($2,0,'unreviewed fixture','unreviewed')",[id(1),id(3)]);
    const snapshot=async()=>(await db.query('SELECT jsonb_agg(to_jsonb(p)ORDER BY id)AS rows FROM public.products p WHERE id=ANY($1::uuid[])',[ids])).rows[0].rows;
    const before=await snapshot();
    const query=async(filters={},page=1,size=7,sort='created_at',direction='desc')=>(await db.query('SELECT public.admin_catalog_products_page($1::jsonb,$2,$3,$4,$5)AS result',[JSON.stringify({search:'admin-browse-fixture',...filters}),page,size,sort,direction])).rows[0].result;
    const royal=await query({brand:'Royal Canin'});
    assert.equal(royal.total,2);assert(royal.brands.find(b=>b.name==='로얄캐닌').aliases.includes('Royal Canin'));
    assert.equal((await query({brandMissing:true})).total,1);
    assert.equal((await query({brand:'Nonexistent brand'})).total,0);
    const combined=await query({brand:'QA browse',category:'간식',petType:'dog',verificationStatus:'pending',visibility:'hidden'},1,100);
    assert(combined.total>0);assert(combined.rows.every(r=>r.main_category==='간식'&&r.target_pet_type==='dog'&&r.verification_status==='pending'&&!r.is_visible));
    for(const sort of ['category','target','ingredients','completeness','verification'])for(const direction of ['asc','desc']) {
      const rows=[];for(let page=1;page<=6;page++){const result=await query({brand:'QA browse'},page,7,sort,direction);assert.equal(result.total,41);rows.push(...result.rows)}
      assert.equal(rows.length,41);assert.equal(new Set(rows.map(r=>r.id)).size,41);
      const value=r=>sort==='category'?r.main_category:sort==='target'?r.target_pet_type:sort==='ingredients'?r.ingredientCount:sort==='completeness'?r.completeness:({pending:0,reviewed:1,verified:2}[r.verification_status]??null);
      let empty=false;for(let i=0;i<rows.length;i++){const current=value(rows[i]);if(current==null||current===''){empty=true;continue}assert(!empty,'empty values remain last for both directions');if(i){const previous=value(rows[i-1]);if(previous===current)assert(rows[i-1].id<rows[i].id,'stable id tie-break across pages');else assert(direction==='asc'?previous<current:previous>current,'entire filtered result is ordered before pagination')}}
      assert.equal(rows.find(r=>r.id===id(1)).ingredientCount,0,'empty current label overrides legacy link count');
      assert.equal(rows.find(r=>r.id===id(3)).ingredientCount,1,'current label count overrides legacy link count');
      assert.deepEqual((await query({brand:'QA browse'},2,7,sort,direction)).rows.map(r=>r.id),rows.slice(7,14).map(r=>r.id));
    }
    assert.deepEqual(await snapshot(),before,'browsing never edits products');
    await db.exec("SAVEPOINT denied;SET LOCAL ROLE anon;SET LOCAL request.jwt.claim.role='anon'");
    await assert.rejects(query(),/permission denied/);await db.exec('ROLLBACK TO SAVEPOINT denied;RELEASE SAVEPOINT denied');
    await db.exec('SAVEPOINT invalid');await assert.rejects(query({},1,7,'injected_column'),/invalid_catalog_query/);await db.exec('ROLLBACK TO SAVEPOINT invalid;RELEASE SAVEPOINT invalid');
    console.log('PASS admin product browsing: grouped aliases, unknown brands, combined filters, all five sorts across six pages, current label count, stable null/tie order, no writes and service-only access');
  } finally { await db.exec('ROLLBACK'); }
}
