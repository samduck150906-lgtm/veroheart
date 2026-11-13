import test from 'node:test';
import assert from 'node:assert/strict';
import { readRoyalCaninProduct, readEvolveChickenCat, readOrijenOriginal, parseGuaranteedNutrition, parseVolumeNutrition, assertSharedRoyalPackage, readInabaKorea, readBonacibo, readHillsMatchingPackage, parseGermanAnalyticalNutrition } from './read-official-product-evidence.mjs';
const url = 'https://www.royalcanin.com/kr/dogs/products/vet-products/glycobalance-small-dogs-8073';
const product = { mainItem: 8073, locale:'ko_KR', species:['dog'], title:'글리코밸런스 스몰독', packs:[{ean:'3182551101744',size:'1.5 kg'},{ean:'3182551101775',size:'4 kg'},{ean:'1234567890123',size:'bogus'}], nutritionalInfo:[{title:'pa.nutritionalInformation.composition',description:'보리, 밀 글루텐'}], recommendedProducts:{mixFeeding:[{ean:'9003579051122',nutritionalInfo:[{title:'analytical',description:'조단백 99%'}]}]} };
const page = data => '<h1>글리코밸런스 스몰독</h1><script id="__NEXT_DATA__" type="application/json">'+JSON.stringify({props:{pageProps:{productData:{response:data}}}})+'</script>';
test('German explicit analysis keeps decimal commas, locale, source terms and excludes feeding values',()=>{
 const got=readRoyalCaninProduct(url.replace('/kr/','/de/'),page({...product,locale:'de_DE',nutritionalInfo:[{title:'pa.nutritionalInformation.analyticalConstituants',description:'ANALYTISCHE BESTANDTEILE: Protein: 30,0% - Rohfaser: 16,6% - Fettgehalt: 9,5% - Rohasche: 5,7%'}]}),'de');
 const values=parseGermanAnalyticalNutrition(got.nutritionText+' GEBRAUCHSANWEISUNG: Protein: 99%');
 assert.deepEqual(values.map(v=>[v.nutrientCode,v.value]),[['protein',30],['fat',9.5],['crude_fiber',16.6],['ash',5.7]]);
 assert.ok(values.every(v=>v.qualifier==='unspecified'&&v.basis==='as_fed'));
 assert.throws(()=>parseGermanAnalyticalNutrition('Protein: 30%'),/Missing explicit/);
 assert.throws(()=>parseGermanAnalyticalNutrition('ANALYTISCHE BESTANDTEILE: Protein: 30% - Protein: 31%'),/Conflicting/);
 assert.throws(()=>readRoyalCaninProduct(url.replace('/kr/','/de/'),page(product),'de'),/locale/);
});
test('only current formula packs; no recommendation EAN or nutrient leakage',()=>{const got=readRoyalCaninProduct(url,page(product)); assert.deepEqual(got.packs.map(p=>p.barcode),['3182551101744','3182551101775']); assert.equal(got.nutritionText,''); assert.equal(got.ingredientsText,'보리, 밀 글루텐');});
test('read embedded analytical section without importing feeding or RSA guarantees',()=>{
 const got=readRoyalCaninProduct(url,page({...product,nutritionalInfo:[{title:'pa.nutritionalInformation.composition',description:'COMPOSITION: rice. ANALYTICAL CONSTITUENTS: Protein: 30.0% - Fat content: 13.0%. FEEDING INSTRUCTIONS: 99% For RSA: Crude protein (min) 280 g/kg'}]}));
 assert.deepEqual(parseGuaranteedNutrition(got.nutritionText).map(x=>x.value),[30,13]);
 assert.doesNotMatch(got.nutritionText,/RSA|99/);
});
test('foreign page requires its exact locale and shared root package GTIN',()=>{
 const kr=readRoyalCaninProduct(url,page(product));const myUrl=url.replace('/kr/','/my/');
 assert.throws(()=>readRoyalCaninProduct(myUrl,page(product),'my'));
 const my=readRoyalCaninProduct(myUrl,page({...product,locale:'ms_MY'}),'my');
 assert.equal(assertSharedRoyalPackage(kr,my).length,2);
 assert.throws(()=>assertSharedRoyalPackage(kr,{...my,packs:[{barcode:'9003579051122',size:'1kg'}]}));
 assert.throws(()=>assertSharedRoyalPackage(kr,{...my,sourceProductId:'9999'}));
});
test('retain liquid grams per 100mL without projecting to mass percentages',()=>{
 const text='ANALYTICAL CONSTITUENTS: (per 100 mL): Protein: 5.0 g - Crude fibre: 0.0 g - Fat content: 8.0 g - Crude ash: 1.0 g - Moisture: 79.2 g - Calcium: 0.15 g - Phosphorus: 0.11 g - Metabolisable energy: 1.5 kcal/mL.';
 const got=parseVolumeNutrition(text);assert.equal(got.length,7);assert.equal(got.find(x=>x.nutrientCode==='protein').value,5);assert.ok(got.every(x=>x.unit==='g/100mL'));
 assert.deepEqual(parseGuaranteedNutrition(text),[]);assert.deepEqual(parseVolumeNutrition('Protein: 5 g - Fat content: 8 g'),[]);
 assert.throws(()=>parseVolumeNutrition(text+' - Protein: 6 g'));
});
test('reject redirected/mismatched formula, locale, species or heading',()=>{for(const change of [{mainItem:4015},{locale:'en_GB'},{species:['cat']},{title:'Other food'}]) assert.throws(()=>readRoyalCaninProduct(url,page({...product,...change})));});
test('preserve explicit min/max guarantees and decimal values',()=>{assert.deepEqual(parseGuaranteedNutrition('조단백 22.0% 이상, 조지방 16.0% 이상, 조섬유 2.5% 이하').map(v=>[v.key,v.value,v.qualifier]),[['crude_protein',22,'minimum'],['crude_fat',16,'minimum'],['crude_fiber',2.5,'maximum']]);});
test('do not coerce dry matter, non-percent units or conflicting guarantees',()=>{assert.throws(()=>parseGuaranteedNutrition('Dry Matter Protein 40%')); assert.deepEqual(parseGuaranteedNutrition('칼슘 120 mg/kg, 인산염 40%'),[]); assert.throws(()=>parseGuaranteedNutrition('조단백 22% 이상, 조단백 25% 이상'));});
test('preserve English guarantees with qualifier before amount',()=>{assert.deepEqual(parseGuaranteedNutrition('Crude protein (min.) 38%\nCrude fat (min) - 18%\nMoisture (max.) 12%').map(x=>[x.key,x.value,x.qualifier]),[['crude_protein',38,'minimum'],['crude_fat',18,'minimum'],['moisture',12,'maximum']]);});
test('bilingual duplicate guarantees agree when English uses suffix parentheses',()=>{const got=parseGuaranteedNutrition('조단백 28% 이상, 조지방 15% 이상\nANALYTICAL CONSTITUENTS: Crude protein 28% (min.), Crude fat 15% (min.)');assert.deepEqual(got.map(x=>[x.key,x.value,x.qualifier]),[['crude_protein',28,'minimum'],['crude_fat',15,'minimum']]);});
test('English analytical percentages are separate from per-100mL gram measurements',()=>{assert.equal(parseGuaranteedNutrition('ANALYTICAL CONSTITUENTS: Protein: 30.0% - Fat content: 20.0% - Crude ash: 7.2% - Crude fibres: 2.0%.').length,4);assert.deepEqual(parseGuaranteedNutrition('ANALYTICAL CONSTITUENTS: (per 100 mL): Protein: 5 g - Fat content: 8 g'),[]);assert.throws(()=>parseGuaranteedNutrition('Crude protein (min) 24% (max.)'));});
test('Evolve current excerpt is isolated from related recipe excerpts',()=>{
 const html='<h1 class="ProductItem-details-title">Evolve Classic Chicken &amp; Brown Rice Cat Food</h1><div class="ProductItem-details-excerpt"><h2>Ingredients</h2><p>Chicken, Rice</p><h2>Guaranteed Analysis</h2><p>Crude Protein (min) - 32.0%<br>Crude Fat (min) - 13.0%</p><h2>Calorie Content</h2><p>3588 kcal/kg (ME)</p></div><div class="summary-excerpt"><h2>Guaranteed Analysis</h2><p>Crude Protein (min) - 99%</p></div>';
 const got=readEvolveChickenCat('https://evolvepetfood.com/dry-cat-food/evolve-classic-chicken-brown-rice-recipe-cat-food',html);
 assert.equal(got.ingredientsText,'Chicken, Rice');assert.equal(got.nutrients[0].value,32);assert.equal(got.kcalPer100g,358.8);
});
test('Orijen refuses multiple ingredient panels instead of combining recipes',()=>{
 assert.throws(()=>readOrijenOriginal('https://apac.orijenpetfoods.com/en/dogs/dog-food/ap-ori-ds-original-dog.html','<h1>OriginalDry Dog Food</h1><div class="ingredients-list"></div><div class="ingredients-list"></div><div class="analysis"></div>'));
});
test('Korean Inaba model and individual-pack JAN are isolated from recommendations',()=>{
 const table='<table id="sit_inf_open"><tr><th>품번</th><td>SC-71</td></tr><tr><th>원재료</th><td>참치, 참치추출물</td></tr><tr><th>주요성분</th><td>조단백질 7%이상, 조지방 0.2%이상</td></tr><tr><th>내용량</th><td>14g * 4ea</td></tr><tr><th>JAN코드(단품)</th><td>4901133716577</td></tr></table>';
 const html='<h2 id="sit_title">[CAT] 챠오츄르 4P-참치 요약정보 및 구매</h2>'+table+table+'<aside>SC-149 4901133719004 조단백질 99%</aside>';
 const got=readInabaKorea('https://inabapetfood.co.kr/shop/item.php?it_id=1614735879',html,'SC-71');
 assert.equal(got.packs[0].barcode,'4901133716577');assert.equal(got.nutrients[0].value,7);
 assert.throws(()=>readInabaKorea('https://inabapetfood.co.kr/shop/item.php?it_id=1614735879',html,'SC-149'));
});
test('Bonacibo prefix percentages and decimal commas retain analytical values without invented guarantees',()=>{
 const html='<h1>Bonacibo Kitten</h1><table>'+[['Protein','% 38'],['Fat Content','% 18'],['Crude Ash','% 8'],['Crude Fibre','% 2,5']].map(r=>'<tr>'+r.map(c=>'<td>'+c+'</td>').join('')+'</tr>').join('')+'</table>';
 const got=readBonacibo('https://www.bonacibo.com/bonacibo-kitten-chicken/',html);
 assert.equal(got.nutrients[3].value,2.5);assert.ok(got.nutrients.every(n=>n.qualifier==='unspecified'));
 assert.throws(()=>readBonacibo('https://www.bonacibo.com/bonacibo-adult-cat-lamb-rice/',html));
});
test('Hill\'s current ingredient panel requires identical root UPC and keeps dry matter separate',()=>{
 const panel=(title,content)=>'<div data-cmp-hook-accordion="item"><span class="cmp-accordion__title">'+title+'</span>'+content+'</div>';
 const html='<head><meta name="upcUnit" content="052742567006"></head><body><h1>a/d</h1>'+panel('Ingredients','<div class="text-segments"><div class="segment">Turkey giblets, water, pork liver, chicken, corn flour, fish oil, calcium carbonate.</div></div>')+panel('Average Nutrient & Caloric Content','<table><tr><td>Nutrient</td><td>Dry Matter %</td></tr><tr><td>Protein</td><td>44 %</td></tr><tr><td>Fat</td><td>31 %</td></tr></table>')+'<aside>Ingredients: unrelated recipe</aside></body>';
 const url='https://www.hillspet.com/cat-food/prescription-diet-ad-urgent-care-canned';
 const got=readHillsMatchingPackage(url,html,['052742567006']);
 assert.equal(got.sharedGtins[0],'0052742567006');assert.ok(got.measurements.every(m=>m.basis==='dry_matter'));assert.doesNotMatch(got.ingredientsText,/unrelated/);
 assert.throws(()=>readHillsMatchingPackage(url,html,['052742945309']),/No shared/);
});
