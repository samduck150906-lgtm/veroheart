// Disposable worktree only. Pin the independently reviewed consumer; never push
// its code into the administrator PR. No operating service or secret is used.
import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';import {mkdtemp,symlink} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join,resolve} from 'node:path';
const base='8bde9a2ae2a6d6e8579b3d35430da0eaee431222',consumer='ab3c055ffee1f608cb1898a972f681db7d1469c6';
const run=(cmd,args,options={})=>{const r=spawnSync(cmd,args,{encoding:'utf8',...options});assert.equal(r.status,0,r.stderr||`${cmd} failed`);return r.stdout;};
for(const sha of [base,consumer])if(spawnSync('git',['cat-file','-e',sha+'^{commit}']).status!==0)run('git',['fetch','--no-tags','origin',sha]);
const diff=run('git',['diff','--binary',base,consumer,'--','src','scripts/label-review-flow.test.mjs','docs/sql/label-evidence-rollout-counts.sql']);
assert(diff.length>0);const dir=join(await mkdtemp(join(tmpdir(),'label-consumer-integration-')),'checkout');run('git',['worktree','add','--detach',dir,'HEAD']);
try{run('git',['apply','--3way','--index','-'],{cwd:dir,input:diff});await symlink(resolve('node_modules'),join(dir,'node_modules'),'dir');const env={...process.env,LABEL_CONSUMER_CHECK:'1'};for(const file of ['scripts/label-item-matching-service.test.mjs','scripts/label-review-flow.test.mjs'])run(process.execPath,['--experimental-vm-modules','--test',file],{cwd:dir,env,stdio:'inherit'});
 if(!process.argv.includes('--node-only')){run(process.execPath,['node_modules/vitest/vitest.mjs','run','src/analysis/labelCompleteness.test.ts','src/lib/labelComparisonRead.test.ts','src/pages/admin/ProductLabelItemMatching.test.tsx'],{cwd:dir,env,stdio:'inherit'});run('npm',['run','build'],{cwd:dir,env,stdio:'inherit'});}console.log('PASS disposable consumer integration',JSON.stringify({base,consumer,operatingRequests:0,nodeOnly:process.argv.includes('--node-only')}));
}finally{run('git',['worktree','remove','--force',dir]);}
