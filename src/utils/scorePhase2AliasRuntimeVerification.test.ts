import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Ingredient, Product, UserPetProfile } from '../types';
import {
  calculateCompatibilityScore,
  getCompatibilityBreakdown,
  getPhase2AliasResolverScoringProduct,
  getRecommendationBreakdown,
  rankProductsForProfile,
} from './score';
import { resolveProductDisplayVerdict } from './displayVerdict';

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

const products = [
  product('safe-match', [ingredient('비타민 E'), ingredient('오메가-3 지방산')]),
  product('allergy-unmatched', [ingredient('닭고기 분말'), ingredient('비타민 E')]),
  product('danger', [ingredient('프로필렌글리콜', 'danger'), ingredient('비타민 E')]),
  product('species-mismatch', [ingredient('비타민 E')], 'cat'),
];

const scoreSource = readFileSync(join(process.cwd(), 'src/utils/score.ts'), 'utf8');

describe('Phase 2 alias resolver runtime verification after flag-off integration', () => {
  it('keeps the score.ts runtime flag explicitly disabled', () => {
    expect(scoreSource).toContain('getPhase2AliasResolverScoringProduct');
    expect(scoreSource).toContain('flags: { phase2AliasResolver: isPhase2AliasResolverRuntimeEnabled() }');
    expect(scoreSource).not.toContain('phase2AliasResolver: true');
  });

  it('keeps the score-path adapter as a pass-through for product references', () => {
    for (const input of products) {
      const scoringProduct = getPhase2AliasResolverScoringProduct(input);

      expect(scoringProduct).toBe(input);
      expect(scoringProduct.ingredients).toBe(input.ingredients);
      expect(scoringProduct.ingredients.map((item) => item.nameKo)).toEqual(
        input.ingredients.map((item) => item.nameKo),
      );
    }
  });

  it('keeps score, breakdown, and public display verdict stable on the flag-off path', () => {
    for (const input of products) {
      const scoringProduct = getPhase2AliasResolverScoringProduct(input);
      const scoreBefore = calculateCompatibilityScore(input, profile);
      const scoreAfter = calculateCompatibilityScore(scoringProduct, profile);
      const breakdownBefore = getRecommendationBreakdown(input, profile);
      const breakdownAfter = getCompatibilityBreakdown(scoringProduct, profile);
      const displayBefore = resolveProductDisplayVerdict(input, profile);
      const displayAfter = resolveProductDisplayVerdict(scoringProduct, profile);

      expect(scoreAfter).toBe(scoreBefore);
      expect(breakdownAfter).toEqual(breakdownBefore);
      expect(displayAfter).toEqual(displayBefore);
    }
  });

  it('keeps ranking order stable on the post-integration flag-off path', () => {
    const before = rankProductsForProfile(products, profile).map((item) => item.product.id);
    const scoringProducts = products.map(getPhase2AliasResolverScoringProduct);
    const after = rankProductsForProfile(scoringProducts, profile).map((item) => item.product.id);

    expect(after).toEqual(before);
  });
});
