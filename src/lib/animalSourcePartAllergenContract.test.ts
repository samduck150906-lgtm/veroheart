import { describe, expect, it } from 'vitest';
import {
  ANIMAL_PART_CONTRACT_EXAMPLES,
  canCollapseIntoOrdinaryMeat,
  isAnimalContractScoreReady,
} from './animalSourcePartAllergenContract';

describe('animal source part allergen contract', () => {
  it('separates canonical identity from source and allergen family', () => {
    const fresh = ANIMAL_PART_CONTRACT_EXAMPLES.find((item) => item.kind === 'fresh_meat');
    const meal = ANIMAL_PART_CONTRACT_EXAMPLES.find((item) => item.kind === 'processed_meal');

    expect(fresh?.canonicalId).toBe('chicken');
    expect(meal?.canonicalId).toBe('chicken_meal');
    expect(fresh?.sourceFamily).toBe(meal?.sourceFamily);
    expect(fresh?.allergenFamily).toBe(meal?.allergenFamily);
    expect(fresh?.canonicalId).not.toBe(meal?.canonicalId);
  });

  it('does not collapse meal fat organ or byproduct into ordinary meat', () => {
    for (const item of ANIMAL_PART_CONTRACT_EXAMPLES) {
      if (item.kind === 'fresh_meat') continue;
      expect(canCollapseIntoOrdinaryMeat(item), item.kind).toBe(false);
      expect(item.collapseIntoOrdinaryMeatAllowed, item.kind).toBe(false);
    }
  });

  it('keeps fat organ and generic byproduct review-only for scoring', () => {
    for (const item of ANIMAL_PART_CONTRACT_EXAMPLES) {
      if (['fat', 'organ', 'generic_byproduct'].includes(item.kind)) {
        expect(item.scoringReadiness, item.kind).toBe('review_only');
        expect(isAnimalContractScoreReady(item), item.kind).toBe(false);
      }
    }
  });

  it('allows source/allergen family without approving score use', () => {
    const reviewOnly = ANIMAL_PART_CONTRACT_EXAMPLES.filter((item) => item.allergyFamilyOnlyAllowed);
    expect(reviewOnly.length).toBeGreaterThan(0);
    for (const item of reviewOnly) {
      expect(item.allergenFamily).toBeTruthy();
      expect(item.canonicalId).toBeNull();
      expect(isAnimalContractScoreReady(item)).toBe(false);
    }
  });
});
