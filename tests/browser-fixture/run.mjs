import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
const base='http://127.0.0.1:4179';const out='.artifacts/browser-results';await mkdir(out,{recursive:true});
const child=spawn(process.execPath,['tests/browser-fixture/server.mjs'],{stdio:['ignore','pipe','pipe']});
let logs='';child.stdout.on('data',c=>{logs+=c;});child.stderr.on('data',c=>{logs+=c;});
const records=[];let browser;
try{
 await new Promise((resolve,reject)=>{const started=Date.now();const timer=setInterval(()=>{if(logs.includes('READY')){clearInterval(timer);resolve();}else if(child.exitCode!==null||Date.now()-started>30000){clearInterval(timer);reject(Error(logs||'fixture server timeout'));}},100);});
 browser=await chromium.launch(process.env.PLAYWRIGHT_CHROME_CHANNEL?{channel:process.env.PLAYWRIGHT_CHROME_CHANNEL}:{headless:true});
 const setMode=async mode=>{const r=await fetch(base+'/__fixture/control',{method:'POST',body:JSON.stringify({mode})});assert.equal(r.status,200);};
 const id=n=>`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
 for(const width of [390,1280]){
  const context=await browser.newContext({viewport:{width,height:900}});
  await context.route('**/*',route=>{const u=new URL(route.request().url());return u.hostname==='127.0.0.1'||u.protocol==='data:'?route.continue():route.abort();});
  const p=await context.newPage();
  p.on('pageerror',e=>{logs+='\nBROWSER '+e.message;});
  async function evidence(name,expected){await p.getByText(expected,{exact:false}).first().waitFor({timeout:20000});
   const text=await p.locator('body').innerText();assert.doesNotMatch(text,/믹스 없이 바로 급여 가능/);
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await p.screenshot({path:`${out}/${width}-${name}.png`,fullPage:true});records.push({width,name,passed:true});}
  await setMode('normal');await p.goto(base);await evidence('home','기준 참고 제품');
  await p.getByRole('button',{name:'전체 제품 찾아보기',exact:true}).click();
  await p.getByRole('button',{name:/상세 보기$/}).first().waitFor();
  await evidence('search','원료 기준 참고');
  await p.getByRole('button',{name:/합성 테스트 영양 없음.*상세 보기$/}).click();
  await p.waitForURL('**/product/**');
  await evidence('detail-none','영양정보 부족으로 영양 균형');
  await p.locator('button').filter({hasText:/원료 기준 참고.*등급/}).first().click();
  await p.waitForURL('**/analysis*');await evidence('analysis-none','원료 기준 참고 등급');
  // Real SPA navigation preserves the real store's guest recent-view tracking.
  await p.evaluate(()=>{history.pushState({},'','/recent');dispatchEvent(new PopStateEvent('popstate'));});
  await evidence('recent','1개 · 최근 본 순');
  for(const [n,name,expected]of [[2,'partial','일부 영양 포함 참고'],[3,'basic','원료·기초 영양 참고'],[4,'deficit','기준 미달'],[5,'danger','위험 등급'],[6,'veterinary','수의사 상담']]){
   await p.goto(`${base}/product/${id(n)}`);await evidence('detail-'+name,expected);
   const text=await p.locator('body').innerText();
   if(n===3)assert.ok(!text.includes('영양정보 부족으로'));
   await p.goto(`${base}/analysis?productId=${id(n)}`);await evidence('analysis-'+name,n===5?'위험 성분':expected);
  }
  await p.goto(`${base}/product/${id(1)}?fixtureAllergy=1`);await evidence('allergy','급여를 권하지 않습니다');
  await p.goto(`${base}/analysis?productId=${id(4)}&fixtureAllergy=1`);await evidence('combined-warnings','급여를 권하지 않습니다');
  assert.ok((await p.locator('body').innerText()).includes('기준 미달'));
  await p.goto(base+'/brand/'+encodeURIComponent('합성브랜드'));await evidence('brand','전체 제품 (6)');
  await p.goto(base+'/__fixture/comparison');await evidence('comparison-fixture','원료 기준 참고');
  await setMode('failure');await p.goto(`${base}/product/${id(1)}`);await evidence('query-failure','제품 조회에 실패했습니다');
  assert.doesNotMatch(await p.locator('body').innerText(),/42703|synthetic schema failure/);
  await setMode('normal');await p.goto(`${base}/product/${id(7)}`);await evidence('hidden-product','제품을 찾을 수 없습니다');
  await setMode('empty');await p.goto(base+'/search');await evidence('empty-search','검색 결과가 없습니다');
  assert.equal(await p.getByRole('button',{name:/상세 보기$/}).count(),0);
  await setMode('partial');await p.goto(base+'/brand/'+encodeURIComponent('합성브랜드'));await evidence('partial-failure','등록된 제품이 없는 것으로 판정하지 않았습니다');
  assert.equal(await p.getByText('총 리뷰 수').evaluate(e=>e.nextElementSibling.textContent),'—');
  await setMode('review-failure');await p.goto(`${base}/product/${id(3)}`);await evidence('review-failure','후기를 불러오지 못했습니다');
  assert.ok((await p.locator('body').innerText()).includes('원료·기초 영양 참고'));
  assert.equal(await p.getByText('아직 별점이 없습니다. 첫 별점을 남겨 주세요.').count(),0);
  await context.close();
 }
 const status=await (await fetch(base+'/__fixture/status')).json();assert.equal(status.blockedWrites,0);assert.ok(status.requests>0);
 await writeFile(out+'/results.json',JSON.stringify({records,status,localPGlite:true,transportAdapterNotPostgREST:true,authBootstrapSynthetic:true},null,2));
 console.log(JSON.stringify({passed:true,cases:records.length,blockedWrites:status.blockedWrites,localSqlRequests:status.requests}));
}catch(error){await writeFile(out+'/failure.txt',String(error.stack)+'\n'+logs);throw error;}
finally{await browser?.close();child.kill('SIGTERM');}
