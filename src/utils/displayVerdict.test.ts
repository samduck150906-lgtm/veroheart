import { describe, expect, it } from 'vitest';
import type { Ingredient, Product, UserPetProfile } from '../types';
import { resolveProductDisplayVerdict } from './displayVerdict';
import { getRecommendationBreakdown } from './score';

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
    imageUrl: '',
    ingredients: [ingredient('닭고기'), ingredient('유산균')],
    reviewsCount: 100,
    averageRating: 4.5,
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

describe('resolveProductDisplayVerdict', () => {
  it('keeps safe product card score aligned with the recommendation score', () => {
    const input = product();
    const breakdown = getRecommendationBreakdown(input, profile);
    const display = resolveProductDisplayVerdict(input, profile);

    expect(display.breakdown).toEqual(breakdown);
    expect(display.score).toBe(breakdown.total);
    expect(display.verdict.capReason).toBeNull();
  });

  it('keeps species mismatch visibly blocked at zero', () => {
    const display = resolveProductDisplayVerdict(product({ targetPetType: 'cat' }), profile);

    expect(display.breakdown.speciesMismatch).toBe(true);
    expect(display.score).toBe(0);
    expect(display.grade).toBe('F');
  });

  it('caps allergy display below ten even if a caller bypasses the detail page', () => {
    const allergicProfile: UserPetProfile = { ...profile, allergies: ['닭'] };
    const display = resolveProductDisplayVerdict(product(), allergicProfile);

    expect(display.breakdown.allergyHits).toEqual(['닭']);
    expect(display.score).toBeLessThanOrEqual(9);
    expect(display.grade).toBe('F');
  });

  it('caps danger ingredient display at C grade ceiling', () => {
    const risky = product({
      ingredients: [ingredient('고기', 'safe'), ingredient('위험원료', 'danger')],
    });
    const display = resolveProductDisplayVerdict(risky, profile);

    expect(display.breakdown.dangerCount).toBe(1);
    expect(display.score).toBeLessThanOrEqual(69);
    expect(display.grade).not.toBe('A');
    expect(display.grade).not.toBe('B');
  });
});
