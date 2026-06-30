import { describe, expect, it } from 'vitest';
import {
  buildRecommendationBreakdown,
  calculateCompatibilityScore,
  getCompatibilityBreakdown,
  getProductRecommendationInsights,
  getRecommendationBreakdown,
  rankProductsForProfile,
} from './score';
import type { Ingredient, Product, UserPetProfile } from '../types';

// TODO: This is a temporary legacy score contract. Replace these tests with the unified analysis engine tests.

function ingredient(nameKo: string, riskLevel: Ingredient['riskLevel'] = 'safe'): Ingredient {
  return { id: nameKo, nameKo, nameEn: nameKo, purpose: '', riskLevel };
}

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: 'product-1',
    brand: 'Test Brand',
    name: 'Test Product',
    category: 'food',
    mainCategory: 'food',
    targetPetType: 'dog',
    targetLifeStage: ['adult'],
    price: 30_000,
    imageUrl: '',
    ingredients: [ingredient('protein'), ingredient('grain')],
    reviewsCount: 100,
    averageRating: 4,
    verificationStatus: 'verified',
    ...overrides,
  };
}

const profile: UserPetProfile = {
  id: 'pet-1',
  name: 'Test Pet',
  species: 'Dog',
  age: 4,
  healthConcerns: [],
  allergies: [],
};

function expectCurrentBreakdownShape(result: ReturnType<typeof getRecommendationBreakdown>) {
  expect(result).toEqual({
    total: expect.any(Number),
    safety: expect.any(Number),
    concern: expect.any(Number),
    socialProof: expect.any(Number),
    value: expect.any(Number),
    petFit: expect.any(Number),
    verification: expect.any(Number),
    allergyHits: expect.any(Array),
    matchedConcerns: expect.any(Array),
    dangerCount: expect.any(Number),
    cautionCount: expect.any(Number),
    reasons: expect.any(Array),
  });
  expect(result.total).toBeGreaterThanOrEqual(0);
  expect(result.total).toBeLessThanOrEqual(100);
}

describe('legacy compatibility score public contract', () => {
  it('returns the current breakdown shape with a bounded score', () => {
    expectCurrentBreakdownShape(getRecommendationBreakdown(product(), profile));
  });

  it('calculates a bounded score consistently for identical input', () => {
    const input = product();
    const first = calculateCompatibilityScore(input, profile);
    const second = calculateCompatibilityScore(input, profile);

    expect(first).toBe(second);
    expect(first).toBe(getRecommendationBreakdown(input, profile).total);
    expect(first).toBeGreaterThanOrEqual(0);
    expect(first).toBeLessThanOrEqual(100);
  });

  it('keeps the compatibility breakdown alias consistent', () => {
    const input = product();
    const result = getCompatibilityBreakdown(input, profile);

    expectCurrentBreakdownShape(result);
    expect(result).toEqual(getRecommendationBreakdown(input, profile));
  });

  it('keeps the build breakdown alias consistent', () => {
    const input = product();
    const result = buildRecommendationBreakdown(input, profile);

    expectCurrentBreakdownShape(result);
    expect(result).toEqual(getRecommendationBreakdown(input, profile));
  });

  it('returns insights derived from the same breakdown', () => {
    const input = product();
    const result = getProductRecommendationInsights(input, profile);

    expectCurrentBreakdownShape(result.breakdown);
    expect(result.breakdown).toEqual(getRecommendationBreakdown(input, profile));
    expect(result.reasons).toEqual(result.breakdown.reasons);
  });

  it('ranks products by their calculated score in descending order', () => {
    const products = [
      product({ id: 'product-a', reviewsCount: 0, averageRating: 0, verificationStatus: 'pending' }),
      product({ id: 'product-b', reviewsCount: 20, averageRating: 3, verificationStatus: 'verified' }),
      product({ id: 'product-c', reviewsCount: 500, averageRating: 5, verificationStatus: 'verified' }),
    ];
    const ranked = rankProductsForProfile(products, profile);

    expect(ranked).toHaveLength(products.length);
    for (const entry of ranked) {
      expect(entry.score).toBe(calculateCompatibilityScore(entry.product, profile));
      expect(entry.breakdown.total).toBe(entry.score);
    }
    for (let index = 1; index < ranked.length; index += 1) {
      expect(ranked[index - 1].score).toBeGreaterThanOrEqual(ranked[index].score);
    }
  });
});
