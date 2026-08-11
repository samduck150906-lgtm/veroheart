import { describe, expect, it } from 'vitest';
import type { Ingredient, Product, UserPetProfile } from '../types';
import {
  calculateCompatibilityScore,
  getCompatibilityBreakdown,
  getPhase2AliasResolverScoringProduct,
  getRecommendationBreakdown,
  rankProductsForProfile,
} from './score';

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

describe('Phase 2 alias resolver flag-off runtime scoring integration', () => {
  it('keeps the scoring integration adapter disabled and returns the original product reference', () => {
    for (const input of products) {
      const scoringProduct = getPhase2AliasResolverScoringProduct(input);

      expect(scoringProduct).toBe(input);
      expect(scoringProduct.ingredients).toBe(input.ingredients);
    }
  });

  it('keeps public compatibility score calls on the original product data path', () => {
    for (const input of products) {
      const scoringProduct = getPhase2AliasResolverScoringProduct(input);
      const directBreakdown = getRecommendationBreakdown(scoringProduct, profile);
      const publicScore = calculateCompatibilityScore(input, profile);

      expect(scoringProduct).toBe(input);
      expect(publicScore).toBe(directBreakdown.total);
    }
  });

  it('keeps compatibility breakdown aliases on the same recommendation breakdown result', () => {
    for (const input of products) {
      const recommendationBreakdown = getRecommendationBreakdown(input, profile);
      const compatibilityBreakdown = getCompatibilityBreakdown(input, profile);

      expect(compatibilityBreakdown).toEqual(recommendationBreakdown);
    }
  });

  it('keeps ranking on the score.ts path while the flag remains off', () => {
    const ranked = rankProductsForProfile(products, profile);
    const rankedScores = ranked.map((item) => item.breakdown.total);

    expect(ranked).toHaveLength(products.length - 1); // cat product is filtered for a Dog profile.
    expect(rankedScores).toEqual([...rankedScores].sort((a, b) => b - a));
    expect(ranked.every((item) => products.includes(item.product))).toBe(true);
  });
});
