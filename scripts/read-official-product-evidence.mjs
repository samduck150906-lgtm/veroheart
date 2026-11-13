import { JSDOM } from 'jsdom';
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

// Only the current PDP's root product is authoritative. Related products, JSON-LD
// recommendations and arbitrary 13-digit strings are deliberately not searched.
export function readRoyalCaninProduct(sourceUrl, html) {
  const url = new URL(sourceUrl);
  if (url.origin !== 'https://www.royalcanin.com' || !/^\/kr\/(dogs|cats)\/products\/(retail-products|vet-products)\//.test(url.pathname)) throw new Error('Unsupported Royal Canin locale/source');
  const match = url.pathname.match(/-([0-9]+)(?:\/v[0-9]+)?$/);
  if (!match) throw new Error('Missing official formula identity');
  const window = new JSDOM(html).window;
  try {
    const root = JSON.parse(window.document.querySelector('#__NEXT_DATA__')?.textContent ?? 'null');
    const product = root?.props?.pageProps?.productData?.response;
    if (!product || String(product.mainItem) !== match[1] || product.locale !== 'ko_KR') throw new Error('Current official product/locale does not match URL');
    const species = url.pathname.startsWith('/kr/dogs/') ? 'dog' : 'cat';
    if (!product.species?.includes(species)) throw new Error('Official species does not match URL');
    const heading = window.document.querySelector('h1')?.textContent;
    if (!heading || normalizeTitle(heading) !== normalizeTitle(product.title)) throw new Error('Rendered product heading mismatch');
    const packs = (product.packs ?? []).map(pack => ({ barcode: normalizeBarcode(pack.ean), size: String(pack.size ?? '').trim() })).filter(pack => pack.barcode && pack.size);
    const ingredients = (product.nutritionalInfo ?? []).find(item => item.title === 'pa.nutritionalInformation.composition')?.description?.trim() ?? '';
    // Korean PDPs place their explicit percentage guarantees in the additives
    // field. Keep this bounded to this product's nutrition, never feeding tables.
    const analysis = (product.nutritionalInfo ?? []).filter(item => /analytical|guaranteed|\.additives$/i.test(item.title)).map(item => item.description ?? '').join('\n');
    return { title: product.title.trim(), sourceProductId: String(product.mainItem), species, packs, ingredientsText: ingredients, nutritionText: analysis,
      formulation: product.subCategory === 'dry_food' ? '건식' : product.subCategory === 'wet_food' ? '습식' : null,
      image: product.images?.[0]?.url ?? null, veterinaryOnly: product.isVetProduct === true };
  } finally { window.close(); }
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
