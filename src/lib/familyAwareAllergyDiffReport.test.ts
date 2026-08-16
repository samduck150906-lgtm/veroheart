import { describe, expect, it } from 'vitest';
import type { Ingredient, Product, UserPetProfile } from '../types';
import { getRecommendationBreakdown, resolveDisplayVerdict } from '../utils/score';

function ingredient(nameKo: string): Ingredient {
  return {
    id: nameKo,
    nameKo,
    nameEn: '',
    purpose: '원료',
    riskLevel: 'safe',
  };
}

function product(id: string, ingredients: Ingredient[]): Product {
  return {
    id,
    brand: 'Fixture',
    name: id,
    category: '사료',
    targetPetType: 'dog',
    imageUrl: '',
    ingredients,
    reviewsCount: 0,
    averageRating: 0,
  };
}

const profile: UserPetProfile = {
  id: 'pet-1',
  name: '테스트견',
  species: 'Dog',
  age: 4,
  healthConcerns: [],
  allergies: ['닭'],
};

const products = [
  product('ordinary-chicken', [ingredient('닭고기')]),
  product('meal-label', [ingredient('계육분')]),
  product('organ-label', [ingredient('닭간')]),
  product('fat-label', [ingredient('닭지방')]),
  product('poultry-byproduct-label', [ingredient('가금류부산물')]),
  product('unknown-byproduct-label', [ingredient('동물성부산물')]),
];

describe('family-aware allergy diff report fixture', () => {
  it('documents which fixture products are affected by chicken-family allergy matching', () => {
    const rows = products.map((item) => {
      const breakdown = getRecommendationBreakdown(item, profile);
      const display = resolveDisplayVerdict(breakdown.total, {
        speciesMismatch: breakdown.speciesMismatch,
        allergyHits: breakdown.allergyHits.length,
        dangerCount: breakdown.dangerCount,
      });
      return {
        id: item.id,
        allergyHits: breakdown.allergyHits,
        allergyPenalty: breakdown.allergyPenalty,
        displayScore: display.score,
      };
    });

    expect(rows.filter((row) => row.allergyHits.includes('닭')).map((row) => row.id)).toEqual([
      'ordinary-chicken',
      'meal-label',
      'organ-label',
      'fat-label',
      'poultry-byproduct-label',
    ]);
    expect(rows.find((row) => row.id === 'unknown-byproduct-label')?.allergyHits).toEqual([]);
    expect(rows.filter((row) => row.allergyPenalty === 90)).toHaveLength(5);
    expect(rows.filter((row) => row.displayScore <= 9)).toHaveLength(5);
  });
});
