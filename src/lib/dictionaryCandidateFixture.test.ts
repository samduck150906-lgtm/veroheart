import { describe, expect, it } from 'vitest';

type CandidateBucket = 'fresh_meat_alias' | 'named_meal_alias' | 'source_allergen_review' | 'deferred_adjacent';

interface CandidateFixtureRow {
  key: string;
  bucket: CandidateBucket;
  targetCanonicalId: string | null;
  sourceFamily: string | null;
  allergenFamily: string | null;
  scoreChangeAllowed: boolean;
  visibleChangeAllowed: boolean;
  runtimeImportAllowed: boolean;
}

const candidates: CandidateFixtureRow[] = [
  {
    key: 'chicken-fresh-gap',
    bucket: 'fresh_meat_alias',
    targetCanonicalId: 'chicken',
    sourceFamily: 'chicken',
    allergenFamily: 'chicken',
    scoreChangeAllowed: false,
    visibleChangeAllowed: false,
    runtimeImportAllowed: false,
  },
  {
    key: 'chicken-meal-gap',
    bucket: 'named_meal_alias',
    targetCanonicalId: 'chicken_meal',
    sourceFamily: 'chicken',
    allergenFamily: 'chicken',
    scoreChangeAllowed: false,
    visibleChangeAllowed: false,
    runtimeImportAllowed: false,
  },
  {
    key: 'chicken-organ-review',
    bucket: 'source_allergen_review',
    targetCanonicalId: null,
    sourceFamily: 'chicken',
    allergenFamily: 'chicken',
    scoreChangeAllowed: false,
    visibleChangeAllowed: false,
    runtimeImportAllowed: false,
  },
  {
    key: 'poultry-byproduct-review',
    bucket: 'source_allergen_review',
    targetCanonicalId: null,
    sourceFamily: 'poultry',
    allergenFamily: 'poultry',
    scoreChangeAllowed: false,
    visibleChangeAllowed: false,
    runtimeImportAllowed: false,
  },
  {
    key: 'unknown-animal-deferred',
    bucket: 'deferred_adjacent',
    targetCanonicalId: null,
    sourceFamily: null,
    allergenFamily: null,
    scoreChangeAllowed: false,
    visibleChangeAllowed: false,
    runtimeImportAllowed: false,
  },
];

describe('dictionary candidate fixture', () => {
  it('covers all planned candidate buckets without runtime use', () => {
    expect(new Set(candidates.map((row) => row.bucket))).toEqual(
      new Set(['fresh_meat_alias', 'named_meal_alias', 'source_allergen_review', 'deferred_adjacent']),
    );
    for (const row of candidates) expect(row.runtimeImportAllowed, row.key).toBe(false);
  });

  it('keeps canonical targets only for direct alias buckets', () => {
    for (const row of candidates) {
      if (row.bucket === 'fresh_meat_alias' || row.bucket === 'named_meal_alias') {
        expect(row.targetCanonicalId, row.key).toBeTruthy();
      } else {
        expect(row.targetCanonicalId, row.key).toBeNull();
      }
    }
  });

  it('does not approve score or visible changes', () => {
    for (const row of candidates) {
      expect(row.scoreChangeAllowed, row.key).toBe(false);
      expect(row.visibleChangeAllowed, row.key).toBe(false);
    }
  });
});
