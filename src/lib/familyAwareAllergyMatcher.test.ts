import { describe, expect, it } from 'vitest';
import { analyzeFeed } from '../analysis/feedAnalysis';
import {
  allergyTagsForIngredient,
  allergyTagsForLabel,
  classifyAllergyRelationship,
  isFamilyAllergyIngredient,
} from '../analysis/allergyFamilyMatcher';
import type { Ingredient, Product, UserPetProfile } from '../types';
import {
  countAllergyCautions,
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

  it('keeps same-source poultry protein forms hard while separating fat and generic poultry', () => {
    for (const label of ['닭고기', '계육분', '치킨밀', '닭간', '닭연골']) {
      expect(isFamilyAllergyIngredient(ingredient(label), ['닭']), label).toBe(true);
      expect(classifyAllergyRelationship(ingredient(label), '닭').kind, label).toBe('hard');
    }

    expect(isFamilyAllergyIngredient(ingredient('닭지방'), ['닭'])).toBe(false);
    expect(classifyAllergyRelationship(ingredient('닭지방'), '닭').kind).toBe('processing_caution');
    expect(isFamilyAllergyIngredient(ingredient('가금류부산물'), ['닭'])).toBe(false);
    expect(classifyAllergyRelationship(ingredient('가금류부산물'), '닭').kind).toBe('strong_caution');
  });

  it('treats other named poultry as cross caution instead of confirmed hard allergy', () => {
    expect(classifyAllergyRelationship(ingredient('오리고기'), '닭').kind).toBe('cross_caution');
    expect(classifyAllergyRelationship(ingredient('칠면조고기'), '닭').kind).toBe('cross_caution');
    expect(isFamilyAllergyIngredient(ingredient('오리고기'), ['닭'])).toBe(false);
    expect(isFamilyAllergyIngredient(ingredient('칠면조고기'), ['닭'])).toBe(false);
  });

  it('keeps broad poultry allergy hard for named poultry proteins', () => {
    expect(isFamilyAllergyIngredient(ingredient('닭고기'), ['가금류'])).toBe(true);
    expect(isFamilyAllergyIngredient(ingredient('오리고기'), ['가금류'])).toBe(true);
    expect(isFamilyAllergyIngredient(ingredient('칠면조고기'), ['가금류'])).toBe(true);
  });

  it('keeps egg independent from poultry meat allergy', () => {
    expect(isFamilyAllergyIngredient(ingredient('난백'), ['닭'])).toBe(false);
    expect(classifyAllergyRelationship(ingredient('난백'), '닭').kind).toBe('none');
  });

  it('does not treat unknown generic animal byproduct as named chicken', () => {
    expect(isFamilyAllergyIngredient(ingredient('동물성부산물'), ['닭'])).toBe(false);
    expect(classifyAllergyRelationship(ingredient('동물성부산물'), '닭').kind).toBe('none');
    expect(allergyTagsForIngredient(ingredient('동물성부산물'))).not.toContain('chicken');
  });

  it('returns hard allergy hit for chicken meal and keeps the existing hard penalty', () => {
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
    expect(breakdown.allergyCautionPenalty).toBe(0);
    expect(breakdown.reasons.some((reason) => reason.includes('알레르기'))).toBe(true);
    expect(display.score).toBeLessThanOrEqual(9);
  });

  it('applies a modest cross-poultry penalty without the hard display cap', () => {
    const fixture = product([ingredient('오리고기')]);
    const cautions = countAllergyCautions(fixture, chickenAllergyProfile);
    const breakdown = getRecommendationBreakdown(fixture, chickenAllergyProfile);
    const display = resolveDisplayVerdict(breakdown.total, {
      speciesMismatch: breakdown.speciesMismatch,
      allergyHits: breakdown.allergyHits.length,
      dangerCount: breakdown.dangerCount,
    });

    expect(breakdown.allergyHits).toEqual([]);
    expect(cautions.map((match) => match.kind)).toContain('cross_caution');
    expect(breakdown.allergyPenalty).toBe(0);
    expect(breakdown.allergyCautionPenalty).toBe(8);
    expect(display.score).toBe(breakdown.total);
    expect(display.capReason).toBeNull();
  });

  it('caps two related poultry species at a 12 point cross caution penalty', () => {
    const fixture = product([ingredient('오리고기'), ingredient('칠면조고기')]);
    const breakdown = getRecommendationBreakdown(fixture, chickenAllergyProfile);

    expect(breakdown.allergyHits).toEqual([]);
    expect(breakdown.allergyCautionPenalty).toBe(12);
  });

  it('uses stronger uncertainty caution for generic poultry and processing caution for fat', () => {
    const generic = getRecommendationBreakdown(
      product([ingredient('가금류부산물')]),
      chickenAllergyProfile,
    );
    const fat = getRecommendationBreakdown(product([ingredient('닭지방')]), chickenAllergyProfile);
    const hydrolyzed = getRecommendationBreakdown(
      product([ingredient('가수분해 닭 단백질')]),
      chickenAllergyProfile,
    );

    expect(generic.allergyHits).toEqual([]);
    expect(generic.allergyCautionPenalty).toBe(15);
    expect(fat.allergyHits).toEqual([]);
    expect(fat.allergyCautionPenalty).toBe(5);
    expect(hydrolyzed.allergyHits).toEqual([]);
    expect(hydrolyzed.allergyCautionPenalty).toBe(10);
  });

  it('keeps feed analysis hard-allergy copy aligned with hard matcher only', () => {
    const fixture = product([ingredient('치킨밀'), ingredient('가금류부산물'), ingredient('오리고기')]);
    const feed = analyzeFeed(fixture, chickenAllergyProfile);

    expect(feed.ingredientQuality.allergyHits).toEqual(['치킨밀']);
    expect(feed.summary).toContain('피해야 할 성분');
  });
});