import { JSDOM, VirtualConsole } from 'jsdom';
import { normalizeBarcode } from '../src/lib/productIdentity.ts';

function textWithBreaks(node) {
  const copy=node.cloneNode(true);
  copy.querySelectorAll('br').forEach(br=>br.replaceWith('\n'));
  return copy.textContent.replace(/[ \t]+/g,' ').trim();
}

export function readEvolveChickenCat(sourceUrl,html) {
  if(sourceUrl!=='https://evolvepetfood.com/dry-cat-food/evolve-classic-chicken-brown-rice-recipe-cat-food')throw new Error('Unsupported Evolve identity');
  const window=new JSDOM(html).window;
  try{
    const d=window.document;
    if(normalizeTitle(d.querySelector('h1.ProductItem-details-title')?.textContent)!==normalizeTitle('Evolve Classic Chicken & Brown Rice Cat Food'))throw new Error('Evolve current product mismatch');
    const excerpt=d.querySelector('.ProductItem-details-excerpt');if(!excerpt)throw new Error('Missing current product excerpt');
    const section=title=>{const h=[...excerpt.querySelectorAll('h2')].find(h=>h.textContent.trim()===title);if(!h)throw new Error('Missing '+title);const text=[];for(let e=h.nextElementSibling;e&&!/^H[1-6]$/.test(e.tagName);e=e.nextElementSibling)text.push(textWithBreaks(e));return text.join('\n').replace(/\n-$/,'').trim();};
    const ingredientsText=section('Ingredients');const nutritionText=section('Guaranteed Analysis');const energy=section('Calorie Content').match(/([0-9]+)\s*kcal\/kg/);
    return{title:'Evolve Classic Chicken & Brown Rice Cat Food',species:'cat',language:'en',ingredientsText,nutritionText,nutrients:parseGuaranteedNutrition(nutritionText),kcalPer100g:energy?Number(energy[1])/10:null,packs:[],formulation:'건식',veterinaryOnly:false};
  }finally{window.close();}
}

export function readOrijenOriginal(sourceUrl,html) {
  if(sourceUrl!=='https://apac.orijenpetfoods.com/en/dogs/dog-food/ap-ori-ds-original-dog.html')throw new Error('Unsupported Orijen identity');
  const window=new JSDOM(html).window;
  try{
    const d=window.document;
    if(normalizeTitle(d.querySelector('h1')?.textContent)!=='originaldrydogfood'||d.querySelectorAll('.ingredients-list').length!==1||d.querySelectorAll('.analysis').length!==1)throw new Error('Orijen product scope mismatch');
    const area=d.querySelector('.ingredients-list');const ingredientsText=area.querySelector('p')?.textContent.trim();
    const nutritionText=[...d.querySelectorAll('.analysis li')].map(textWithBreaks).join('\n');
    const energy=area.textContent.match(/([0-9]+)\s*kcal\/kg/);
    if(!ingredientsText||!energy)throw new Error('Missing original formula ingredients/energy');
    return{title:'오리지널 도그',species:'dog',language:'en',ingredientsText,nutritionText,nutrients:parseGuaranteedNutrition(nutritionText),kcalPer100g:Number(energy[1])/10,packs:[],formulation:'건식',veterinaryOnly:false};
  }finally{window.close();}
}

export const normalizeTitle = value => String(value ?? '').normalize('NFKC').toLowerCase().replace(/[^a-z0-9가-힣]/g, '');

