import type { AdminLabelReview, LabelItemWorkspace, LabelItemDecisionInput } from '../../src/lib/adminApi';
let revision=0;
let match='unreviewed';
const snapshot=():AdminLabelReview=>({revision:String(revision).padStart(64,'0'),eligible:match==='matched',snapshot:{product:['synthetic','합성 포장 제품 — 긴 제품명과 원문 가독성 검증','합성 브랜드'],labels:[{id:'label',raw:'닭고기, 복합 원료(연어, 쌀), 닭고기 — 실제 제품이나 운영 라벨이 아닌 합성 자료입니다. '.repeat(5),source:'fixture:package',items:[{id:'item',order:0,raw:'닭고기',match,resolved:match==='matched'?['ingredient','legacy','닭고기']:undefined}]}]}});
export async function getIngredientLabelReview(){return snapshot();}
export async function getLabelItemWorkspace():Promise<LabelItemWorkspace>{return {review:snapshot(),decisions:[]};}
export async function searchLabelItemCandidates(){return [{kind:'legacy' as const,id:'ingredient',nameKo:'닭고기',nameEn:'Chicken',description:'합성 성분 정의 — 실제 포장 대응의 증거가 아닙니다. '.repeat(5),risk:'safe',status:'active',revision:'b'.repeat(64),selectable:true}];}
export async function reviewLabelItemMatch(input:LabelItemDecisionInput){if(new URLSearchParams(location.search).has('error'))throw Error('synthetic conflict');match=input.decision==='match'?'matched':'unreviewed';revision++;document.body.dataset.saves=String(revision);return {status:'saved' as const,workspace:await getLabelItemWorkspace()};}
export async function approveIngredientLabelReview(){document.body.dataset.approved='1';return {result:{status:'approved' as const}};}
