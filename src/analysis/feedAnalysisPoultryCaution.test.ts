import { describe, expect, it } from 'vitest';
import type { Ingredient, Product, UserPetProfile } from '../types';
import { analyzeFeed } from './feedAnalysis';

function ingredient(nameKo: string): Ingredient {
  return {
    id: nameKo,
    nameKo,
    nameEn: '',
    purpose: '원료',
    riskLevel: 'safe',
  };
}

function product(ingredients: Ingredient[]): Product {
  return {
    id: 'duck-fixture',
    brand: 'Fixture',
    name: 'Duck fixture',
    category: '사료',
    targetPetType: 'dog',
    imageUrl: '',
    ingredients,
    reviewsCount: 0,
    averageRating: 0,
  };
}

function profile(allergies: string[]): UserPetProfile {
  return {
    id: 'pet-1',
    name: '보리',
    species: 'Dog',
    age: 4,
    healthConcerns: [],
    allergies,
  };
}

describe('feed analysis poultry caution surface', () => {
  it('shows cross-poultry caution copy without changing the objective feed-quality score', () => {
    const item = product([ingredient('오리고기')]);
    const neutral = analyzeFeed(item, profile([]));
    const chickenAllergy = analyzeFeed(item, profile(['닭']));

    expect(chickenAllergy.score).toBe(neutral.score);
    expect(chickenAllergy.ingredientQuality.allergyHits).toEqual([]);
    expect(chickenAllergy.cautions).toContain('보리의 알레르기와 관련된 원료가 있어 급여 전 확인이 필요해요');
    expect(chickenAllergy.summary).toBe('보리의 알레르기와 관련된 원료가 있어 급여 전 확인이 필요해요.');
  });

  it('keeps hard same-source allergy wording stronger than caution wording', () => {
    const item = product([ingredient('닭고기')]);
    const result = analyzeFeed(item, profile(['닭']));

    expect(result.ingredientQuality.allergyHits).toEqual(['닭고기']);
    expect(result.summary).toBe('보리가 피해야 할 성분이 있어 급여 전 확인이 필요해요.');
    expect(result.cautions.some((text) => text.includes('회피 성분'))).toBe(true);
  });
});
