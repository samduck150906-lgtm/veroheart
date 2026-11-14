import assert from 'node:assert/strict';

export async function assertVolumeNutrition(db) {
  await db.exec('BEGIN');
  try {
    const id='92000000-0000-4000-8000-000000000099';
    await db.query("INSERT INTO products(id,name,brand_name,is_visible,verification_status)VALUES($1,'Volume fixture','Fixture',false,'pending')",[id]);
    const missing=async()=> (await db.query('SELECT missing_fields FROM product_enrichment_queue WHERE product_id=$1',[id])).rows[0].missing_fields;
    const insert=async(code,unit,basis,source='https://example.org/liquid')=> db.query(`INSERT INTO product_nutrient_evidence(product_id,nutrient_code,value,unit,basis,qualifier,source_url,source_version,source_locator)
      VALUES($1,$2,5,$3,$4,'unspecified',$5,'fixture',$2)`,[id,code,unit,basis,source]);
    assert.ok((await missing()).includes('nutrition'));
    await insert('protein','g/100mL','as_fed');
    await insert('fat','g/100mL','as_fed','https://example.org/different-formula');
    assert.ok((await missing()).includes('nutrition'),'two unrelated labels cannot form a nutrition profile');
    await insert('fat','g/100mL','as_fed');
    assert.ok(!(await missing()).includes('nutrition'));
    assert.equal((await db.query('SELECT count(*)::int n FROM nutritional_profiles WHERE product_id=$1',[id])).rows[0].n,0,'no invented density/percent projection');
    await db.query("DELETE FROM product_nutrient_evidence WHERE product_id=$1 AND source_url='https://example.org/liquid' AND nutrient_code='fat'",[id]);
    assert.ok((await missing()).includes('nutrition'),'evidence deletion restores the missing field');
    for(const [code,unit,basis] of [['protein','kcal/100mL','as_fed'],['gross_energy','g/100mL','as_fed'],['protein','g/100mL','dry_matter'],['protein','g/100mL','as_sold']]) {
      await db.exec('SAVEPOINT bad_volume');
      await assert.rejects(insert(code,unit,basis),/nutrient_unit_basis_mismatch|check constraint|foreign key/);
      await db.exec('ROLLBACK TO SAVEPOINT bad_volume');
    }
    await db.query('DELETE FROM product_nutrient_evidence WHERE product_id=$1',[id]);
    await insert('protein','g/100g','as_sold');await insert('fat','g/100g','as_sold');
    assert.ok(!(await missing()).includes('nutrition'));
    assert.equal((await db.query('SELECT count(*)::int n FROM nutritional_profiles WHERE product_id=$1',[id])).rows[0].n,0,'powder evidence is not prepared liquid or ordinary feed');
    assert.deepEqual((await db.query('SELECT is_visible,verification_status FROM products WHERE id=$1',[id])).rows,[{is_visible:false,verification_status:'pending'}]);
    await db.query('DELETE FROM product_nutrient_evidence WHERE product_id=$1',[id]);
    await db.query("UPDATE products SET catalog_source_url='https://example.org/kr/pdp' WHERE id=$1",[id]);
    await db.query('INSERT INTO nutritional_profiles(product_id,crude_protein,crude_fat)VALUES($1,5,5)',[id]);
    await insert('protein','g/100g','as_fed','https://example.org/uk/official-analysis');
    const generated=async()=> (await db.query("SELECT nutrient_code FROM product_nutrient_evidence WHERE product_id=$1 AND source_version='profile-projection-v1' ORDER BY nutrient_code",[id])).rows.map(r=>r.nutrient_code);
    assert.deepEqual(await generated(),['fat'],'explicit measurement replaces its generated copy, not the independent document');
    await db.query('UPDATE nutritional_profiles SET crude_protein=crude_protein WHERE product_id=$1',[id]);
    assert.deepEqual(await generated(),['fat'],'later profile writes do not invent a Korean source for a foreign measurement');
    console.log('PASS: liquid volume and as-sold powder evidence, source identity, queue triggers, no percentage projection or publication');
  } finally { await db.exec('ROLLBACK'); }
}
