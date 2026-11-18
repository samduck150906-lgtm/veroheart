// Temporary local mitigation for GHSA-fc5q-39xc-vjpf; upstream has no patched
// release as of 2026-11-18. Keep the upstream version and audit finding intact.
// Repeated single-branch extglobs containing glob operators are treated as
// literals by the existing risky-pattern fallback. Ordinary globstars, braces,
// nonrepeated extglobs and repeated literal alternatives retain their behavior.
// This deliberately restricts complex repeated extglobs until upstream fixes
// them. Do not turn off the audit gate or claim that upstream 4.0.7 is fixed.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const originalHash='4e1e05447668aa1e94366c5516a2bcd8f5fff800cc92b1d0cd7d77703b8618c4';
const anchor='const analyzeRepeatedExtglob = (body, options) => {';
export const guard=`\n  // VERORO GHSA-fc5q-39xc-vjpf: reject ambiguous single-branch repeats.\n  const securityBranches = splitTopLevel(body).map(branch => branch.trim());\n  if (securityBranches.length === 1 && /[*?+@!()[\\]{}]/.test(securityBranches[0])) {\n    return { risky: true };\n  }\n`;
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');

export function picomatchPaths(root=process.cwd()) {
 const lock=JSON.parse(fs.readFileSync(path.join(root,'package-lock.json'),'utf8'));
 return Object.entries(lock.packages).filter(([name])=>name.endsWith('node_modules/picomatch')).map(([name,pkg])=>{
  if(pkg.version!=='4.0.7')throw new Error(`Unreviewed picomatch version ${pkg.version} at ${name}`);
  return path.join(root,name,'lib/parse.js');
 });
}
export function verifyPicomatch(root=process.cwd(),apply=false){
 const files=picomatchPaths(root);if(!files.length)throw new Error('No installed picomatch found');
 for(const file of files){
  const source=fs.readFileSync(file,'utf8');
  if(hash(source)===originalHash){
   if(!apply)throw new Error(`Missing picomatch mitigation at ${file}`);
   fs.writeFileSync(file,source.replace(anchor,anchor+guard));
  }else{
   const original=source.replace(anchor+guard,anchor);
   if(original===source||hash(original)!==originalHash)throw new Error(`Unexpected picomatch source at ${file}`);
  }
 }
 return files;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 console.log(JSON.stringify({picomatchMitigation:true,installedCopies:verifyPicomatch(process.cwd(),true).length,advisory:'GHSA-fc5q-39xc-vjpf'}));
}
