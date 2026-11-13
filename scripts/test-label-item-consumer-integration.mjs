// Disposable worktree only. Pin the independently reviewed consumer; never push
// its code into the administrator PR. No operating service or secret is used.
import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';import {mkdtemp,symlink} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join,resolve} from 'node:path';
const base='14c2b2c34b9b23a7a6847a4f95c3f3b170beb5bd',consumer='ab3c055ffee1f608cb1898a972f681db7d1469c6',integration='da22bbb660f5cc66014370d57447b94720965e60';
const run=(cmd,args,options={})=>{const r=spawnSync(cmd,args,{encoding:'utf8',...options});assert.equal(r.status,0,r.stderr||`${cmd} failed`);return r.stdout;};
for(const sha of [base,consumer,integration])if(spawnSync('git',['cat-file','-e',sha+'^{commit}']).status!==0)run('git',['fetch','--no-tags','origin',sha]);
const dir=join(await mkdtemp(join(tmpdir(),'label-consumer-integration-')),'checkout');run('git',['worktree','add','--detach',dir,integration]);
try{
 // This reviewed validation tree resolves six consumer/current-main conflicts.
 // Assert matching SQL/auth/UI are exact feature bytes, never stale fixtures.
 for(const file of ['supabase/migrations/20261114090000_admin_label_item_matching.sql','supabase/functions/admin-write/index.ts','supabase/functions/admin-write/validation.ts','supabase/functions/admin-write/labelItemMatching.ts','src/pages/admin/ProductLabelItemMatching.tsx','src/pages/admin/ProductLabelReview.tsx'])assert.equal(run('git',['show',integration+':'+file]),run('git',['show','HEAD:'+file]),file);
 await symlink(resolve('node_modules'),join(dir,'node_modules'),'dir');const env={...process.env,LABEL_CONSUMER_CHECK:'1'};for(const file of ['scripts/label-item-matching-service.test.mjs','scripts/label-review-flow.test.mjs'])run(process.execPath,['--experimental-vm-modules','--test',file],{cwd:dir,env,stdio:'inherit'});
 if(!process.argv.includes('--node-only')){run(process.execPath,['node_modules/vitest/vitest.mjs','run','src/analysis/labelCompleteness.test.ts','src/lib/labelComparisonRead.test.ts','src/pages/admin/ProductLabelItemMatching.test.tsx'],{cwd:dir,env,stdio:'inherit'});run('npm',['run','build'],{cwd:dir,env,stdio:'inherit'});}console.log('PASS disposable consumer integration',JSON.stringify({base,consumer,integration,operatingRequests:0,nodeOnly:process.argv.includes('--node-only')}));
}finally{run('git',['worktree','remove','--force',dir]);}
