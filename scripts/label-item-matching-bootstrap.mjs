import assert from 'node:assert/strict';
// Actual current guarded schema, including automatic identity/readiness triggers.
export async function assertLabelItemMatchingOnBootstrap(db){
 await db.exec('BEGIN');
 try{
  await db.exec(`INSERT INTO ingredients(id,name_ko,risk_level) VALUES('00000000-0000-4000-8000-000000000091','Synthetic hold grain','safe');
  INSERT INTO products(id,name,brand_name,product_type,target_pet_type,is_visible,verification_status) VALUES('00000000-0000-4000-8000-000000000092','Synthetic hold product','Synthetic','food','dog',false,'pending');
  INSERT INTO product_ingredient_label_sets(id,product_id,raw_label_text,source_reference,is_current) VALUES('00000000-0000-4000-8000-000000000093','00000000-0000-4000-8000-000000000092','Synthetic hold grain','https://fixture.invalid/label',true);
  INSERT INTO product_ingredient_label_items(id,label_set_id,display_order,raw_ingredient_text) VALUES('00000000-0000-4000-8000-000000000094','00000000-0000-4000-8000-000000000093',0,'Synthetic hold grain');`);
  const review=(await db.query("SELECT admin_get_label_comparison_review('00000000-0000-4000-8000-000000000092') r")).rows[0].r;
  assert.equal(review.snapshot.labels[0].items[0].match,'matched');
  await db.exec('SET LOCAL ROLE service_role');
  await db.query("SELECT admin_review_label_item_match('00000000-0000-4000-8000-000000000092',$1,'00000000-0000-4000-8000-000000000094','hold',NULL,NULL,NULL,'ambiguous source held','synthetic-admin')",[review.revision]);
  await db.exec('RESET ROLE');
  await db.exec("UPDATE product_ingredient_label_items SET updated_at=clock_timestamp() WHERE id='00000000-0000-4000-8000-000000000094'");
  const held=(await db.query("SELECT admin_get_label_item_workspace('00000000-0000-4000-8000-000000000092') r")).rows[0].r;
  assert.equal(held.review.snapshot.labels[0].items[0].match,'unreviewed');assert.equal(held.decisions[0].currentSource,true);assert.equal(held.review.eligible,false);
 }finally{await db.exec('ROLLBACK');}
}
