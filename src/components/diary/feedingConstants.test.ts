import { describe, it, expect } from 'vitest';
import {
  toDateKey,
  productTypeToFeedingType,
  feedingTypeMeta,
  mealPeriodLabel,
  FEEDING_TYPE_OPTIONS,
} from './feedingConstants';

describe('toDateKey', () => {
  it('formats a date as local YYYY-MM-DD (zero padded)', () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(toDateKey(new Date(2026, 11, 31))).toBe('2026-12-31');
  });
});

describe('productTypeToFeedingType', () => {
  it('maps DB product_type to diary type', () => {
    expect(productTypeToFeedingType('food')).toBe('food');
    expect(productTypeToFeedingType('snack')).toBe('snack');
    expect(productTypeToFeedingType('supplement')).toBe('supplement');
    // unknown/null → food (안전 기본값)
    expect(productTypeToFeedingType(null)).toBe('food');
    expect(productTypeToFeedingType('etc')).toBe('food');
  });
});

describe('feedingTypeMeta', () => {
  it('returns label + search filter for each type', () => {
    expect(feedingTypeMeta('food').label).toBe('사료');
    expect(feedingTypeMeta('snack').searchType).toBe('snack');
    expect(feedingTypeMeta('supplement').label).toBe('영양제');
    // custom has no DB search
    expect(feedingTypeMeta('custom').searchType).toBeUndefined();
  });

  it('exposes exactly 4 selectable types', () => {
    expect(FEEDING_TYPE_OPTIONS.map((t) => t.value)).toEqual(['food', 'snack', 'supplement', 'custom']);
  });
});

describe('mealPeriodLabel', () => {
  it('maps meal periods to Korean labels', () => {
    expect(mealPeriodLabel('morning')).toBe('아침');
    expect(mealPeriodLabel('dinner')).toBe('저녁');
    expect(mealPeriodLabel(null)).toBeNull();
  });
});
