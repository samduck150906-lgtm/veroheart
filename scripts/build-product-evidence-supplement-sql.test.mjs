import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSupplementSql,attachSupplementSnapshots}from'./build-product-evidence-supplement-sql.mjs';
const row={productId:'fixture',before:{id:'fixture',catalog_archived_at:null},sourceUrl:'https://example.org/label',documentSha256:'a'.repeat(64),observedAt:'2026-11-13T00:00:00Z',referenceNote:'Fixture source',profileProjection:false,measurements:[{nutrientCode:'protein',value:5,unit:'g/100mL',basis:'as_fed',raw:'Protein 5g per 100mL'}]};
const build=r=>buildSupplementSql({runId:'fixture-evidence-run',accepted:r},'b'.repeat(64));
test('volume and powder cannot be projected into ordinary percentage profiles',()=>{
 assert.doesNotThrow(()=>build([row]));
 assert.throws(()=>build([{...row,profileProjection:true}]),/must not enter percentage/);
 assert.throws(()=>build([{...row,profileProjection:true,measurements:[{...row.measurements[0],unit:'g/100g',basis:'as_sold'}]}]),/must not enter percentage/);
});
test('reject duplicate products, archived originals and source URLs containing credentials',()=>{
 assert.throws(()=>build([row,row]),/Duplicate/);
 assert.throws(()=>build([{...row,before:{...row.before,catalog_archived_at:'2026-11-13'}}]),/archived/);
 assert.throws(()=>build([{...row,sourceUrl:'https://example.org/label?token=fixture'}]),/Unsafe/);
});
test('snapshot attachment preserves exact product intent and excludes nested export-only fields',()=>{
 const source={id:'fixture',is_visible:false,verification_status:'pending',nutrition:[{id:'nutrition'}],barcodes:[],current_labels:[{id:'label',is_current:true,items:[{raw:'Rice'}]}]};
 const prepared=attachSupplementSnapshots({accepted:[row]},[source]);
 assert.deepEqual(prepared.accepted[0].before,{id:'fixture',is_visible:false,verification_status:'pending'});
 assert.deepEqual(prepared.accepted[0].previousNutrition,source.nutrition);
 assert.deepEqual(prepared.accepted[0].previousLabels,[{id:'label',is_current:true}]);
 assert.throws(()=>attachSupplementSnapshots({accepted:[row]},[]),/Missing/);
 assert.equal(source.current_labels[0].items.length,1);
});
