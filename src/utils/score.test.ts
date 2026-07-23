import { describe, expect, it } from 'vitest';
import {
  buildRecommendationBreakdown,
  calculateCompatibilityScore,
  getCompatibilityBreakdown,
  getProductRecommendationInsights,
  getRecommendationBreakdown,
  gradeFromScore,
  preferencePenaltyFromLevel,
  rankProductsForProfile,
  resolveDisplayVerdict,
} from './score';
import type { Ingredient, Product, UserPetProfile } from '../types';

function ingredient(
  nameKo: string,
  riskLevel: Ingredient['riskLevel'] = 'safe',
  purpose = '',
): Ingredient {
  return { id: nameKo, nameKo, nameEn: nameKo, purpose, riskLevel };
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
    imageUrl: '',
    ingredients: [ingredient('닭고기'), ingredient('유산균')],
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
    baseScore: expect.any(Number),
    ingredientSafety: expect.any(Number),
    healthSuitability: expect.any(Number),
    concernFit: expect.any(Number),
    allergyPenalty: expect.any(Number),
    preferencePenalty: expect.any(Number),
    preferenceLevel: expect.toSatisfy((value: unknown) => value === null || typeof value === 'number'),
    speciesMismatch: expect.any(Boolean),
    allergyHits: expect.any(Array),
    matchedConcerns: expect.any(Array),
    dangerCount: expect.any(Number),
    cautionCount: expect.any(Number),
    reasons: expect.any(Array),
  });
  expect(result.total).toBeGreaterThanOrEqual(0);
  expect(result.total).toBeLessThanOrEqual(100);
  expect(result.ingredientSafety).toBeGreaterThanOrEqual(0);
  expect(result.ingredientSafety).toBeLessThanOrEqual(50);
  expect(result.healthSuitability).toBeGreaterThanOrEqual(0);
  expect(result.healthSuitability).toBeLessThanOrEqual(30);
  expect(result.concernFit).toBeGreaterThanOrEqual(0);
  expect(result.concernFit).toBeLessThanOrEqual(20);
}

describe('ingredient-centered compatibility score', () => {
  it('returns the new breakdown shape with a bounded score', () => {
    expectCurrentBreakdownShape(getRecommendationBreakdown(product(), profile));
  });

  it('uses only ingredient safety, health suitability and concern fit for the 100-point base', () => {
    const result = getRecommendationBreakdown(product(), profile);
    expect(result.baseScore).toBe(
      result.ingredientSafety + result.healthSuitability + result.concernFit,
    );
  });

  it('does not change when reviews, ratings or verification status change', () => {
    const lowExternalSignals = product({
      reviewsCount: 0,
      averageRating: 0,
      verificationStatus: 'pending',
    });
    const highExternalSignals = product({
      reviewsCount: 100_000,
      averageRating: 5,
      verificationStatus: 'verified',
    });

    expect(calculateCompatibilityScore(lowExternalSignals, profile)).toBe(
      calculateCompatibilityScore(highExternalSignals, profile),
    );
  });

  it('sets the final score to zero when the product species does not match', () => {
    const result = getRecommendationBreakdown(product({ targetPetType: 'cat' }), profile);
    expect(result.speciesMismatch).toBe(true);
    expect(result.total).toBe(0);
  });

  it('applies an approximately 100-point allergy penalty to the ranking score itself', () => {
    const allergicProfile: UserPetProfile = { ...profile, allergies: ['닭'] };
    const result = getRecommendationBreakdown(product(), allergicProfile);

    expect(result.allergyHits).toEqual(['닭']);
    expect(result.allergyPenalty).toBe(90);
    expect(result.total).toBeLessThanOrEqual(10);
    expect(calculateCompatibilityScore(product(), allergicProfile)).toBe(result.total);
  });

  it('applies up to a 30-point penalty for low historical preference', () => {
    const base = getRecommendationBreakdown(product(), profile);
    const lowPreferenceProfile: UserPetProfile = {
      ...profile,
      productPreferences: { 'product-1': 1 },
    };
    const result = getRecommendationBreakdown(product(), lowPreferenceProfile);

    expect(result.preferenceLevel).toBe(1);
    expect(result.preferencePenalty).toBe(30);
    expect(result.total).toBe(Math.max(0, base.total - 30));
  });

  it('scores health-concern matching separately from general health suitability', () => {
    const concernProfile: UserPetProfile = {
      ...profile,
      healthConcerns: ['관절'],
    };
    const matched = product({
      healthConcerns: ['관절'],
      ingredients: [ingredient('글루코사민', 'safe', '관절 건강')],
    });
    const unmatched = product({
      healthConcerns: [],
      ingredients: [ingredient('닭고기')],
    });

    expect(getRecommendationBreakdown(matched, concernProfile).concernFit).toBe(20);
    expect(getRecommendationBreakdown(unmatched, concernProfile).concernFit).toBe(5);
  });

  it('penalizes danger and caution ingredients inside ingredient safety', () => {
    const safe = getRecommendationBreakdown(product(), profile);
    const risky = getRecommendationBreakdown(
      product({ ingredients: [ingredient('위험원료', 'danger'), ingredient('주의원료', 'caution')] }),
      profile,
    );

    expect(risky.ingredientSafety).toBeLessThan(safe.ingredientSafety);
    expect(risky.dangerCount).toBe(1);
    expect(risky.cautionCount).toBe(1);
  });

  it('keeps public aliases consistent', () => {
    const input = product();
    const expected = getRecommendationBreakdown(input, profile);

    expect(getCompatibilityBreakdown(input, profile)).toEqual(expected);
    expect(buildRecommendationBreakdown(input, profile)).toEqual(expected);
    expect(getProductRecommendationInsights(input, profile)).toEqual({
      breakdown: expected,
      reasons: expected.reasons,
    });
  });

  it('ranks products by the personalized final score', () => {
    const allergicProfile: UserPetProfile = { ...profile, allergies: ['닭'] };
    const products = [
      product({ id: 'chicken', ingredients: [ingredient('닭고기')] }),
      product({ id: 'salmon', ingredients: [ingredient('연어'), ingredient('유산균')] }),
      product({ id: 'danger', ingredients: [ingredient('위험원료', 'danger')] }),
    ];
    const ranked = rankProductsForProfile(products, allergicProfile);

    expect(ranked).toHaveLength(products.length);
    expect(ranked[0].product.id).toBe('salmon');
    for (let index = 1; index < ranked.length; index += 1) {
      expect(ranked[index - 1].score).toBeGreaterThanOrEqual(ranked[index].score);
    }
  });
});

