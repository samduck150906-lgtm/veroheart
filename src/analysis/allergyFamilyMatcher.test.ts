import { describe, expect, it } from 'vitest';
import { reviewedAllergyRelationshipMatches } from './allergyFamilyMatcher';
import type { ReviewedAllergenRelationship } from './allergenRelationships';
import type { Ingredient } from '../types';

const chickenMeal: Ingredient = {
  id: 'legacy-meal',
  canonicalIngredientId: 'canonical-meal',
  nameKo: '닭고기분',
  nameEn: 'Chicken meal',
  purpose: '단백질',
  riskLevel: 'safe',
  sourceFamily: 'chicken',
  processingForm: 'meal',
  rawLabelText: '닭고기분 20%',
};

const reviewed: ReviewedAllergenRelationship = {
  id: 'reviewed-meal',
  sourceFamily: 'chicken',
  allergenId: 'chicken-allergen',
  relationshipType: 'derived_from',
  processingFormCondition: 'meal',
  speciesScope: 'both',
  evidenceSourceId: 'merck-food-allergy',
  reviewedAt: '2026-09-25T00:00:00Z',
  isActive: true,
};

describe('reviewedAllergyRelationshipMatches', () => {
  it('returns evidence-bearing findings only from reviewed relationship rows', () => {
    expect(reviewedAllergyRelationshipMatches(
      [chickenMeal],
      [{ allergenId: 'chicken-allergen', sourceFamily: 'chicken' }],
      [reviewed],
      'dog',
    )[0]).toMatchObject({
      canonicalIngredientName: '닭고기분',
      rawLabelText: '닭고기분 20%',
      relationshipType: 'derived_from',
      evidenceSourceId: 'merck-food-allergy',
    });
  });

  it('does not turn an unreviewed family-name similarity into a definitive match', () => {
    expect(reviewedAllergyRelationshipMatches(
      [{ ...chickenMeal, canonicalIngredientId: undefined, sourceFamily: undefined }],
      [{ allergenId: 'chicken-allergen', sourceFamily: 'chicken' }],
      [reviewed],
      'dog',
    )).toEqual([]);
  });
});
