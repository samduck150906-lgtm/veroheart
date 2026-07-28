import { describe, expect, it } from 'vitest';
import type { Ingredient, Product, UserPetProfile } from '../types';
import type { Phase2AliasSeed } from './phase2AliasResolver';
import { resolveProductWithPhase2AliasAdapter } from './phase2AliasResolverProductAdapter';
import { calculateCompatibilityScore, getRecommendationBreakdown, rankProductsForProfile } from '../utils/score';
import { resolveProductDisplayVerdict } from '../utils/displayVerdict';

function ingredient(nameKo: string, riskLevel: Ingredient['riskLevel'] = 'safe'): Ingredient {
  return { id: nameKo, nameKo, nameEn: nameKo, purpose: '', riskLevel };
}

function product(id: string, ingredients: Ingredient[], targetPetType: Product['targetPetType'] = 'dog'): Product {
  return {
    id,
    brand: 'Fixture Brand',
    name: `Fixture Product ${id}`,
    category: 'food',
    mainCategory: 'food',
    targetPetType,
    imageUrl: '',
    ingredients,
    reviewsCount: 0,
    averageRating: 0,
    verificationStatus: 'verified',
  };
}

const profile: UserPetProfile = {
  id: 'pet-1',
  name: 'Test Pet',
  species: 'Dog',
  age: 4,
  healthConcerns: ['면역'],
  allergies: ['닭'],
};

const aliases: Phase2AliasSeed[] = [
  { alias: '비타민 E', canonicalName: '비타민e', canonicalId: 'fixture-canonical-vitamin-e' },
  { alias: '오메가-3 지방산', canonicalName: '오메가3지방산', canonicalId: 'fixture-canonical-omega-3' },
];

const canonicals = [
  { canonicalName: '비타민e', canonicalId: 'fixture-canonical-vitamin-e' },
  { canonicalName: '오메가3지방산', canonicalId: 'fixture-canonical-omega-3' },
];

const blockedTerms = ['소르빈산칼륨', '닭지방'];

const products = [
  product('safe-match', [ingredient('비타민 E'), ingredient('오메가-3 지방산')]),
  product('allergy-unmatched', [ingredient('닭고기 분말'), ingredient('비타민 E')]),
  product('blocked', [ingredient('소르빈산 칼륨'), ingredient('비타민 E')]),
  product('species-mismatch', [ingredient('비타민 E')], 'cat'),
];

describe('Phase 2 alias resolver score invariance while disabled', () => {
  it('keeps compatibility scores unchanged when the adapter flag is absent', () => {
    for (const input of products) {
      const before = calculateCompatibilityScore(input, profile);
      const adapted = resolveProductWithPhase2AliasAdapter({ product: input, aliases, canonicals, blockedTerms });
      const after = calculateCompatibilityScore(adapted.product, profile);

      expect(adapted.enabled).toBe(false);
      expect(adapted.product).toBe(input);
      expect(adapted.changed).toBe(false);
      expect(after).toBe(before);
    }
  });

  it('keeps recommendation breakdowns unchanged when the adapter flag is explicitly false', () => {
    for (const input of products) {
      const before = getRecommendationBreakdown(input, profile);
      const adapted = resolveProductWithPhase2AliasAdapter({
        product: input,
        aliases,
        canonicals,
        blockedTerms,
        flags: { phase2AliasResolver: false },
      });
      const after = getRecommendationBreakdown(adapted.product, profile);

      expect(adapted.enabled).toBe(false);
      expect(adapted.resolutions).toHaveLength(0);
      expect(after).toEqual(before);
    }
  });

  it('keeps public display verdict scores unchanged while disabled', () => {
    for (const input of products) {
      const before = resolveProductDisplayVerdict(input, profile);
      const adapted = resolveProductWithPhase2AliasAdapter({
        product: input,
        aliases,
        canonicals,
        blockedTerms,
        flags: { phase2AliasResolver: false },
      });
      const after = resolveProductDisplayVerdict(adapted.product, profile);

      expect(after.score).toBe(before.score);
      expect(after.grade).toBe(before.grade);
      expect(after.verdict).toEqual(before.verdict);
    }
  });

  it('keeps ranking order unchanged while disabled', () => {
    const before = rankProductsForProfile(products, profile).map((item) => item.product.id);
    const adaptedProducts = products.map(
      (input) =>
        resolveProductWithPhase2AliasAdapter({
          product: input,
          aliases,
          canonicals,
          blockedTerms,
          flags: { phase2AliasResolver: false },
        }).product,
    );
    const after = rankProductsForProfile(adaptedProducts, profile).map((item) => item.product.id);

    expect(after).toEqual(before);
  });
});
