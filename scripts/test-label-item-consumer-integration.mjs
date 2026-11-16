// Disposable integration: current administrator HEAD plus the separately pinned
// consumer-only diff. Never modify or push #122 or copy its code into this PR.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtemp,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
const base='c355c15571f8608c197daa1754b81aea2fc15b27',consumer='9da1f647e377e2ce2b23ba3bd9c8010747376a38';
const run=(cmd,args,options={})=>{const r=spawnSync(cmd,args,{encoding:'utf8',...options});assert.equal(r.status,0,r.stderr||`${cmd} failed`);return r.stdout;};
for(const sha of [base,consumer])if(spawnSync('git',['cat-file','-e',sha+'^{commit}']).status!==0)run('git',['fetch','--no-tags','origin',sha]);
const dir=join(await mkdtemp(join(tmpdir(),'label-consumer-integration-')),'checkout');run('git',['worktree','add','--detach',dir,'HEAD']);
try{
 const patch=run('git',['diff','--binary',base,consumer,'--','src','tests/detail-layout','scripts/feed-nutrition-evidence.test.mjs','scripts/label-review-flow.test.mjs']);
 // The consumer branch already contains its pinned diff after main integration.
 // Reapplying it would collide with existing consumer-only files.
 const consumerIncluded=spawnSync('git',['merge-base','--is-ancestor',consumer,'HEAD']).status===0;
 if(!consumerIncluded)run('git',['apply','--3way','-'],{cwd:dir,input:patch});
 for(const file of ['supabase/functions/admin-write/index.ts','supabase/functions/admin-write/labelSource.ts','src/pages/admin/ProductLabelReview.tsx','src/pages/admin/ProductLabelSourceRegistration.tsx'])assert.equal(run('git',['show','HEAD:'+file]),run('git',['show',':'+file],{cwd:dir}),file);
 await symlink(resolve('node_modules'),join(dir,'node_modules'),'dir');
 const env={...process.env,LABEL_CONSUMER_CHECK:'1'};
 for(const file of ['scripts/label-source-service.test.mjs','scripts/label-item-matching-service.test.mjs','scripts/label-review-flow.test.mjs'])run(process.execPath,['--experimental-vm-modules','--test',file],{cwd:dir,env,stdio:'inherit'});
 if(!process.argv.includes('--node-only')){run(process.execPath,['node_modules/vitest/vitest.mjs','run','src/analysis/labelCompleteness.test.ts','src/lib/labelComparisonRead.test.ts','src/pages/admin/ProductLabelSourceRegistration.test.tsx'],{cwd:dir,env,stdio:'inherit'});run('npm',['run','build'],{cwd:dir,env,stdio:'inherit'});}
 console.log('PASS disposable consumer integration',JSON.stringify({base,consumer,administrator:run('git',['rev-parse','HEAD']).trim(),operatingRequests:0,nodeOnly:process.argv.includes('--node-only')}));
}finally{run('git',['worktree','remove','--force',dir]);}
