import type { AdminLabelReview, LabelItemWorkspace, LabelItemDecisionInput, LabelSourcePayload } from '../../src/lib/adminApi';
let revision=0;
let match='unreviewed';
let sourcePayload:LabelSourcePayload|null=null;
let sourceItems:Array<{id:string;order:number;raw:string;match:string;resolved?:unknown[]}>|null=null;
const snapshot=():AdminLabelReview=>({revision:String(revision).padStart(64,'0'),eligible:sourceItems?sourceItems.every(i=>i.match==='matched'):match==='matched',snapshot:{product:['synthetic','합성 포장 제품 — 긴 제품명과 원문 가독성 검증','합성 브랜드'],labels:[{id:sourcePayload?'new-source':'label',raw:sourcePayload?.rawText??'닭고기, 복합 원료(연어, 쌀), 닭고기 — 실제 제품이나 운영 라벨이 아닌 합성 자료입니다. '.repeat(5),source:sourcePayload?'registration:synthetic':'fixture:package',items:sourceItems??[{id:'item',order:0,raw:'닭고기',match,resolved:match==='matched'?['ingredient','legacy','닭고기']:undefined}]}]}});
export async function getIngredientLabelReview(){return snapshot();}
export async function getLabelItemWorkspace():Promise<LabelItemWorkspace>{return {review:snapshot(),decisions:[]};}
export async function searchLabelItemCandidates(){return [{kind:'legacy' as const,id:'ingredient',nameKo:'닭고기',nameEn:'Chicken',description:'합성 성분 정의 — 실제 포장 대응의 증거가 아닙니다. '.repeat(5),risk:'safe',status:'active',revision:'b'.repeat(64),selectable:true}];}
export async function reviewLabelItemMatch(input:LabelItemDecisionInput){if(new URLSearchParams(location.search).has('error'))throw Error('synthetic conflict');match=input.decision==='match'?'matched':'unreviewed';if(sourceItems)sourceItems=sourceItems.map(i=>i.id===input.itemId?{...i,match,resolved:match==='matched'?['ingredient','legacy','닭고기']:undefined}:i);revision++;document.body.dataset.saves=String(revision);return {status:'saved' as const,workspace:await getLabelItemWorkspace()};}
export async function approveIngredientLabelReview(){document.body.dataset.approved='1';return {result:{status:'approved' as const}};}

export async function getLabelSourceWorkspace(){return {review:snapshot(),registration:sourcePayload?{id:'synthetic-registration',payload:sourcePayload,recordedAt:'2026-01-01T00:00:00Z',auditRecorded:true}:null};}
export async function registerIngredientLabelSource(input:{payload:LabelSourcePayload}){if(new URLSearchParams(location.search).has('error'))throw Error('synthetic uncertainty');sourcePayload=input.payload;sourceItems=input.payload.items.map((i,n)=>({id:`source-${n+1}`,order:n+1,raw:i.rawText,match:'unreviewed'}));match='unreviewed';revision++;document.body.dataset.sourceSaved='1';return {status:'saved' as const,workspace:await getLabelSourceWorkspace()};}
