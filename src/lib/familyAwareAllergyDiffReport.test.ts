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
  it('documents hard hits and caution tiers separately under poultry policy v1', () => {
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
        allergyCautionPenalty: breakdown.allergyCautionPenalty,
        cautionKinds: breakdown.allergyCautions.map((match) => match.kind),
        displayScore: display.score,
      };
    });

    expect(rows.filter((row) => row.allergyHits.includes('닭')).map((row) => row.id)).toEqual([
      'ordinary-chicken',
      'meal-label',
      'organ-label',
    ]);

    const fat = rows.find((row) => row.id === 'fat-label');
    expect(fat?.allergyHits).toEqual([]);
    expect(fat?.allergyCautionPenalty).toBe(5);
    expect(fat?.cautionKinds).toContain('processing_caution');
    expect(fat?.displayScore).toBeGreaterThan(9);

    const genericPoultry = rows.find((row) => row.id === 'poultry-byproduct-label');
    expect(genericPoultry?.allergyHits).toEqual([]);
    expect(genericPoultry?.allergyCautionPenalty).toBe(15);
    expect(genericPoultry?.cautionKinds).toContain('strong_caution');
    expect(genericPoultry?.displayScore).toBeGreaterThan(9);

    const unknown = rows.find((row) => row.id === 'unknown-byproduct-label');
    expect(unknown?.allergyHits).toEqual([]);
    expect(unknown?.allergyCautionPenalty).toBe(0);
    expect(unknown?.cautionKinds).toEqual([]);

    expect(rows.filter((row) => row.allergyPenalty === 90)).toHaveLength(3);
    expect(rows.filter((row) => row.displayScore <= 9)).toHaveLength(3);
  });
});