export function readInabaKorea(sourceUrl, html, expectedCode) {
  const url=new URL(sourceUrl);
  if(!['inabapetfood.co.kr','www.inabapetfood.co.kr'].includes(url.host)||url.pathname!=='/shop/item.php'||!/^\d+$/.test(url.searchParams.get('it_id')??''))throw Error('Unsupported Inaba source');
  const window=new JSDOM(html).window;
  try {
    const d=window.document,title=d.querySelector('#sit_title')?.textContent.trim();
    if(!title?.startsWith('[CAT]'))throw Error('Inaba species/current heading requires review');
    const tables=[...d.querySelectorAll('table[id="sit_inf_open"]')].filter(t=>t.textContent.includes('원재료'));
    const read=t=>Object.fromEntries([...t.querySelectorAll('tr')].flatMap(tr=>{const cells=[...tr.querySelectorAll('th,td')];return cells.length===2?[[cells[0].textContent.trim(),cells[1].textContent.trim()]]:[];}));
    const all=tables.map(read);
    if(!all.length||all.some(row=>JSON.stringify(row)!==JSON.stringify(all[0])))throw Error('Missing/conflicting current Inaba label tables');
    const data=all[0],barcode=normalizeBarcode(data['JAN코드(단품)']);
    if(data['품번']!==expectedCode||!barcode||!data['원재료']||!data['주요성분'])throw Error('Inaba model/label identity mismatch');
    return{title:title.replace(/ 요약정보 및 구매$/,''),species:'cat',language:'ko',ingredientsText:data['원재료'],nutritionText:data['주요성분'],nutrients:parseGuaranteedNutrition(data['주요성분']),packs:[{barcode,size:data['내용량'],level:'manufacturer individual retail pack; not reseller outer bundle'}],sourceProductId:expectedCode};
  }finally{window.close();}
}

export function readBonacibo(sourceUrl,html) {
  const expected={
    'https://www.bonacibo.com/bonacibo-kitten-chicken/':'Bonacibo Kitten',
    'https://www.bonacibo.com/bonacibo-adult-cat-lamb-rice/':'Bonacibo Adult Cat Lamb & Rice',
  }[sourceUrl];
  if(!expected)throw Error('Unsupported Bonacibo recipe');
  const window=new JSDOM(html,{virtualConsole:new VirtualConsole()}).window;
  try {
    const d=window.document;
    if(normalizeTitle(d.querySelector('h1')?.textContent)!==normalizeTitle(expected))throw Error('Bonacibo recipe mismatch');
    const tables=[...d.querySelectorAll('table')].filter(t=>/Protein/.test(t.textContent)&&/Fat Content/.test(t.textContent)&&/Crude Ash/.test(t.textContent));
    if(tables.length!==1)throw Error('Ambiguous analytical table');
    const keys={'Protein':'crude_protein','Fat Content':'crude_fat','Crude Ash':'crude_ash','Crude Fibre':'crude_fiber'};
    const nutrients=[...tables[0].querySelectorAll('tr')].flatMap(tr=>{
      const cells=[...tr.querySelectorAll('td')].map(e=>e.textContent.trim());const key=keys[cells[0]];
      if(!key)return[];const value=cells[1]?.match(/^%\s*(\d+(?:[.,]\d+)?)$/);
      if(!value||Number(value[1].replace(',','.'))>100)throw Error('Invalid analytical percent');
      return[{key,value:Number(value[1].replace(',','.')),qualifier:'unspecified',raw:cells.join(': ')}];
    });
    if(nutrients.length!==4)throw Error('Incomplete analytical table');
    return{title:expected,species:'cat',nutrients,nutritionText:tables[0].textContent.trim()};
  }finally{window.close();}
}

