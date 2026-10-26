import { test } from 'node:test';
import assert from 'node:assert/strict';
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
