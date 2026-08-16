import { describe, expect, it } from 'vitest';
import {
  ANIMAL_PART_CONTRACT_EXAMPLES,
  type AnimalIngredientMeaningContract,
} from './animalSourcePartAllergenContract';

interface AnimalDiffRow extends AnimalIngredientMeaningContract {
  label: string;
  scoreDeltaAllowed: boolean;
  visibleChangeAllowed: boolean;
}

const rows: AnimalDiffRow[] = ANIMAL_PART_CONTRACT_EXAMPLES.map((item, index) => ({
  ...item,
  label: `fixture-${index + 1}`,
  scoreDeltaAllowed: false,
  visibleChangeAllowed: false,
}));

function summarize(input: AnimalDiffRow[]) {
  return input.reduce(
    (acc, row) => {
      acc.total += 1;
      acc[row.kind] = (acc[row.kind] ?? 0) + 1;
      if (row.canonicalId) acc.canonicalRows += 1;
      if (row.allergenFamily) acc.allergenRows += 1;
      if (row.scoringReadiness === 'review_only') acc.reviewOnlyRows += 1;
      if (row.scoreDeltaAllowed) acc.scoreDeltaAllowedRows += 1;
      if (row.visibleChangeAllowed) acc.visibleChangeAllowedRows += 1;
      return acc;
    },
    {
      total: 0,
      canonicalRows: 0,
      allergenRows: 0,
      reviewOnlyRows: 0,
      scoreDeltaAllowedRows: 0,
      visibleChangeAllowedRows: 0,
    } as Record<string, number>,
  );
}

describe('animal family non-runtime diff report', () => {
  it('summarizes contract rows without permitting score or visible changes', () => {
    const summary = summarize(rows);
    expect(summary.total).toBe(5);
    expect(summary.canonicalRows).toBe(2);
    expect(summary.allergenRows).toBe(5);
    expect(summary.reviewOnlyRows).toBe(3);
    expect(summary.scoreDeltaAllowedRows).toBe(0);
    expect(summary.visibleChangeAllowedRows).toBe(0);
  });

  it('keeps every review-only row out of scoring', () => {
    for (const row of rows.filter((item) => item.scoringReadiness === 'review_only')) {
      expect(row.canonicalId).toBeNull();
      expect(row.scoreDeltaAllowed).toBe(false);
      expect(row.visibleChangeAllowed).toBe(false);
    }
  });

  it('keeps fresh meat and meal separate while sharing allergy family', () => {
    const fresh = rows.find((row) => row.kind === 'fresh_meat');
    const meal = rows.find((row) => row.kind === 'processed_meal');
    expect(fresh?.canonicalId).toBe('chicken');
    expect(meal?.canonicalId).toBe('chicken_meal');
    expect(fresh?.allergenFamily).toBe(meal?.allergenFamily);
    expect(fresh?.canonicalId).not.toBe(meal?.canonicalId);
  });
});