export function readHillsMatchingPackage(sourceUrl, html, expectedUpcs) {
  const url=new URL(sourceUrl);
  if(url.origin!=='https://www.hillspet.com'||!/^\/(cat|dog)-food\//.test(url.pathname))throw Error('Unsupported Hill\'s source');
  const window=new JSDOM(html,{virtualConsole:new VirtualConsole()}).window;
  try {
    const d=window.document;
    const gtins=[...d.head.querySelectorAll('meta[name="upcUnit"]')].map(e=>normalizeBarcode(e.content)).filter(Boolean);
    const shared=expectedUpcs.map(normalizeBarcode).filter(g=>g&&gtins.includes(g));
    if(!shared.length)throw Error('No shared root package UPC');
    const panels=[...d.querySelectorAll('[data-cmp-hook-accordion="item"]')];
    const ingredientPanels=panels.filter(e=>e.querySelector('.cmp-accordion__title')?.textContent.trim()==='Ingredients');
    if(ingredientPanels.length!==1)throw Error('Ambiguous Hill\'s current ingredient panel');
    const segments=[...ingredientPanels[0].querySelectorAll('.text-segments .segment')].map(e=>e.textContent.trim()).filter(Boolean);
    if(segments.length!==1||segments[0].length<60)throw Error('Missing complete Hill\'s ingredient text');
    const nutrientPanel=panels.find(e=>e.querySelector('.cmp-accordion__title')?.textContent.trim()==='Average Nutrient & Caloric Content');
    const tables=[...(nutrientPanel?.querySelectorAll('table')??[])].filter(t=>/Dry Matter/.test(t.querySelector('tr')?.textContent??''));
    if(tables.length!==1)throw Error('Missing explicit dry matter basis');
    const rows=[...tables[0].querySelectorAll('tr')].slice(1).map(tr=>[...tr.querySelectorAll('td')].map(td=>td.textContent.trim()));
    const keys={Protein:'protein',Fat:'fat','Crude Fiber':'crude_fiber',Calcium:'calcium',Phosphorus:'phosphorus'};
    const measurements=rows.flatMap(([label,amount])=>{
      if(!keys[label])return[];const m=amount?.match(/^(\d+(?:\.\d+)?)\s*%$/);
      if(!m||Number(m[1])>100)throw Error('Invalid dry-matter percentage');
      return[{nutrientCode:keys[label],value:Number(m[1]),unit:'g/100g',basis:'dry_matter',qualifier:'unspecified',raw:label+': '+amount+'; explicit Dry Matter % table'}];
    });
    if(!measurements.some(m=>m.nutrientCode==='protein')||!measurements.some(m=>m.nutrientCode==='fat'))throw Error('Incomplete dry-matter table');
    return{title:d.querySelector('h1')?.textContent.trim(),ingredientsText:segments[0],sharedGtins:shared,measurements,dryMatterText:tables[0].textContent.trim()};
  }finally{window.close();}
}

// Only the current PDP's root product is authoritative. Related products, JSON-LD
// recommendations and arbitrary 13-digit strings are deliberately not searched.
export function readRoyalCaninProduct(sourceUrl, html, country = 'kr') {
  const url = new URL(sourceUrl);
  const locales = { kr: 'ko_KR', my: 'ms_MY', uk: 'en_GB' };
  if (!locales[country] || url.origin !== 'https://www.royalcanin.com' || !new RegExp('^/' + country + '/(dogs|cats)/products/(retail-products|vet-products)/').test(url.pathname)) throw new Error('Unsupported Royal Canin locale/source');
  const match = url.pathname.match(/-([0-9]+)(?:\/v[0-9]+)?$/);
  if (!match) throw new Error('Missing official formula identity');
  const window = new JSDOM(html).window;
  try {
    const root = JSON.parse(window.document.querySelector('#__NEXT_DATA__')?.textContent ?? 'null');
    const product = root?.props?.pageProps?.productData?.response;
    if (!product || String(product.mainItem) !== match[1] || product.locale !== locales[country]) throw new Error('Current official product/locale does not match URL');
    const species = url.pathname.startsWith('/' + country + '/dogs/') ? 'dog' : 'cat';
    if (!product.species?.includes(species)) throw new Error('Official species does not match URL');
    const heading = window.document.querySelector('h1')?.textContent;
    if (!heading || normalizeTitle(heading) !== normalizeTitle(product.title)) throw new Error('Rendered product heading mismatch');
    const packs = (product.packs ?? []).map(pack => ({ barcode: normalizeBarcode(pack.ean), size: String(pack.size ?? '').trim() })).filter(pack => pack.barcode && pack.size);
    const ingredients = (product.nutritionalInfo ?? []).find(item => item.title === 'pa.nutritionalInformation.composition')?.description?.trim() ?? '';
    // Korean PDPs place their explicit percentage guarantees in the additives
    // field. Keep this bounded to this product's nutrition, never feeding tables.
    const inline = ingredients.match(/ANALYTICAL CONSTITU(?:E|A)NTS\s*:\s*([\s\S]*?)(?=FEEDING INSTRUCTIONS:|For RSA:|$)/i)?.[1];
    const analysis = [(product.nutritionalInfo ?? []).filter(item => /analytical|guaranteed|\.additives$/i.test(item.title)).map(item => item.description ?? '').join('\n'), inline ?? ''].filter(Boolean).join('\n');
    return { title: product.title.trim(), sourceProductId: String(product.mainItem), species, packs, ingredientsText: ingredients, nutritionText: analysis,
      formulation: product.subCategory === 'dry_food' ? '건식' : product.subCategory === 'wet_food' ? '습식' : null,
      image: product.images?.[0]?.url ?? null, veterinaryOnly: product.isVetProduct === true };
  } finally { window.close(); }
}

// Volume measurements are retained in their own dimension. No density is
// assumed, and these values must never be written to percentage profiles.
export function parseVolumeNutrition(text) {
  if (!/ANALYTICAL CONSTITU(?:E|A)NTS:\s*\(per 100\s*mL\)/i.test(text) || /dry matter|건물\s*기준/i.test(text)) return [];
  const names = { protein: 'Protein', fat: 'Fat content', crude_fiber: 'Crude fibre', ash: 'Crude ash', moisture: 'Moisture', calcium: 'Calcium', phosphorus: 'Phosphorus' };
  return Object.entries(names).flatMap(([nutrientCode, name]) => {
    const matches = [...text.matchAll(new RegExp('(?:^|:| - )\\s*' + name + ':\\s*([0-9]+(?:\\.[0-9]+)?)\\s*g(?=\\s*(?:-|$))', 'gi'))];
    if (!matches.length) return [];
    const values = new Set(matches.map(m => Number(m[1])));
    if (values.size !== 1 || [...values][0] > 1000) throw new Error('Conflicting/out-of-range volume value: ' + nutrientCode);
    return [{ nutrientCode, value: [...values][0], unit: 'g/100mL', basis: 'as_fed', qualifier: 'unspecified', raw: matches[0][0].trim() }];
  });
}

export function assertSharedRoyalPackage(korea, foreign) {
  if (korea.sourceProductId !== foreign.sourceProductId || korea.species !== foreign.species) throw new Error('Different formula or species');
  const shared = korea.packs.filter(k => foreign.packs.some(f => f.barcode === k.barcode));
  if (!shared.length) throw new Error('No identical package GTIN');
  return shared;
}

export function parseGuaranteedNutrition(text) {
  if (/dry matter|건물\s*기준/i.test(text)) throw new Error('Dry-matter values are not as-fed guarantees');
  const analyticalText=text.replace(/(^|\n)\s*ANALYTICAL CONSTITU(?:E|A)NTS\s*:/gi,'$1');
  const labels = { crude_protein: ['조단백질', '조단백', '단백질', 'Crude protein', 'Protein'], crude_fat: ['조지방', '지방', 'Fat content', 'Crude fat'], crude_fiber: ['조섬유', 'Crude fibres', 'Crude fiber', 'Crude fibre'], crude_ash: ['조회분', 'Crude ash', 'Ash'], moisture: ['수분', 'Moisture'], calcium: ['칼슘', 'Calcium'], phosphorus: ['인', 'Phosphorus'] };
  const values = [];
  for (const [key, names] of Object.entries(labels)) {
    const escaped = names.map(name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const pattern = new RegExp('(?:^|[,;·\\n]| - )\\s*(?:' + escaped + ')\\s*(?:\\((min(?:imum)?|max(?:imum)?)\\.?\\))?\\s*[-:：]?\\s*([0-9]+(?:\\.[0-9]+)?)\\s*%\\s*(?:\\(?\\s*(이상|이하|min(?:imum)?|max(?:imum)?)\\.?\\)?)?', 'gi');
    const found = [...analyticalText.matchAll(pattern)].map(m => {
      const qualifier=q=>/^(이상|min)/i.test(q??'')?'minimum':/^(이하|max)/i.test(q??'')?'maximum':'unspecified';
      if(m[1]&&m[3]&&qualifier(m[1])!==qualifier(m[3]))throw new Error('Conflicting qualifier: '+key);
      return {key,value:Number(m[2]),qualifier:qualifier(m[1]??m[3]),raw:m[0].trim()};
    });
    if (found.some(item => item.value > 100) || new Set(found.map(item => `${item.value}:${item.qualifier}`)).size > 1) throw new Error('Conflicting/out-of-range guaranteed value: ' + key);
    if (found.length) values.push(found[0]);
  }
  return values;
}
