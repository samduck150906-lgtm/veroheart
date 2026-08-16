import { describe, expect, it } from 'vitest';

type CandidateBucket = 'fresh_meat_alias' | 'named_meal_alias' | 'source_allergen_review' | 'deferred_adjacent';

interface CandidatePlanRow {
  bucket: CandidateBucket;
  targetCanonicalId: string | null;
  sourceFamily: string | null;
  allergenFamily: string | null;
  scoreChangeAllowed: boolean;
  visibleChangeAllowed: boolean;
  runtimeMutationAllowed: boolean;
}

const plan: CandidatePlanRow[] = [
  {
    bucket: 'fresh_meat_alias',
    targetCanonicalId: 'chicken',
    sourceFamily: 'chicken',
    allergenFamily: 'chicken',
    scoreChangeAllowed: false,
    visibleChangeAllowed: false,
    runtimeMutationAllowed: false,
  },
  {
    bucket: 'named_meal_alias',
    targetCanonicalId: 'chicken_meal',
    sourceFamily: 'chicken',
    allergenFamily: 'chicken',
    scoreChangeAllowed: false,
    visibleChangeAllowed: false,
    runtimeMutationAllowed: false,
  },
  {
    bucket: 'source_allergen_review',
    targetCanonicalId: null,
    sourceFamily: 'chicken',
    allergenFamily: 'chicken',
    scoreChangeAllowed: false,
    visibleChangeAllowed: false,
    runtimeMutationAllowed: false,
  },
  {
    bucket: 'deferred_adjacent',
    targetCanonicalId: null,
    sourceFamily: null,
    allergenFamily: null,
    scoreChangeAllowed: false,
    visibleChangeAllowed: false,
    runtimeMutationAllowed: false,
  },
];

describe('dictionary candidate patch plan', () => {
  it('separates candidate buckets before any dictionary mutation', () => {
    expect(plan.map((row) => row.bucket)).toEqual([
      'fresh_meat_alias',
      'named_meal_alias',
      'source_allergen_review',
      'deferred_adjacent',
    ]);
  });

  it('keeps meat and meal candidates mapped to different canonical ids', () => {
    const meat = plan.find((row) => row.bucket === 'fresh_meat_alias');
    const meal = plan.find((row) => row.bucket === 'named_meal_alias');
    expect(meat?.targetCanonicalId).toBe('chicken');
    expect(meal?.targetCanonicalId).toBe('chicken_meal');
    expect(meat?.targetCanonicalId).not.toBe(meal?.targetCanonicalId);
    expect(meat?.allergenFamily).toBe(meal?.allergenFamily);
  });

  it('does not approve score visible or runtime mutation changes', () => {
    for (const row of plan) {
      expect(row.scoreChangeAllowed, row.bucket).toBe(false);
      expect(row.visibleChangeAllowed, row.bucket).toBe(false);
      expect(row.runtimeMutationAllowed, row.bucket).toBe(false);
    }
  });
});
