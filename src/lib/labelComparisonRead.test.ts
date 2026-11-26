import { describe, expect, it } from 'vitest';
import { loadLabelComparisons } from './labelComparisonRead';
import { productAnalysisReadiness, analysisReadinessNotice } from '../analysis/analysisReadiness';
import { publicLabelBinding } from '../analysis/labelCompleteness';
import { reviewedLabelFixture } from '../test/reviewedLabelFixture';
import { DEFAULT_USER_PET_PROFILE, type Product } from '../types';
import { resolveProductDisplayVerdict } from '../utils/displayVerdict';
import { selectHomeRecommendations } from './homeRecommendations';
const profile = { ...DEFAULT_USER_PET_PROFILE, id:'synthetic-pet' };
const product: Product = { id:'synthetic', name:'닭고기 사료', brand:'합성', category:'food', imageUrl:'', reviewsCount:0,averageRating:0,
  targetPetType:'dog',analysisStatus:'ready',ingredientLabelSetId:'synthetic-label',ingredients:[{id:'chicken',nameKo:'닭고기',nameEn:'chicken',riskLevel:'safe',purpose:'',rawLabelText:'닭고기'}] };
const receipt = () => ({ productId:product.id, state:'verified', labelSetId:product.ingredientLabelSetId, revision:'server-revision',binding:publicLabelBinding(product) });
describe('public proof lookup, no production HTTP', () => {
 it.each(['not_requested','unavailable','error'] as const)('withholds with an accurate %s reason, not absent ingredients', status => {
   const p = { ...product, ingredientLabelEvidence:{lookup:{status}} };
   expect(productAnalysisReadiness(p).reasonCodes).toContain(`label_evidence_${status}`);
   expect(analysisReadinessNotice(productAnalysisReadiness(p))).not.toContain('원료 정보가 없습니다');
   expect(resolveProductDisplayVerdict(p,profile).canShowScore).toBe(false);
 });
 it('distinguishes confirmed absence from omitted/failed responses and rejects malformed receipts', async () => {
   const cases: Array<[unknown, string]> = [[[], 'error'], [[{...receipt(),state:'absent'}], 'absent'], [[{...receipt(),state:'verified',binding:null}], 'error']];
   for (const [data, reason] of cases) {
     const [p] = await loadLabelComparisons([product],async()=>({data}));
     expect(productAnalysisReadiness(p).reasonCodes).toContain(`label_evidence_${reason}`);
   }
 });
 it('binds the public proof to the same inputs instead of trusting a flag', async () => {
   const [p] = await loadLabelComparisons([product],async()=>({data:[receipt()]}));
   expect(productAnalysisReadiness(p).status).toBe('ready');
   expect(productAnalysisReadiness({...p,name:'changed'}).status).not.toBe('ready');
   expect(productAnalysisReadiness({...p,ingredients:[{...p.ingredients[0],rawLabelText:'new'}]}).status).not.toBe('ready');
 });
 it('loads batches independently without pretending partial proof is a complete response', async()=>{
   const products=Array.from({length:101},(_,n)=>({...product,id:`synthetic-${n}`}));let calls=0;
   const result=await loadLabelComparisons(products,async ids=>{calls++;return calls===1?{data:ids.map(id=>({...receipt(),productId:id,state:'absent'}))}:{data:null,error:{code:'XX000'}};});
   expect(calls).toBe(2);expect(result[0].ingredientLabelEvidence?.lookup?.status).toBe('loaded');expect(result[100].ingredientLabelEvidence?.lookup?.status).toBe('error');
 });
 it('compares main-style readiness and recommendation eligibility without changing numeric scores', async()=>{
   const raw={...product,ingredientLabelEvidence:{lookup:{status:'not_requested' as const}}};
   const reviewed=reviewedLabelFixture(product);
   const [loaded]=await loadLabelComparisons([product],async()=>({data:[receipt()]}));
   const oldVerdict=resolveProductDisplayVerdict(reviewed,profile);
   expect(resolveProductDisplayVerdict(raw,profile).score).toBe(oldVerdict.score);
   expect(selectHomeRecommendations([raw],profile)).toHaveLength(0);
   expect(selectHomeRecommendations([loaded],profile)).toHaveLength(1);
   expect(selectHomeRecommendations([reviewed],profile)[0].verdict.score).toBe(oldVerdict.score);
 });
});