describe('preferencePenaltyFromLevel', () => {
  it('maps 1~5 preference levels to a maximum 30-point penalty', () => {
    expect(preferencePenaltyFromLevel(null)).toBe(0);
    expect(preferencePenaltyFromLevel(1)).toBe(30);
    expect(preferencePenaltyFromLevel(2)).toBe(20);
    expect(preferencePenaltyFromLevel(3)).toBe(10);
    expect(preferencePenaltyFromLevel(4)).toBe(0);
    expect(preferencePenaltyFromLevel(5)).toBe(0);
  });
});

describe('resolveDisplayVerdict — safety cap', () => {
  it('keeps a safe score unchanged', () => {
    const verdict = resolveDisplayVerdict(88);
    expect(verdict.score).toBe(88);
    expect(verdict.grade).toBe('A');
    expect(verdict.capReason).toBeNull();
  });

  it('caps species mismatch at zero', () => {
    const verdict = resolveDisplayVerdict(88, { speciesMismatch: true });
    expect(verdict.score).toBe(0);
    expect(verdict.grade).toBe('F');
    expect(verdict.capReason).toBe('species');
  });

  it('caps an allergy result below 10 points', () => {
    const verdict = resolveDisplayVerdict(88, { allergyHits: 1 });
    expect(verdict.score).toBe(9);
    expect(verdict.grade).toBe('F');
    expect(verdict.capReason).toBe('allergy');
  });

  it('caps danger ingredients at C grade', () => {
    const verdict = resolveDisplayVerdict(90, { dangerCount: 2 });
    expect(verdict.score).toBe(69);
    expect(verdict.grade).toBe('C');
    expect(verdict.capReason).toBe('danger');
  });

  it('always derives the grade from the capped score', () => {
    for (const raw of [100, 92, 71, 60, 42, 10]) {
      for (const opts of [
        {},
        { speciesMismatch: true },
        { allergyHits: 1 },
        { dangerCount: 1 },
      ]) {
        const verdict = resolveDisplayVerdict(raw, opts);
        expect(verdict.grade).toBe(gradeFromScore(verdict.score));
      }
    }
  });

  it('safely clamps invalid input into the 0~100 range', () => {
    expect(resolveDisplayVerdict(Number.NaN).score).toBe(0);
    expect(resolveDisplayVerdict(-20).score).toBe(0);
    expect(resolveDisplayVerdict(140).score).toBe(100);
    expect(resolveDisplayVerdict(140, { allergyHits: 1 }).score).toBe(9);
  });
});
