import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {test} from 'node:test';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import {guard,verifyPicomatch} from './patch-picomatch.mjs';
import {auditFindings} from './audit-dependencies.mjs';

export function assertPicomatchRuntime(root=process.cwd()){
 const files=verifyPicomatch(root);
 for(const file of files){
  const entry=path.resolve(file,'../../index.js');
  const pm=createRequire(import.meta.url)(entry);
  for(const [value,pattern,expected]of [['src/main.ts','src/**/*.ts',true],['src/main.js','src/**/*.ts',false],['a.ts','*.{ts,tsx}',true],['foo','@(foo|bar)',true],['aa','+(a)',true],['bar','!(foo)',true]])assert.equal(pm.isMatch(value,pattern),expected,pattern);
  const child=spawnSync(process.execPath,['-e',`const pm=require(process.argv[1]);for(const p of ['+(*)','+(*a)','*(*)','*(*a)','prefix+(*a)suffix','+(a*)','+(?a)','+([ab]*)'])for(const options of [{},{maxExtglobRecursion:false}])pm(p,options)('a'.repeat(48)+'!');`,entry],{timeout:2000,encoding:'utf8'});
  assert.equal(child.status,0,child.error?.message||child.stderr);
 }
 return files.length;
}
if(process.argv.includes('--runtime-only')){
 console.log(JSON.stringify({picomatchRuntimeRegression:true,copies:assertPicomatchRuntime()}));
}else{
 test('installed mitigation resists repeated extglob ReDoS and retains project globs',()=>assertPicomatchRuntime());
 test('missing patch and unexpected upstream source fail closed; install is idempotent',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'veroro-picomatch-'));
  try{
   fs.writeFileSync(path.join(root,'package-lock.json'),JSON.stringify({packages:{'node_modules/picomatch':{version:'4.0.7'}}}));
   const file=path.join(root,'node_modules/picomatch/lib/parse.js');fs.mkdirSync(path.dirname(file),{recursive:true});
   const original=fs.readFileSync(verifyPicomatch()[0],'utf8').replace(guard,'');fs.writeFileSync(file,original);
   assert.throws(()=>verifyPicomatch(root),/Missing picomatch mitigation/);
   verifyPicomatch(root,true);verifyPicomatch(root,true);verifyPicomatch(root);
   fs.appendFileSync(file,'\n// Unexpected modification');
   assert.throws(()=>verifyPicomatch(root,true),/Unexpected picomatch source/);
  }finally{
   if(path.dirname(root)!==path.resolve(os.tmpdir())||!path.basename(root).startsWith('veroro-picomatch-'))throw new Error('Invalid fixture cleanup path');
   fs.rmSync(root,{recursive:true,force:true});
  }
 });
 test('audit gate only permits the exact mitigated advisory, including propagated findings',()=>{
  const known={source:111111,url:'https://github.com/advisories/GHSA-fc5q-39xc-vjpf',severity:'high'};
  const fixture={picomatch:{severity:'high',via:[known]},vite:{severity:'high',via:['picomatch']}};
  assert.deepEqual(auditFindings(fixture),[]);
  assert.deepEqual(auditFindings({...fixture,picomatch:{severity:'high',via:[known,{url:'https://github.com/advisories/NEW',severity:'moderate'}]}}).sort(),['picomatch','vite']);
  assert.deepEqual(auditFindings({other:{severity:'critical',via:[{url:'https://example.com/new'}]}}),['other']);
  assert.deepEqual(auditFindings({other:{severity:'high',via:['missing']}}),['other']);
 });
}
