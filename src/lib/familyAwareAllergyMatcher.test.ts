import { describe, expect, it } from 'vitest';
import { analyzeFeed } from '../analysis/feedAnalysis';
import {
  allergyTagsForIngredient,
  allergyTagsForLabel,
  isFamilyAllergyIngredient,
} from '../analysis/allergyFamilyMatcher';
import type { Ingredient, Product, UserPetProfile } from '../types';
import {
  countAllergyHits,
  getRecommendationBreakdown,
  resolveDisplayVerdict,
} from '../utils/score';

function ingredient(nameKo: string, nameEn = ''): Ingredient {
  return {
    id: nameKo,
    nameKo,
    nameEn,
    purpose: '원료',
    riskLevel: 'safe',
  };
}

function product(ingredients: Ingredient[]): Product {
  return {
    id: 'fixture-product',
    brand: 'Fixture',
    name: 'Fixture Food',
    category: '사료',
    targetPetType: 'dog',
    imageUrl: '',
    ingredients,
    reviewsCount: 0,
    averageRating: 0,
  };
}

const chickenAllergyProfile: UserPetProfile = {
  id: 'pet-1',
  name: '테스트견',
  species: 'Dog',
  age: 4,
  healthConcerns: [],
  allergies: ['닭'],
};

describe('family-aware allergy matcher', () => {
  it('maps allergy labels to source-family tags', () => {
    expect(allergyTagsForLabel('닭')).toEqual(expect.arrayContaining(['chicken', 'poultry']));
    expect(allergyTagsForLabel('연어')).toContain('fish');
    expect(allergyTagsForLabel('계란')).toContain('egg');
  });

  it('matches chicken allergy across meat meal organ fat and poultry byproduct labels', () => {
    const labels = ['닭고기', '계육분', '치킨밀', '닭간', '닭지방', '가금류부산물'];

    for (const label of labels) {
      expect(isFamilyAllergyIngredient(ingredient(label), ['닭']), label).toBe(true);
    }
  });

  it('does not treat unknown generic animal byproduct as named chicken', () => {
    expect(isFamilyAllergyIngredient(ingredient('동물성부산물'), ['닭'])).toBe(false);
    expect(allergyTagsForIngredient(ingredient('동물성부산물'))).not.toContain('chicken');
  });

  it('returns allergy hit for chicken-family meal and applies allergy penalty', () => {
    const fixture = product([ingredient('계육분'), ingredient('쌀')]);
    const hits = countAllergyHits(fixture, chickenAllergyProfile);
    const breakdown = getRecommendationBreakdown(fixture, chickenAllergyProfile);
    const display = resolveDisplayVerdict(breakdown.total, {
      speciesMismatch: breakdown.speciesMismatch,
      allergyHits: breakdown.allergyHits.length,
      dangerCount: breakdown.dangerCount,
    });

    expect(hits).toEqual(['닭']);
    expect(breakdown.allergyPenalty).toBe(90);
    expect(breakdown.reasons.some((reason) => reason.includes('알레르기'))).toBe(true);
    expect(display.score).toBeLessThanOrEqual(9);
    expect(display.capReason).toBeNull();
  });

  it('keeps feed analysis allergy copy aligned with score allergy matching', () => {
    const fixture = product([ingredient('치킨밀'), ingredient('가금류부산물')]);
    const feed = analyzeFeed(fixture, chickenAllergyProfile);

    expect(feed.ingredientQuality.allergyHits).toEqual(expect.arrayContaining(['치킨밀', '가금류부산물']));
    expect(feed.summary).toContain('피해야 할 성분');
  });
});
