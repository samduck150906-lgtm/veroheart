import assert from 'node:assert/strict';
import {buildReviewedCatalogSql} from './build-reviewed-catalog-sql.mjs';
export async function assertReviewedCatalogRepair(db) {
  await db.exec('BEGIN');
  try {
    const ids=['b1000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000002'];
    for(const [i,id] of ids.entries())await db.query("INSERT INTO products(id,name,brand_name,target_pet_type,product_type,is_visible,verification_status) VALUES($1,'Synthetic original','로얄캐닌','cat','food',$2,'pending')",[id,i===0]);
    const rows=(await db.query('SELECT id,name,brand_name,target_pet_type,is_visible,verification_status FROM products WHERE id=ANY($1::uuid[]) ORDER BY id',[ids])).rows;
    const base={httpStatus:200,nameMatches:true,htmlHash:'a'.repeat(64),checkedAt:'2026-11-09T13:00:00Z',name:'Synthetic reviewed',brand:'로얄캐닌',species:'cat',productType:'food',note:'Synthetic official evidence, not an operating product',formulation:'건식',items:[],nutrition:{crude_protein:0,crude_fat:10,moisture:70},nutritionText:'Synthetic label',ingredientsText:'',image:null,kcalPer100g:null,veterinaryOnly:false};
    const accepted=[...rows.map((p,i)=>({...base,sourceUrl:`https://www.royalcanin.com/kr/cats/products/retail-products/synthetic-${i}`,existingProductId:p.id,before:p})),{...base,sourceUrl:'https://www.royalcanin.com/kr/cats/products/retail-products/synthetic-new',existingProductId:null,before:null,nutrition:{},dryMatterText:'Synthetic dry matter'}];
    const sql=buildReviewedCatalogSql({accepted}).replace(/^BEGIN;\n/,'').replace(/COMMIT;\n$/,'');
    await db.exec(sql);
    assert.equal((await db.query("SELECT is_visible FROM products WHERE id=$1",[ids[1]])).rows[0].is_visible,false);
    assert.deepEqual((await db.query('SELECT verification_status FROM products WHERE id=ANY($1::uuid[])',[ids])).rows.map(x=>x.verification_status),['reviewed','reviewed']);
    assert.equal(Number((await db.query('SELECT crude_protein FROM nutritional_profiles WHERE product_id=$1',[ids[0]])).rows[0].crude_protein),0);
    assert.equal((await db.query("SELECT count(*)::int n FROM nutritional_profiles n JOIN products p ON p.id=n.product_id WHERE p.catalog_source_url LIKE '%synthetic-new' ")).rows[0].n,0);
    await db.exec('SET ROLE anon');
    assert.equal((await db.query("SELECT count(*)::int n FROM products WHERE catalog_source_url LIKE '%/synthetic-%'")).rows[0].n,2);
    await db.exec('RESET ROLE');
    await db.exec('SAVEPOINT stale_review');
    await assert.rejects(db.exec(sql),/catalog changed since review/);
    await db.exec('ROLLBACK TO SAVEPOINT stale_review');
    console.log('PASS: reviewed catalog preserves hidden intent, observes numeric zero, separates dry matter, rejects stale snapshots, and publishes only reviewed rows');
  } finally {await db.exec('ROLLBACK; RESET ROLE');}
}
