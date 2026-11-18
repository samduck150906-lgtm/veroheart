// Audit all dependencies. The sole temporary exception requires an exact source
// patch AND the bounded runtime exploit regression, checked on every invocation.
// New advisories and unpatched/tampered installations still fail the build.
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {verifyPicomatch} from './patch-picomatch.mjs';
const known='https://github.com/advisories/GHSA-fc5q-39xc-vjpf';
export function auditFindings(vulnerabilities){
 const allowed=(name,visited=new Set())=>{
  const item=vulnerabilities[name];if(!item||visited.has(name)||!item.via?.length)return false;
  const next=new Set([...visited,name]);
  return item.via.every(v=>typeof v==='string'?allowed(v,next):v.url===known);
 };
 return Object.entries(vulnerabilities).filter(([name,item])=>['moderate','high','critical'].includes(item.severity)&&!allowed(name)).map(([name])=>name);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const copies=verifyPicomatch();
 const regression=spawnSync(process.execPath,[fileURLToPath(new URL('./picomatch-security.test.mjs',import.meta.url)),'--runtime-only'],{encoding:'utf8',timeout:20000});
 if(regression.status!==0)throw new Error(regression.stderr||'Picomatch mitigation regression failed');
 const npm=process.env.npm_execpath;
 const audit=npm?spawnSync(process.execPath,[npm,'audit','--json'],{encoding:'utf8',maxBuffer:16*1024*1024,timeout:120000}):spawnSync(process.platform==='win32'?'npm.cmd':'npm',['audit','--json'],{encoding:'utf8',shell:process.platform==='win32',maxBuffer:16*1024*1024,timeout:120000});
 if(audit.error)throw audit.error;
 const report=JSON.parse(audit.stdout);if(report.error||!report.metadata||!report.vulnerabilities)throw new Error('npm audit did not return a complete report');
 const findings=auditFindings(report.vulnerabilities);
 console.log(JSON.stringify({audit:'completed',rawVulnerabilities:report.metadata.vulnerabilities,locallyMitigated:{advisory:known,sourceVerifiedCopies:copies.length,runtimeRegression:true},unmitigated:findings},null,2));
 if(findings.length)process.exitCode=1;
}
