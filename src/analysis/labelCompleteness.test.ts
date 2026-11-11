import { describe, expect, it } from 'vitest';
import { assessLabelCompleteness } from './labelCompleteness';
import { productAnalysisReadiness } from './analysisReadiness';
import { reviewedLabelFixture } from '../test/reviewedLabelFixture';
import { mapProductFromSupabaseRow, mapReviewedProductFromSupabaseRow, type SupabaseProductRow } from '../lib/supabaseRowTypes';
import { resolveProductDisplayVerdict } from '../utils/displayVerdict';
import { DEFAULT_USER_PET_PROFILE } from '../types';
import { parseIngredientLabelItems } from './labelIngredientParser';

const row = (): SupabaseProductRow => ({ id: 'synthetic-product', name: 'Synthetic label', brand_name: 'Synthetic', product_type: 'food', analysis_status: 'ready',
  product_ingredient_label_sets: [{ id: 'synthetic-label', is_current: true, raw_label_text: '닭고기, 대두', updated_at: 'revision-1',
    product_ingredient_label_items: [{ id: 'item-1', display_order: 0, raw_ingredient_text: '닭고기', match_status: 'matched',
      ingredients: { id: 'synthetic-chicken', name_ko: '닭고기', name_en: '', risk_level: 'safe', description: '' } }] }] });
const complete = () => {
  const r = row();r.product_ingredient_label_sets![0].product_ingredient_label_items!.push({
    id: 'item-2', display_order: 1, raw_ingredient_text: '대두', match_status: 'matched',
    ingredients: { id: 'synthetic-soy', name_ko: '대두', name_en: '', risk_level: 'safe', description: '' },
  });
  return reviewedLabelFixture(mapProductFromSupabaseRow(r));
};

