import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parseArgs} from 'node:util';
import {readRoyalCaninProduct,normalizeTitle,parseGuaranteedNutrition} from './read-official-product-evidence.mjs';
const {values:args}=parseArgs({options:{inventory:{type:'string'},pages:{type:'string'},out:{type:'string'}}});
if(!args.inventory||!args.pages||!args.out)throw new Error('Required: --inventory <read-only DB export> --pages <capture directory> --out <capture manifest>');
const inventory=JSON.parse(await readFile(args.inventory,'utf8')).rows[0].inventory;
const grouped=Object.groupBy(inventory.products.filter(p=>p.catalog_source_url),p=>p.catalog_source_url);
const allow=new Set(['www.royalcanin.com','www.hillspet.co.kr','wooriwa.com','evolvepetfood.com','www.bonacibo.com','forcans.co.kr','naturalcore.co.kr','apac.orijenpetfoods.com']);
const urls=Object.keys(grouped).filter(url=>allow.has(new URL(url).host));
const dir=args.pages; await mkdir(dir,{recursive:true});
const results=[];let next=0;let checkpoint=Promise.resolve();
async function worker(){while(next<urls.length){const url=urls[next++];const row={sourceUrl:url,productIds:grouped[url].map(p=>p.id)};
 try{const response=await fetch(url,{signal:AbortSignal.timeout(30000),redirect:'follow'});row.status=response.status;row.finalUrl=response.url;row.observedAt=new Date().toISOString();
 if(!response.ok)throw new Error('HTTP '+response.status);
 if(!allow.has(new URL(response.url).host))throw new Error('Unexpected redirect origin');
 const raw=Buffer.from(await response.arrayBuffer());if(raw.length>8*1024*1024)throw new Error('Document exceeds capture bound');
 row.documentSha256=createHash('sha256').update(raw).digest('hex');await writeFile(dir+'/'+row.documentSha256+'.html',raw);
 if(new URL(url).host==='www.royalcanin.com'){
   row.evidence=readRoyalCaninProduct(url,raw.toString('utf8'));
   for(const p of grouped[url]){if(normalizeTitle(p.display_name||p.name)!==normalizeTitle(row.evidence.title))throw new Error('Stored title requires explicit identity review');if(p.target_pet_type!==row.evidence.species)throw new Error('Stored species conflict');}
   try{row.evidence.nutrients=parseGuaranteedNutrition(row.evidence.nutritionText);}catch(error){row.evidence.nutrients=[];row.evidence.nutritionIssue=error.message;}
 }
 row.captured=true;
 }catch(error){row.error=error.message;}
 results.push(row);if(results.length%25===0)console.log(JSON.stringify({captured:results.length,total:urls.length,validated:results.filter(x=>x.evidence&&!x.error).length}));
 const serialized=JSON.stringify({startedFrom:inventory.captured_at,results},null,2);
 checkpoint=checkpoint.then(async()=>{await writeFile(args.out+'.tmp',serialized);await rename(args.out+'.tmp',args.out);});
 await checkpoint;
}}
await Promise.all(Array.from({length:4},worker));
console.log(JSON.stringify({total:results.length,royalValidated:results.filter(x=>x.evidence&&!x.error).length,errors:results.filter(x=>x.error).map(x=>({url:x.sourceUrl,error:x.error})),packs:results.filter(x=>!x.error).reduce((n,x)=>n+(x.evidence?.packs.length??0),0)}));
