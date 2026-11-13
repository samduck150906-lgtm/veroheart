import assert from 'node:assert/strict';

export async function assertMaterialRegistry(db) {
  const referenceCounts=(await db.query(`SELECT count(*)::int n,count(DISTINCT canonical_ingredient_id)::int materials,
    count(*) FILTER(WHERE quality='inconsistent')::int excluded FROM public.material_nutrient_references`)).rows[0];
  assert.equal(referenceCounts.n,5931);
  assert.equal(referenceCounts.materials,181);
  assert.equal(referenceCounts.excluded,158);
  await db.exec('BEGIN');
  try {
    await db.exec(`
      INSERT INTO public.ingredients(id,name_ko,risk_level) VALUES
        ('91000000-0000-4000-8000-000000000001','Fixture rice','safe'),
        ('91000000-0000-4000-8000-000000000002','Fixture rice bran','safe');
      INSERT INTO public.products(id,name,brand_name,product_type,is_visible,verification_status)
        VALUES('92000000-0000-4000-8000-000000000001','Material fixture','Fixture','food',false,'pending');
      INSERT INTO public.product_ingredient_label_sets(id,product_id,raw_label_text,is_current)
        VALUES('93000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001','Fixture rice 20%, Fixture rice bran',true);
      INSERT INTO public.product_ingredient_label_items(label_set_id,display_order,raw_ingredient_text,normalized_ingredient_text,percentage)
        VALUES('93000000-0000-4000-8000-000000000001',1,'Ｆｉｘｔｕｒｅ rice 20%','malicious-other-name',20),
        ('93000000-0000-4000-8000-000000000001',2,'Fixture rice bran',null,null),
        ('93000000-0000-4000-8000-000000000001',3,'hydrolyzed Fixture rice',null,null);
    `);
    const items = (await db.query(`SELECT i.*,c.canonical_name_ko FROM public.product_ingredient_label_items i
      LEFT JOIN public.canonical_ingredients c ON c.id=i.canonical_ingredient_id
      WHERE label_set_id='93000000-0000-4000-8000-000000000001' ORDER BY display_order`)).rows;
    assert.equal(items[0].canonical_name_ko,'Fixture rice');
    assert.equal(Number(items[0].percentage),20);
    assert.equal(items[0].raw_ingredient_text,'Ｆｉｘｔｕｒｅ rice 20%');
    assert.equal(items[1].canonical_name_ko,'Fixture rice bran');
    assert.equal(items[2].match_status,'unmatched');
    assert.equal((await db.query("SELECT analysis_status FROM public.products WHERE id='92000000-0000-4000-8000-000000000001'")).rows[0].analysis_status,'partial');
    await db.exec(`INSERT INTO public.material_constituent_evidence(canonical_ingredient_id,constituent_code,relation,source_url,source_version,source_locator,note)
      SELECT id,'starch','source_of','https://example.org/fixture','test','test','Fixture only' FROM public.canonical_ingredients WHERE canonical_name_ko='Fixture rice'`);
    const profile = (await db.query("SELECT public.material_profile(c) profile FROM public.canonical_ingredients c WHERE canonical_name_ko='Fixture rice'")).rows[0].profile;
    assert.equal(profile[0].nutrientCode,'carbohydrate');
    assert.equal(profile[0].amount,null);
    for (const [nutrient,unit,basis] of [['protein','Mcal/kg','as_fed'],['vitamin_a','mg/kg','as_fed'],['gross_energy','g/100g','as_fed'],['protein','g/100g','per_energy']]) {
      await db.exec('SAVEPOINT invalid_measurement');
      await assert.rejects(db.query(`INSERT INTO public.material_nutrient_references(canonical_ingredient_id,nutrient_code,value,unit,basis,source_url,source_version,source_sha256,source_locator,quality,quality_note)
        SELECT id,$1,1,$2,$3,'https://example.org/fixture','test',repeat('a',64),'fixture','reference','test' FROM public.canonical_ingredients WHERE canonical_name_ko='Fixture rice'`,[nutrient,unit,basis]),/nutrient_unit_basis_mismatch|check constraint/);
      await db.exec('ROLLBACK TO SAVEPOINT invalid_measurement');
    }
    await db.exec(`INSERT INTO public.canonical_ingredient_aliases(canonical_ingredient_id,alias_text,normalized_alias,language_code)
      SELECT id,'Fixture rice','fixturerice','en' FROM public.canonical_ingredients WHERE canonical_name_ko='Fixture rice bran';
      INSERT INTO public.product_ingredient_label_items(label_set_id,display_order,raw_ingredient_text)
        VALUES('93000000-0000-4000-8000-000000000001',4,'Fixture rice');`);
    assert.equal((await db.query("SELECT match_status FROM public.product_ingredient_label_items WHERE label_set_id='93000000-0000-4000-8000-000000000001' AND display_order=4")).rows[0].match_status,'ambiguous');
    await db.exec(`UPDATE public.canonical_ingredient_aliases SET canonical_ingredient_id=(SELECT id FROM public.canonical_ingredients WHERE canonical_name_ko='Fixture rice'),is_preferred=true
      WHERE normalized_alias='fixturerice' AND language_code='en';
      UPDATE public.canonical_ingredients SET canonical_name_en='Fixture rice' WHERE canonical_name_ko='Fixture rice bran';
      SELECT private.reconcile_material_terms(ARRAY['strict:fixturerice']);`);
    const resolved=(await db.query(`SELECT i.match_status,i.raw_ingredient_text,c.canonical_name_ko FROM public.product_ingredient_label_items i
      LEFT JOIN public.canonical_ingredients c ON c.id=i.canonical_ingredient_id
      WHERE label_set_id='93000000-0000-4000-8000-000000000001' AND display_order IN(3,4) ORDER BY display_order`)).rows;
    assert.equal(resolved[0].match_status,'unmatched','Preferred whole aliases must not erase hydrolysis');
    assert.equal(resolved[1].canonical_name_ko,'Fixture rice','Curated exact alias must beat duplicate generated English names');
    assert.equal(resolved[1].raw_ingredient_text,'Fixture rice');
    await db.exec(`INSERT INTO public.product_ingredient_label_items(label_set_id,display_order,raw_ingredient_text,percentage) VALUES
      ('93000000-0000-4000-8000-000000000001',5,'COMPOSITION: Fixture rice 20%',20),
      ('93000000-0000-4000-8000-000000000001',6,'INGREDIENTS: hydrolyzed Fixture rice',null),
      ('93000000-0000-4000-8000-000000000001',7,'composition Fixture rice',null);`);
    const headed=(await db.query(`SELECT i.raw_ingredient_text,i.percentage,i.match_status,c.canonical_name_ko FROM public.product_ingredient_label_items i
      LEFT JOIN public.canonical_ingredients c ON c.id=i.canonical_ingredient_id WHERE label_set_id='93000000-0000-4000-8000-000000000001' AND display_order>=5 ORDER BY display_order`)).rows;
    assert.equal(headed[0].canonical_name_ko,'Fixture rice');
    assert.equal(headed[0].raw_ingredient_text,'COMPOSITION: Fixture rice 20%');
    assert.equal(Number(headed[0].percentage),20);
    assert.equal(headed[1].match_status,'unmatched','Removing a heading must not remove hydrolysis');
    assert.equal(headed[2].match_status,'unmatched','Without a colon the word is not section metadata');
    await db.exec('SET LOCAL ROLE anon');
    assert.equal((await db.query("SELECT public.material_profile(c) profile FROM public.canonical_ingredients c WHERE canonical_name_ko='Fixture rice'")).rows[0].profile[0].nutrientCode,'carbohydrate');
    assert.equal((await db.query("SELECT count(*)::int n FROM public.product_nutrient_evidence WHERE product_id='92000000-0000-4000-8000-000000000001'")).rows[0].n,0);
    await db.exec('RESET ROLE');
    for (const table of ['nutrient_definitions','constituent_definitions','material_constituent_evidence','product_nutrient_evidence']) {
      assert.equal((await db.query('SELECT has_table_privilege(\'anon\',$1,\'INSERT\') allowed',[`public.${table}`])).rows[0].allowed,false);
    }
    assert.equal((await db.query("SELECT count(*)::int n FROM public.ingredient_label_comparisons WHERE product_id='92000000-0000-4000-8000-000000000001'")).rows[0].n,0);
    console.log('PASS: material identity, Unicode, processing separation, ambiguous aliases, rice→starch→carbohydrate, preserved unknown quantities, public read/private writes, no fabricated approval');
  } finally { await db.exec('ROLLBACK'); }
}
