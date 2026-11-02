import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateCandidate, buildImportPreview } from './import-official-catalog.mjs';
const candidate={sourceUrl:'https://www.royalcanin.com/kr/cats/products/retail-products/kitten-2522',sourceType:'manufacturer',sourceProductId:'2522',name:'키튼',brand:'로얄캐닌',species:'cat',productType:'food',retrievedAt:'2026-10-26T12:00:00Z',ingredientsText:'닭고기, 쌀',nutritionText:'조단백 36% 이상',sourceCaveat:'실제 포장 대조 필요',veterinaryOnly:false};
test('rejects facility records and untrusted/invalid source identities',()=>{
 assert.throws(()=>validateCandidate({...candidate,name:'제조회사 (인천 공개 #23)'}));
 assert.throws(()=>validateCandidate({...candidate,sourceUrl:'https://evil.example/kr/kitten'}));
 assert.throws(()=>validateCandidate({...candidate,species:'unknown'}));
});
test('deduplicates source products and keeps nutrition unverified',()=>{
 const result=buildImportPreview([candidate,candidate],[]);
 assert.equal(result.candidates.length,1);assert.equal(result.newProducts,1);
 assert.equal(result.candidates[0].analysisStatus,'unavailable');assert.equal(result.candidates[0].verificationStatus,'pending');
 assert.equal(result.candidates[0].caloriesPer100g,undefined);
});
test('recognizes existing same-species names without reusing another species',()=>{
 const result=buildImportPreview([candidate],[{id:'cat',name:'로얄캐닌 키튼',brand_name:'로얄캐닌',target_pet_type:'cat',is_visible:true}]);
 assert.equal(result.newProducts,0);assert.equal(result.candidates[0].action,'link_observation');
 assert.equal(buildImportPreview([candidate],[{id:'dog',name:'키튼',brand_name:'로얄캐닌',target_pet_type:'dog'}]).newProducts,1);
});

const hills = { ...candidate, brand: '힐스', name: '키튼 치킨 레시피', sourceProductId: 'science-diet-kitten-original-dry', sourceUrl: 'https://www.hillspet.co.kr/cat-food/science-diet-kitten-original-dry' };
test('accepts Hill\'s official page identity while retaining the Royal Canin source', () => {
 const preview = buildImportPreview([candidate, hills], []);
 assert.equal(preview.newProducts, 2);
 assert.equal(preview.candidates[1].analysisStatus, 'unavailable');
 assert.equal(preview.candidates[1].verificationStatus, 'pending');
});
test('rejects mismatched Hill\'s brand, slug, species, and untrusted URL variants', () => {
 for (const change of [
  { brand: '로얄캐닌' }, { sourceProductId: 'invented-id' }, { species: 'dog' },
  { sourceUrl: hills.sourceUrl + '?redirect=elsewhere' },
  { sourceUrl: hills.sourceUrl.replace('www.hillspet.co.kr', 'www.hillspet.co.kr.evil.example') },
 ]) assert.throws(() => validateCandidate({ ...hills, ...change }));
});
test('matches an existing hidden Hill\'s product for observation instead of recreating it', () => {
 const preview = buildImportPreview([hills], [{ id: 'hidden-hills', name: '힐스 키튼 치킨 레시피', brand_name: '힐스', target_pet_type: 'cat', is_visible: false }]);
 assert.equal(preview.newProducts, 0);
 assert.equal(preview.candidates[0].action, 'link_observation');
 assert.equal(preview.candidates[0].existingProductId, 'hidden-hills');
});
test('the prepared Hill\'s subset has distinct identities and leaves label facts absent', async () => {
 const source = JSON.parse(await readFile(new URL('../data/catalog/hills-kr-2026-10-26.json', import.meta.url), 'utf8'));
 const preview = buildImportPreview(source.products, []);
 assert.equal(preview.candidates.length, source.products.length);
 assert.equal(new Set(source.products.map(p => p.sourceUrl)).size, source.products.length);
 for (const product of preview.candidates) {
  assert.ok(product.sourceTitle && product.sourceCaveat);
  assert.equal(product.packageBarcodes, undefined);
  assert.equal(product.ingredientsText, undefined);
  assert.equal(product.nutritionText, undefined);
  assert.equal(product.caloriesPer100g, undefined);
 }
});
