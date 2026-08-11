import { describe, expect, it } from 'vitest';
import type { Product, UserPetProfile } from '../types';
import { resolveProductDisplayVerdict } from '../utils/displayVerdict';
import { calculateCompatibilityScore, getRecommendationBreakdown, rankProductsForProfile } from '../utils/score';
import type { Phase2AliasSeed } from './phase2AliasResolver';
import { resolveProductWithPhase2AliasAdapter } from './phase2AliasResolverProductAdapter';
import { buildPhase2AliasResolverShadowReport } from './phase2AliasResolverShadowReport';
import { toPhase2AliasShadowResultEnvelope } from './phase2AliasResolverShadowResult';

const aliases: Phase2AliasSeed[] = [
  { alias: '비타민 E', canonicalName: '비타민e', canonicalId: 'canonical-vitamin-e', aliasId: 'alias-vitamin-e' },
  { alias: '오메가-3 지방산', canonicalName: '오메가3지방산', canonicalId: 'canonical-omega-3', aliasId: 'alias-omega-3' },
  { alias: '맥주효모', canonicalName: '맥주효모', canonicalId: 'canonical-brewers-yeast', aliasId: 'alias-brewers-yeast' },
  { alias: '맥주 효모', canonicalName: '건조맥주효모', canonicalId: 'canonical-dried-brewers-yeast', aliasId: 'alias-dried-brewers-yeast' },
];

const blockedTerms = ['소르빈산칼륨'];

function product(id: string, ingredientNames: string[], riskLevel: 'safe' | 'caution' | 'danger' = 'safe'): Product {
  return {
    id,
    brand: 'Shadow Invariance Fixture Brand',
    name: `Shadow Invariance Fixture Product ${id}`,
    category: 'food',
    mainCategory: 'food',
    targetPetType: 'dog',
    imageUrl: '',
    ingredients: ingredientNames.map((name, index) => ({
      id: `${id}-ingredient-${index}`,
      nameKo: name,
      nameEn: name,
      purpose: '',
      riskLevel,
    })),
    reviewsCount: 0,
    averageRating: 0,
    verificationStatus: 'verified',
  };
}

const profile: UserPetProfile = {
  species: 'Dog',
  age: 4,
  weight: 8,
  allergies: [],
  healthConcerns: [],
};

function shadowEnvelopeFor(fixture: Product) {
  return toPhase2AliasShadowResultEnvelope(
    resolveProductWithPhase2AliasAdapter({
      product: fixture,
      aliases,
      blockedTerms,
      flags: { phase2AliasResolver: true },
    }),
  );
}

describe('Phase 2 alias resolver shadow report invariance', () => {
  it('does not change score, breakdown, display verdict, or raw labels when building reports', () => {
    const fixture = product('stable', ['비타민 E', '닭고기 분말', '소르빈산 칼륨', '맥주효모']);

    const beforeScore = calculateCompatibilityScore(fixture, profile);
    const beforeBreakdown = getRecommendationBreakdown(fixture, profile);
    const beforeDisplay = resolveProductDisplayVerdict(fixture, profile);
    const beforeLabels = fixture.ingredients.map((ingredient) => ingredient.nameKo);

    const report = buildPhase2AliasResolverShadowReport([shadowEnvelopeFor(fixture)]);

    const afterScore = calculateCompatibilityScore(fixture, profile);
    const afterBreakdown = getRecommendationBreakdown(fixture, profile);
    const afterDisplay = resolveProductDisplayVerdict(fixture, profile);
    const afterLabels = fixture.ingredients.map((ingredient) => ingredient.nameKo);

    expect(report.visibility).toBe('non_visible_internal_report');
    expect(report.summary.changedProducts).toBe(0);
    expect(report.summary.scoreImpactAllowedRows).toBe(0);
    expect(report.summary.runtimeMutationAllowedRows).toBe(0);
    expect(report.summary.visibleLabelReplacementAllowedRows).toBe(0);
    expect(afterScore).toBe(beforeScore);
    expect(afterBreakdown).toEqual(beforeBreakdown);
    expect(afterDisplay).toEqual(beforeDisplay);
    expect(afterLabels).toEqual(beforeLabels);
  });

  it('does not change ranking order when reports are generated for the same products', () => {
    const safeProduct = product('safe', ['비타민 E']);
    const cautionProduct = product('caution', ['현미'], 'caution');
    const dangerProduct = product('danger', ['위험 원료'], 'danger');
    const products = [dangerProduct, cautionProduct, safeProduct];

    const beforeRanking = rankProductsForProfile(products, profile).map((row) => row.product.id);
    const report = buildPhase2AliasResolverShadowReport(products.map(shadowEnvelopeFor));
    const afterRanking = rankProductsForProfile(products, profile).map((row) => row.product.id);

    expect(report.summary.products).toBe(3);
    expect(report.summary.changedProducts).toBe(0);
    expect(afterRanking).toEqual(beforeRanking);
  });
});
