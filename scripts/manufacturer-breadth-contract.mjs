import assert from 'node:assert/strict';
import { buildBreadthSql, prepareBreadthManifest } from './build-manufacturer-breadth-sql.mjs';

export async function assertManufacturerBreadth(db) {
  const source = { brand: '트릿테이블', name: 'Synthetic beverage fixture', species: 'dog', productType: 'snack', sourceType: 'manufacturer',
    sourceUrl: 'https://dogttfood.cafe24.com/product/synthetic-fixture/9000001/', sourceProductId: '9000001',
    sourceListUrl: 'https://dogttfood.cafe24.com/', sourceListSha256: 'a'.repeat(64), documentSha256: 'b'.repeat(64),
    retrievedAt: '2026-11-17T00:00:00Z', market: 'KR', sourceCaveat: 'Synthetic fixture in disposable database only', subCategory: '음료' };
  await db.exec("SET request.jwt.claim.role='service_role'");
  const hidden = (await db.query('SELECT public.import_official_catalog_product($1::jsonb) AS r', [JSON.stringify(source)])).rows[0].r;
  assert.equal(hidden.status, 'created');
  assert.equal((await db.query('SELECT verification_status FROM public.products WHERE id=$1', [hidden.productId])).rows[0].verification_status, 'pending');
  await db.query('UPDATE public.products SET is_visible=false WHERE id=$1', [hidden.productId]);
  const fresh = { ...source, sourceUrl: source.sourceUrl.replace('9000001','9000002'), sourceProductId: '9000002', name: 'Synthetic second fixture' };
  const japanese={...source,brand:'이나바',sourceUrl:'https://www.inaba-petfood.co.jp/product/detail/synthetic-fixture/9000003',sourceProductId:'9000003',name:'CIAO ちゅ～るまぐろ',species:'cat',market:'JP',labelFacts:[['原材料Ingredients','まぐろ、ビタミンE'],['保証成分値Nutriton Facts','たんぱく質7.0％以上、水分91.0％以下']]};
  const otherJapanese={...japanese,sourceUrl:japanese.sourceUrl.replace('9000003','9000004'),sourceProductId:'9000004',name:'CIAO ちゅ～るかつお'};
  const manifest=prepareBreadthManifest({products:[source,fresh,japanese,otherJapanese]});
  await db.exec(buildBreadthSql(manifest, 'c'.repeat(64)));
  const old=(await db.query('SELECT is_visible,verification_status FROM public.products WHERE id=$1',[hidden.productId])).rows[0];
  assert.deepEqual(old,{is_visible:false,verification_status:'pending'});
  const added=(await db.query("SELECT * FROM public.products WHERE catalog_source_url=$1",[fresh.sourceUrl])).rows[0];
  assert.equal(added.verification_status,'reviewed'); assert.equal(added.analysis_status,'unavailable');
  assert.equal(added.sub_category,'음료');
  const audit=(await db.query("SELECT * FROM private.manufacturer_breadth_review_audit WHERE product_id=$1",[added.id])).rows[0];
  assert.equal(audit.before_product.verification_status,'pending');assert.equal(audit.after_product.verification_status,'reviewed');
  const evidence=(await db.query("SELECT e.nutrient_code,e.qualifier,e.unit,e.basis FROM public.product_nutrient_evidence e JOIN public.products p ON p.id=e.product_id WHERE p.catalog_source_url=$1 ORDER BY e.nutrient_code",[japanese.sourceUrl])).rows;
  assert.deepEqual(evidence,[{nutrient_code:'moisture',qualifier:'maximum',unit:'g/100g',basis:'as_fed'},{nutrient_code:'protein',qualifier:'minimum',unit:'g/100g',basis:'as_fed'}]);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM public.products WHERE catalog_source_url=ANY($1::text[])',[[japanese.sourceUrl,otherJapanese.sourceUrl]])).rows[0].n,2,'Japanese flavor names must not collapse to the same Latin-only identity');
  await db.exec(buildBreadthSql(manifest, 'c'.repeat(64)));
  assert.equal((await db.query('SELECT count(*)::int AS n FROM public.products WHERE catalog_source_url=$1',[fresh.sourceUrl])).rows[0].n,1);
  console.log('PASS manufacturer breadth: explicit reviewed identity, unavailable analysis, preserved hidden intent, idempotent replay and audit');
}
