import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

// This generator is a repository data transformation, not an external source
// verification. Version and byte hash identify exactly which reference was used.
const bytes = await readFile(new URL('../src/data/standard_feed_2022.json',import.meta.url));
const dataset = JSON.parse(bytes);
const hash = createHash('sha256').update(bytes).digest('hex');
const definitions = [
 ['composition','수분','moisture','mass','g/100g'],['composition','건물','dry_matter','mass','g/100g'],
 ['composition','조단백질','protein','mass','g/100g'],['composition','조지방','fat','mass','g/100g'],
 ['composition','조회분','ash','mass','g/100g'],['composition','CF','crude_fiber','mass','g/100g'],
 ...['NDF','ADF','NFC','NFE','리그닌','전분'].map((name,index)=>['composition',name,['ndf','adf','nfc','nfe','lignin','starch'][index],'mass','g/100g']),
 ['energy','총에너지','gross_energy','energy','Mcal/kg'],
 ...['알라닌','아지닌','아스파트산','시스틴','글루탐산','글라이신','히스티딘','아이소류신','류신','라이신','메티오닌','페닐알라닌','프롤린','세린','트레오닌','트립토판','타이로신','발린'].map((name,index)=>['aminoAcids',name,'aa_'+['alanine','arginine','aspartate','cystine','glutamate','glycine','histidine','isoleucine','leucine','lysine','methionine','phenylalanine','proline','serine','threonine','tryptophan','tyrosine','valine'][index],'mass','g/100g']),
 ...['칼슘','인','칼륨','나트륨','마그네슘','철','망간','아연','구리'].map((name,index)=>['minerals',name,['calcium','phosphorus','potassium','sodium','magnesium','iron','manganese','zinc','copper'][index],'mass',index>=5?'mg/kg':'g/100g']),
 ['vitamins','비타민 A','vitamin_a','activity','1000IU/kg'],['vitamins','비타민 D','vitamin_d','activity','1000IU/kg'],['vitamins','비타민 E','vitamin_e','mass','mg/kg'],
];
const sourceUrl='https://www.nongsaro.go.kr/portal/ps/psz/psza/contentMain.ps?menuId=PS03263';
const values=[];
for(const item of dataset.items){
 const c=item.values.composition??{};
 const proximate=['수분','조단백질','조지방','조회분','CF'].map(key=>c[key]);
 const bad=proximate.every(value=>typeof value==='number') && proximate.reduce((a,b)=>a+b,0)>100.5;
 const mineralMass=definitions.filter(([group])=>group==='minerals').reduce((sum,[group,name,,,unit])=>
   sum+(item.values[group]?.[name]??0)/(unit==='mg/kg'?10000:1),0);
 const mineralBad=mineralMass+(c['수분']??0)>100.5;
 for(const [group,name,code,,unit] of definitions){
   const value=item.values[group]?.[name];
   if(typeof value!=='number'||!Number.isFinite(value)||value<0)continue;
   const invalid=bad || (group==='minerals'&&mineralBad) || (unit==='g/100g'&&value>100) || (unit==='mg/kg'&&value>1e6);
   const basis=dataset.groups.find(g=>g.key===group)?.nutrients.find(n=>n.key===name)?.basis;
   if(!['as_fed','dry_matter'].includes(basis))throw new Error(`Missing source basis: ${group}.${name}`);
   values.push({material_name:item.name_ko,nutrient_code:code,value,unit,basis,
     source_locator:`entry ${item.id}; ${group}.${name}`,quality:invalid?'inconsistent':'reference',
     quality_note:invalid?'원본의 일반성분·무기질 질량 합계 또는 단일 수치 범위가 맞지 않아 계산에서 제외합니다.':'원료 참고표 수치이며 제품의 실제 배합·표시 함량을 보장하지 않습니다.'});
 }
}
const quote=value=>"'"+value.replaceAll("'","''")+"'";
if(JSON.stringify(values).includes('$material_refs$'))throw new Error('SQL delimiter appears in reference data');
const materials=dataset.items.map(item=>({name:item.name_ko,english:item.name_en}));
if(JSON.stringify(materials).includes('$reference_materials$'))throw new Error('SQL delimiter appears in material data');
const schema=await readFile(new URL('./material-reference-schema.sql',import.meta.url),'utf8');
const sql=schema+`\nINSERT INTO public.nutrient_definitions(code,name_ko,dimension,definition) VALUES\n`+
 definitions.map(([,name,code,dimension])=>`(${[code,name,dimension,'한국표준사료성분표 2022 원료 참고 항목. 제품 표시값 및 개·고양이 소화율과 구분합니다.'].map(quote).join(',')})`).join(',\n')+
 `\nON CONFLICT(code) DO NOTHING;\n`+
 `-- Reference identities carry no legacy risk grade or approval. Reuse an exact, unambiguous existing identity, including approved aliases.\n`+
 `WITH materials AS (SELECT * FROM jsonb_to_recordset($reference_materials$${JSON.stringify(materials)}$reference_materials$::jsonb) r(name text,english text))\n`+
 `INSERT INTO public.canonical_ingredients(canonical_name_ko,canonical_name_en,normalized_key,category,description,status,identity_key)\n`+
 `SELECT name,english,public.normalize_ingredient_identity(name),'원료 참고표','한국표준사료성분표의 원료 동일성입니다. 개·고양이 안전성, 소화율, 제품 함량 또는 검수 완료를 뜻하지 않습니다.','active','reference-2022:'||public.normalize_ingredient_identity(name)\n`+
 `FROM materials m WHERE NOT EXISTS(SELECT 1 FROM private.material_identity_terms t WHERE t.term='strict:'||private.material_identity_strict_key(m.name)) ON CONFLICT DO NOTHING;\n`+
 `WITH source_rows AS (SELECT * FROM jsonb_to_recordset($material_refs$${JSON.stringify(values)}$material_refs$::jsonb) AS r(material_name text,nutrient_code text,value numeric,unit text,basis text,source_locator text,quality text,quality_note text))\n`+
 `INSERT INTO public.material_nutrient_references(canonical_ingredient_id,nutrient_code,value,unit,basis,source_url,source_version,source_sha256,source_locator,quality,quality_note)\n`+
 `SELECT c.id,r.nutrient_code,r.value,r.unit,r.basis,${quote(sourceUrl)},'repository standard_feed_2022.json',${quote(hash)},r.source_locator,r.quality,r.quality_note\n`+
 `FROM source_rows r JOIN LATERAL(SELECT (array_agg(DISTINCT t.canonical_id))[1] id FROM private.material_identity_terms t\n`+
 `WHERE t.term='strict:'||private.material_identity_strict_key(r.material_name) HAVING count(DISTINCT t.canonical_id)=1) c ON true;\n`+
 `DO $$ BEGIN IF (SELECT count(*) FROM public.material_nutrient_references WHERE source_sha256=${quote(hash)})<>${values.length} THEN RAISE EXCEPTION 'Reference material identity coverage is incomplete'; END IF; END $$;\n`+
 `-- Positive measured starch is linked to the carbohydrate graph. Reference amounts remain in the source table, not a product amount.\n`+
 `INSERT INTO public.material_constituent_evidence(canonical_ingredient_id,constituent_code,relation,source_url,source_version,source_locator,note)\n`+
 `SELECT r.canonical_ingredient_id,'starch','contains',r.source_url,r.source_version,r.source_locator,'동일한 원료 형태의 참고표에서 전분이 관찰되었습니다. 제품 내 함량·소화율을 의미하지 않습니다.' FROM public.material_nutrient_references r\n`+
 `WHERE r.nutrient_code='starch' AND r.value>0 AND r.quality='reference' ON CONFLICT DO NOTHING;\n`;
await writeFile(process.argv[2]??new URL('../.artifacts/material-reference-seed.sql',import.meta.url),sql);
console.log(JSON.stringify({sourceMaterials:dataset.items.length,definitions:definitions.length,referenceValues:values.length,excludedValues:values.filter(v=>v.quality==='inconsistent').length,sha256:hash}));
