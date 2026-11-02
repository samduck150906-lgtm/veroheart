// Local-only readonly SDK transport fixture backed by actual PGlite SQL/RLS.
// It implements the tested subset, NOT PostgREST/Auth/hosted Supabase.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { parseProjection, assertPublicProductProjectionContract } from '../../scripts/product-projection-contract.mjs';
const db=new PGlite();
await db.exec(await readFile(new URL('schema.sql',import.meta.url),'utf8'));
await db.exec(await readFile(new URL('../../supabase/migration_drafts/restore_product_source_contract.sql',import.meta.url),'utf8'));
await db.exec("UPDATE products SET requires_veterinary_guidance=true,catalog_source_url='https://manufacturer.example/fixture',catalog_source_note='합성 출처' WHERE id='10000000-0000-4000-8000-000000000006'");
console.log('Fixture contract',await assertPublicProductProjectionContract(db));
await db.exec('SET ROLE anon');
let mode='normal';let blockedWrites=0;let requests=0;
const ident=s=>{if(!/^[a-z_][a-z_0-9]*$/.test(s))throw Error('invalid identifier');return `"${s}"`;};
const relation={products:{product_ingredients:['product_id','id',false],product_ingredient_label_sets:['product_id','id',false],nutritional_profiles:['product_id','id',false]},
 product_ingredients:{ingredients:['id','ingredient_id',true]},product_ingredient_label_sets:{product_ingredient_label_items:['label_set_id','id',false]},
 product_ingredient_label_items:{ingredients:['id','legacy_ingredient_id',true],canonical_ingredients:['id','canonical_ingredient_id',true]},canonical_ingredients:{ingredients:['id','legacy_ingredient_id',true]}};
let aliases=0;
function projection(table,alias,tree){const pairs=[];for(const n of tree){pairs.push(`'${n.name}'`);
 if(!n.children)pairs.push(`${alias}.${ident(n.name)}`);
 else{const [foreign,local,one]=relation[table]?.[n.name]??[];if(!foreign)throw Error('unsupported relationship');const next=`a${++aliases}`;
 const body=projection(n.name,next,n.children);pairs.push(one?`(SELECT ${body} FROM ${ident(n.name)} ${next} WHERE ${next}.${ident(foreign)}=${alias}.${ident(local)} LIMIT 1)`:
 `(SELECT COALESCE(jsonb_agg(${body}),'[]'::jsonb) FROM ${ident(n.name)} ${next} WHERE ${next}.${ident(foreign)}=${alias}.${ident(local)})`);}}
 return `jsonb_build_object(${pairs.join(',')})`;}
function conditions(params,args){const where=[];for(const [key,value]of params){if(['select','order','limit','offset'].includes(key))continue;
 if(value.startsWith('eq.')){args.push(value.slice(3));where.push(`p.${ident(key)}=$${args.length}`);}
 else if(value.startsWith('in.(')){const values=value.slice(4,-1).split(',').map(x=>x.replace(/^"|"$/g,''));const slots=values.map(v=>{args.push(v);return `$${args.length}`;});where.push(`p.${ident(key)} IN(${slots})`);}
 else throw Error('unsupported filter');}return where.length?' WHERE '+where.join(' AND '):'';}
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json','Access-Control-Allow-Origin':'http://127.0.0.1:4179'});res.end(JSON.stringify(data));}
const root=resolve('.artifacts/browser-app');
const server=createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://127.0.0.1:4179');
 if(url.pathname==='/__fixture/control'&&req.method==='POST'){let body='';for await(const chunk of req)body+=chunk;mode=JSON.parse(body).mode;return json(res,200,{mode});}
 if(url.pathname==='/__fixture/status')return json(res,200,{mode,blockedWrites,requests});
 if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
 const isSearch=url.pathname==='/rest/v1/rpc/search_catalog_products'&&req.method==='POST';
 if(!['GET','HEAD'].includes(req.method)&&!isSearch){blockedWrites++;return json(res,405,{error:'fixture is read only'});}
 if(url.pathname.startsWith('/rest/v1/')){
  requests++;
  if(isSearch){let body='';for await(const chunk of req)body+=chunk;const input=JSON.parse(body);
   if(mode==='empty')return json(res,200,[]);
   const args=[`%${input.p_query??''}%`];let where=' WHERE (name ILIKE $1 OR brand_name ILIKE $1)';
   if(input.p_category){args.push(input.p_category);where+=` AND main_category=$${args.length}`;}
   const rows=(await db.query(`SELECT id product_id,1 rank FROM products${where} ORDER BY id LIMIT 100 OFFSET ${Math.max(0,Number(input.p_offset)||0)}`,args)).rows;
   return json(res,200,rows);
  }
  const table=url.pathname.slice('/rest/v1/'.length);
  if(!['products','ingredients','product_categories','app_settings','product_ratings'].includes(table))return json(res,404,{error:'unsupported fixture resource'});
  if(table==='products'&&mode==='failure')return json(res,400,{code:'42703',message:'synthetic schema failure'});
  if(table==='products'&&mode==='partial'&&url.searchParams.get('select')==='brand_name')return json(res,503,{code:'FIXTURE_FAILURE',message:'synthetic brands failure'});
  const args=[];const where=conditions(url.searchParams,args);const select=url.searchParams.get('select')??'id';
  aliases=0;const expr=projection(table,'p',parseProjection(select));
  const limit=Math.min(100,Math.max(1,Number(url.searchParams.get('limit'))||100));
  const rows=(await db.query(`SELECT ${expr} value FROM ${ident(table)} p${where} LIMIT ${limit}`,args)).rows.map(r=>r.value);
  if(req.headers.accept?.includes('vnd.pgrst.object+json'))return rows.length===1?json(res,200,rows[0]):json(res,406,{code:'PGRST116',details:`The result contains ${rows.length} rows`,message:'Cannot coerce'});
  return json(res,200,rows);
 }
 let file=resolve(root,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(root))return json(res,403,{});
 try{if(!(await stat(file)).isFile())file=resolve(root,'index.html');}catch{file=resolve(root,'index.html');}
 const type={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'}[extname(file)]??'application/octet-stream';
 res.writeHead(200,{'Content-Type':type});res.end(await readFile(file));
}catch(error){json(res,500,{error:error.message});}});
server.listen(4179,'127.0.0.1',()=>console.log('READY http://127.0.0.1:4179 local fixtures only'));
process.on('SIGTERM',()=>server.close(()=>void db.close()));
