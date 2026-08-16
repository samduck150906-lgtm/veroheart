import { describe, expect, it } from 'vitest';
import type { AnimalIngredientMeaningContract } from './animalSourcePartAllergenContract';

const rows: AnimalIngredientMeaningContract[] = [
  {
    canonicalId: 'chicken',
    sourceFamily: 'chicken',
    allergenFamily: 'chicken',
    kind: 'fresh_meat',
    scoringReadiness: 'needs_diff',
    collapseIntoOrdinaryMeatAllowed: true,
    allergyFamilyOnlyAllowed: false,
  },
  {
    canonicalId: 'chicken_meal',
    sourceFamily: 'chicken',
    allergenFamily: 'chicken',
    kind: 'processed_meal',
    scoringReadiness: 'needs_diff',
    collapseIntoOrdinaryMeatAllowed: false,
    allergyFamilyOnlyAllowed: false,
  },
  {
    canonicalId: null,
    sourceFamily: 'chicken',
    allergenFamily: 'chicken',
    kind: 'organ',
    scoringReadiness: 'review_only',
    collapseIntoOrdinaryMeatAllowed: false,
    allergyFamilyOnlyAllowed: true,
  },
  {
    canonicalId: null,
    sourceFamily: 'chicken',
    allergenFamily: 'chicken',
    kind: 'fat',
    scoringReadiness: 'review_only',
    collapseIntoOrdinaryMeatAllowed: false,
    allergyFamilyOnlyAllowed: true,
  },
  {
    canonicalId: null,
    sourceFamily: 'poultry',
    allergenFamily: 'poultry',
    kind: 'generic_byproduct',
    scoringReadiness: 'review_only',
    collapseIntoOrdinaryMeatAllowed: false,
    allergyFamilyOnlyAllowed: true,
  },
];

describe('chicken allergen family guard', () => {
  it('requires chicken-family allergy review beyond fresh meat only', () => {
    for (const row of rows.filter((item) => item.allergenFamily === 'chicken')) {
      expect(row.sourceFamily).toBe('chicken');
      expect(row.allergenFamily).toBe('chicken');
    }
  });

  it('does not allow chicken organ or fat to be recommended as ordinary meat', () => {
    for (const row of rows.filter((item) => ['organ', 'fat'].includes(item.kind))) {
      expect(row.canonicalId).toBeNull();
      expect(row.collapseIntoOrdinaryMeatAllowed).toBe(false);
      expect(row.allergyFamilyOnlyAllowed).toBe(true);
      expect(row.scoringReadiness).toBe('review_only');
    }
  });

  it('keeps generic poultry byproduct out of named chicken scoring', () => {
    const byproduct = rows.find((item) => item.kind === 'generic_byproduct');
    expect(byproduct?.canonicalId).toBeNull();
    expect(byproduct?.sourceFamily).toBe('poultry');
    expect(byproduct?.allergenFamily).toBe('poultry');
    expect(byproduct?.scoringReadiness).toBe('review_only');
  });
});