describe('full-label comparison evidence boundary', () => {
  it('regression: omitted raw-label item and stored ready cannot authorize a full analysis', () => {
    const p = mapProductFromSupabaseRow(row());
    expect(p.ingredients).toHaveLength(1);
    expect(p.analysisStatus).toBe('ready'); // retain source fact, do not manufacture a backfill
    expect(productAnalysisReadiness(p)).toMatchObject({ status: 'partial', reasonCodes: ['label_evidence_not_requested'] });
    expect(resolveProductDisplayVerdict(p, DEFAULT_USER_PET_PROFILE).canShowScore).toBe(false);
  });
  it('does not accept review-looking extra JSON fields from the existing public mapper', () => {
    const r = { ...row(), comparison: complete().ingredientLabelEvidence!.comparison };
    expect(assessLabelCompleteness(mapProductFromSupabaseRow(r).ingredientLabelEvidence).status).toBe('unverified');
  });
  it('allows a trusted complete comparison control without changing numeric scoring', () => {
    const p = complete();
    expect(productAnalysisReadiness(p).status).toBe('ready');
    expect(resolveProductDisplayVerdict(p, DEFAULT_USER_PET_PROFILE).canShowScore).toBe(true);
    const withoutProof = { ...p, ingredientLabelEvidence: undefined };
    expect(resolveProductDisplayVerdict(p, DEFAULT_USER_PET_PROFILE).score).toBe(resolveProductDisplayVerdict(withoutProof, DEFAULT_USER_PET_PROFILE).score);
  });
  it.each(['rawText', 'revision', 'labelSetId', 'productId'] as const)('invalidates changed %s after review', key => {
    const p = complete(); p.ingredientLabelEvidence!.current![key] = 'changed';
    expect(productAnalysisReadiness(p).status).toBe('blocked');
  });
  it.each(['rawText', 'matchStatus', 'legacyId', 'canonicalId', 'riskLevel', 'order', 'id'] as const)('invalidates changed item %s after review', key => {
    const p = complete(); const item = p.ingredientLabelEvidence!.current!.items[0];
    Object.assign(item, { [key]: key === 'order' ? 8 : key === 'matchStatus' ? 'unmatched' : 'changed' });
    expect(productAnalysisReadiness(p).status).toBe('blocked');
  });
  it.each(['unmatched', 'unreviewed', 'ambiguous'] as const)('preserves %s even when the stored status is ready', matchStatus => {
    const p = complete(); p.ingredientLabelEvidence!.current!.items[0].matchStatus = matchStatus;
    p.ingredientLabelEvidence!.comparison!.snapshot = structuredClone(p.ingredientLabelEvidence!.current!);
    expect(productAnalysisReadiness(p).status).toBe(matchStatus === 'ambiguous' ? 'blocked' : 'partial');
  });
  it('blocks multiple current labels rather than silently trusting the first', () => {
    const r = row();r.product_ingredient_label_sets!.push({ ...r.product_ingredient_label_sets![0], id: 'another-label' });
    expect(productAnalysisReadiness(mapProductFromSupabaseRow(r)).status).toBe('blocked');
  });
  it('rejects duplicate identity/order but allows duplicate names, gaps and relation-order changes', () => {
    const p = complete(); const e = p.ingredientLabelEvidence!;
    e.current!.items.push({ ...e.current!.items[0], id: 'item-3', order: 3 });
    e.comparison!.snapshot = structuredClone(e.current!);
    expect(assessLabelCompleteness(e).status).toBe('verified');
    e.current!.items.reverse();expect(assessLabelCompleteness(e).status).toBe('verified');
    e.current!.items[0].order = e.current!.items[1].order;expect(assessLabelCompleteness(e).status).toBe('invalid');
    e.current!.items[0].order = 4;e.current!.items[0].id = e.current!.items[1].id;expect(assessLabelCompleteness(e).status).toBe('invalid');
  });
  it.each(['nameKo', 'canonicalIngredientId'] as const)('invalidates resolved ingredient %s changes even if a cached review descriptor remains attached', key => {
    const p = complete();p.ingredients[0][key] = 'different';
    expect(productAnalysisReadiness(p).status).toBe('blocked');
  });
  it.each(['name', 'brand', 'variantName', 'netWeightText', 'barcode', 'targetPetType', 'targetLifeStage', 'category', 'formulation'] as const)('invalidates changed product identity %s without modifying the old review', key => {
    const p = complete(); Object.assign(p, { [key]: key === 'targetLifeStage' ? ['senior'] : key === 'targetPetType' ? 'cat' : 'changed-product-identity' });
    expect(productAnalysisReadiness(p).status).toBe('blocked');
  });
  it('invalidates a deleted reviewed item even when all remaining items are matched', () => {
    const p = complete(); p.ingredientLabelEvidence!.current!.items.pop(); p.ingredients.pop();
    expect(productAnalysisReadiness(p).status).toBe('blocked');
  });
  it('accepts separately identified repeated/compound items after an explicit synthetic full review', () => {
    const p = complete(); p.ingredients = [p.ingredients[0], { ...p.ingredients[0], rawLabelText: '단백질(닭고기, 연어)' }];
    const reviewed = reviewedLabelFixture(p);
    expect(productAnalysisReadiness(reviewed).status).toBe('ready');
  });
  it('retains parser compound structure and repeated names; never uses a new comma splitter', () => {
    const parsed = parseIngredientLabelItems('단백질(닭고기, 연어), 대두, 대두');
    expect(parsed).toHaveLength(3);expect(parsed[0].rawText).toContain('연어');
    expect(parsed.slice(1).map(i => i.rawText)).toEqual(['대두', '대두']);
  });
  it('requires a complete current snapshot even through the future trusted adapter seam', () => {
    const proof = complete().ingredientLabelEvidence!.comparison!;
    const r = row();delete r.product_ingredient_label_sets![0].raw_label_text;
    expect(assessLabelCompleteness(mapReviewedProductFromSupabaseRow(r, proof).ingredientLabelEvidence).status).toBe('unverified');
  });
  it('does not promote initial partial, unavailable or unloaded data', () => {
    for (const analysisStatus of ['partial', 'unavailable'] as const) expect(productAnalysisReadiness({ ...complete(), analysisStatus }).status).toBe(analysisStatus);
    expect(resolveProductDisplayVerdict({ ...complete(), ingredientDataLoaded: false }, DEFAULT_USER_PET_PROFILE).canShowScore).toBe(false);
  });
});
