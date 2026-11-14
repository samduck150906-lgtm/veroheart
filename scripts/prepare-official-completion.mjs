import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parseArgs} from 'node:util';
import path from 'node:path';
import {readRoyalCaninProduct,readEvolveChickenCat,readOrijenOriginal,parseGuaranteedNutrition,normalizeTitle} from './read-official-product-evidence.mjs';
import {parseIngredientLabelItems} from '../src/analysis/labelIngredientParser.ts';
const{values:args}=parseArgs({options:Object.fromEntries(['capture','inventory','quality-before','pages','out','catalog-out'].map(key=>[key,{type:'string'}]))});
if(Object.values(args).length!==6||Object.values(args).some(v=>!v))throw new Error('Required: --capture --inventory --quality-before --pages --out --catalog-out');
const input=JSON.parse(await readFile(args.capture,'utf8'));
const inventory=JSON.parse(await readFile(args.inventory,'utf8')).rows[0].inventory;
const beforeQuality=JSON.parse(await readFile(args['quality-before'],'utf8')).rows[0].audit;
const accepted=[],deferred=[];
for(const row of input.results){
 try{
  if(!row.captured||row.error)throw new Error(row.error??'Document capture failed');
  const raw=await readFile(path.join(args.pages,row.documentSha256+'.html'));
  if(createHash('sha256').update(raw).digest('hex')!==row.documentSha256)throw new Error('Document hash mismatch');
  let data;
  if(new URL(row.sourceUrl).host==='www.royalcanin.com'){data=readRoyalCaninProduct(row.sourceUrl,raw.toString('utf8'));try{data.nutrients=parseGuaranteedNutrition(data.nutritionText);}catch(error){data.nutrients=[];data.nutritionIssue=error.message;}data.language='ko';}
  else if(new URL(row.sourceUrl).host==='evolvepetfood.com')data=readEvolveChickenCat(row.sourceUrl,raw.toString('utf8'));
  else if(new URL(row.sourceUrl).host==='apac.orijenpetfoods.com')data=readOrijenOriginal(row.sourceUrl,raw.toString('utf8'));
  else throw new Error('Captured official document; requires publisher-specific extraction/identity review');
  const boundary=data.ingredientsText.search(/조단백|ANALYTICAL CONSTITUENTS/i);
  data.ingredientsText=(boundary>=0?data.ingredientsText.slice(0,boundary):data.ingredientsText).split('※')[0].trim();
  data.items=parseIngredientLabelItems(data.ingredientsText).map(p=>({...p,normalizedText:p.baseText.normalize('NFKC').toLowerCase().replace(/\s+/g,''),matchStatus:'unreviewed'}));
  if(data.items.length>100)throw new Error('Ingredient item bounds');
  if(data.items.length<2){data.ingredientsIssue='Official PDP has no complete ingredient list';data.ingredientsText='';data.items=[];}
  for(const id of row.productIds){
   const product=inventory.products.find(p=>p.id===id);
   if(data.species!==product.target_pet_type)throw new Error('Product species conflict');
   if(product.brand_name==='로얄캐닌'&&normalizeTitle(product.display_name||product.name)!==normalizeTitle(data.title))throw new Error('Stored title requires review');
   const {nutrition,barcodes,current_labels,...before}=product;
   accepted.push({...row,...data,evidence:undefined,before,productId:id,
    previousNutrition:nutrition??[],previousLabels:current_labels??[],
    labelChanged:data.items.length>0&&current_labels?.[0]?.raw_label_text!==data.ingredientsText,
    observationId:uuid('official-completion-observation:'+id+row.documentSha256),
    labelRequestId:uuid('official-completion-label:'+id+row.documentSha256)});
  }
 }catch(error){deferred.push({url:row.sourceUrl,productIds:row.productIds,reason:error.message,documentSha256:row.documentSha256,observedAt:row.observedAt});}
}
function uuid(value){const h=createHash('sha256').update(value).digest('hex');return[h.slice(0,8),h.slice(8,12),h.slice(12,16),h.slice(16,20),h.slice(20,32)].join('-');}
const barcodeOwners=new Map();
for(const product of inventory.products)for(const b of product.barcodes??[]){const s=barcodeOwners.get(b.barcode)??new Set();s.add(product.id);barcodeOwners.set(b.barcode,s);}
for(const row of accepted)for(const b of row.packs){const s=barcodeOwners.get(b.barcode)??new Set();s.add(row.productId);barcodeOwners.set(b.barcode,s);}
const conflicts=[];
for(const row of accepted){row.packs=row.packs.filter(b=>{const others=[...barcodeOwners.get(b.barcode)].filter(id=>id!==row.productId);if(others.length){conflicts.push({productId:row.productId,barcode:b.barcode,otherIds:others});return false;}return true;});}
const synthetic=inventory.products.filter(p=>p.created_at.startsWith('2026-05-16T03:40:')&&p.legacy_source==='internal'&&p.image_url?.startsWith('https://images.unsplash.com/')&&/^\[[^\]]+\] .+ (?:[1-7]kg|[1-5][0-9]{2}g|[1-5][0-9]p)$/.test(p.name)&&!p.catalog_source_url);
if(synthetic.length!==800)throw new Error('Synthetic provenance audit needs review: '+synthetic.length);
const manifest={capturedAt:new Date().toISOString(),inventoryCapturedAt:inventory.captured_at,accepted,deferred,barcodeConflicts:conflicts,
 syntheticAudit:{historicalCommit:'8e900c91931f44c81e3430e94d56b806e2c74ebe',historicalPath:'generate_mock_products.py',action:'retain rows and all missing fields; mark blocked with actual provenance; do not replace by another product',products:synthetic.map(p=>({id:p.id,name:p.name,brand:p.brand_name,before:p,queueBefore:beforeQuality.queue.find(q=>q.product_id===p.id)}))}};
await writeFile(args.out,JSON.stringify(manifest,null,2));
await writeFile(args['catalog-out'],JSON.stringify({...manifest,accepted:accepted.map(({before,previousNutrition,previousLabels,...row})=>row),syntheticAudit:{...manifest.syntheticAudit,products:manifest.syntheticAudit.products.map(({before,queueBefore,...p})=>p)}},null,2)+'\n');
console.log(JSON.stringify({accepted:accepted.length,packs:accepted.reduce((n,x)=>n+x.packs.length,0),withNutrition:accepted.filter(x=>x.nutrients.length).length,nutrientValues:accepted.reduce((n,x)=>n+x.nutrients.length,0),changedLabels:accepted.filter(x=>x.labelChanged).length,barcodeConflicts:conflicts,synthetic:synthetic.length,deferred:deferred.map(x=>({url:x.url,reason:x.reason}))},null,2));
