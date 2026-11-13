import test from 'node:test';
import assert from 'node:assert/strict';
import { readRoyalCaninProduct, readEvolveChickenCat, readOrijenOriginal, parseGuaranteedNutrition } from './read-official-product-evidence.mjs';
const url = 'https://www.royalcanin.com/kr/dogs/products/vet-products/glycobalance-small-dogs-8073';
const product = { mainItem: 8073, locale:'ko_KR', species:['dog'], title:'글리코밸런스 스몰독', packs:[{ean:'3182551101744',size:'1.5 kg'},{ean:'3182551101775',size:'4 kg'},{ean:'1234567890123',size:'bogus'}], nutritionalInfo:[{title:'pa.nutritionalInformation.composition',description:'보리, 밀 글루텐'}], recommendedProducts:{mixFeeding:[{ean:'9003579051122',nutritionalInfo:[{title:'analytical',description:'조단백 99%'}]}]} };
const page = data => '<h1>글리코밸런스 스몰독</h1><script id="__NEXT_DATA__" type="application/json">'+JSON.stringify({props:{pageProps:{productData:{response:data}}}})+'</script>';
test('only current formula packs; no recommendation EAN or nutrient leakage',()=>{const got=readRoyalCaninProduct(url,page(product)); assert.deepEqual(got.packs.map(p=>p.barcode),['3182551101744','3182551101775']); assert.equal(got.nutritionText,''); assert.equal(got.ingredientsText,'보리, 밀 글루텐');});
test('reject redirected/mismatched formula, locale, species or heading',()=>{for(const change of [{mainItem:4015},{locale:'en_GB'},{species:['cat']},{title:'Other food'}]) assert.throws(()=>readRoyalCaninProduct(url,page({...product,...change})));});
test('preserve explicit min/max guarantees and decimal values',()=>{assert.deepEqual(parseGuaranteedNutrition('조단백 22.0% 이상, 조지방 16.0% 이상, 조섬유 2.5% 이하').map(v=>[v.key,v.value,v.qualifier]),[['crude_protein',22,'minimum'],['crude_fat',16,'minimum'],['crude_fiber',2.5,'maximum']]);});
test('do not coerce dry matter, non-percent units or conflicting guarantees',()=>{assert.throws(()=>parseGuaranteedNutrition('Dry Matter Protein 40%')); assert.deepEqual(parseGuaranteedNutrition('칼슘 120 mg/kg, 인산염 40%'),[]); assert.throws(()=>parseGuaranteedNutrition('조단백 22% 이상, 조단백 25% 이상'));});
test('preserve English guarantees with qualifier before amount',()=>{assert.deepEqual(parseGuaranteedNutrition('Crude protein (min.) 38%\nCrude fat (min) - 18%\nMoisture (max.) 12%').map(x=>[x.key,x.value,x.qualifier]),[['crude_protein',38,'minimum'],['crude_fat',18,'minimum'],['moisture',12,'maximum']]);});
test('Evolve current excerpt is isolated from related recipe excerpts',()=>{
 const html='<h1 class="ProductItem-details-title">Evolve Classic Chicken &amp; Brown Rice Cat Food</h1><div class="ProductItem-details-excerpt"><h2>Ingredients</h2><p>Chicken, Rice</p><h2>Guaranteed Analysis</h2><p>Crude Protein (min) - 32.0%<br>Crude Fat (min) - 13.0%</p><h2>Calorie Content</h2><p>3588 kcal/kg (ME)</p></div><div class="summary-excerpt"><h2>Guaranteed Analysis</h2><p>Crude Protein (min) - 99%</p></div>';
 const got=readEvolveChickenCat('https://evolvepetfood.com/dry-cat-food/evolve-classic-chicken-brown-rice-recipe-cat-food',html);
 assert.equal(got.ingredientsText,'Chicken, Rice');assert.equal(got.nutrients[0].value,32);assert.equal(got.kcalPer100g,358.8);
});
test('Orijen refuses multiple ingredient panels instead of combining recipes',()=>{
 assert.throws(()=>readOrijenOriginal('https://apac.orijenpetfoods.com/en/dogs/dog-food/ap-ori-ds-original-dog.html','<h1>OriginalDry Dog Food</h1><div class="ingredients-list"></div><div class="ingredients-list"></div><div class="analysis"></div>'));
});
