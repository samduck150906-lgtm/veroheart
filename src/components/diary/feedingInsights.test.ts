import { describe, it, expect } from 'vitest';
import type { PetFeedingLog } from '../../types';
import {
  computeDailySummary,
  groupByMealPeriod,
  computeMonthlyInsights,
  computePreferenceTrend,
  weekStartKey,
  weekDateKeys,
} from './feedingInsights';

let seq = 0;
function log(over: Partial<PetFeedingLog> = {}): PetFeedingLog {
  seq += 1;
  return {
    id: `l${seq}`,
    userId: 'u1',
    petId: 'p1',
    productId: over.isCustomProduct ? null : `prod${seq}`,
    productType: 'food',
    customProductName: null,
    isCustomProduct: false,
    feedingDate: '2026-07-23',
    feedingTime: null,
    mealPeriod: null,
    amount: null,
    unit: null,
    memo: null,
    preferenceLevel: null,
    reactionNote: null,
    imageUrl: null,
    createdAt: '',
    updatedAt: '',
    product: over.isCustomProduct
      ? null
      : { id: `prod${seq}`, name: `제품${seq}`, brand: 'B', imageUrl: 'i', productType: 'food', caloriesPer100g: null },
    ...over,
  };
}

describe('computeDailySummary', () => {
  it('counts by type and totals', () => {
    const s = computeDailySummary([
      log({ productType: 'food' }),
      log({ productType: 'snack' }),
      log({ productType: 'supplement' }),
      log({ productType: 'supplement' }),
    ]);
    expect(s).toMatchObject({ food: 1, snack: 1, supplement: 2, total: 4 });
  });

  it('sums kcal only for gram records with product calories, never estimates otherwise', () => {
    const s = computeDailySummary([
      // 50g × 380kcal/100g = 190
      log({ amount: 50, unit: 'g', product: { id: 'a', name: 'A', brand: 'B', imageUrl: 'i', productType: 'food', caloriesPer100g: 380 } }),
      // 100g × 300 = 300
      log({ amount: 100, unit: 'g', product: { id: 'b', name: 'B', brand: 'B', imageUrl: 'i', productType: 'food', caloriesPer100g: 300 } }),
      // unit 개 → 제외
      log({ amount: 2, unit: '개', product: { id: 'c', name: 'C', brand: 'B', imageUrl: 'i', productType: 'snack', caloriesPer100g: 400 } }),
      // 칼로리 데이터 없음 → 제외
      log({ amount: 30, unit: 'g' }),
    ]);
    expect(s.kcal).toBe(490);
    expect(s.kcalCounted).toBe(2);
  });

  it('returns kcal null when nothing is computable', () => {
    const s = computeDailySummary([log({ amount: 2, unit: '개' }), log({ amount: null, unit: 'g' })]);
    expect(s.kcal).toBeNull();
    expect(s.kcalCounted).toBe(0);
  });
});

describe('groupByMealPeriod', () => {
  it('orders sections morning→…→other, with undated in a trailing none bucket', () => {
    const sections = groupByMealPeriod([
      log({ mealPeriod: 'dinner' }),
      log({ mealPeriod: 'morning' }),
      log({ mealPeriod: null }),
      log({ mealPeriod: 'morning' }),
    ]);
    expect(sections.map((s) => s.period)).toEqual(['morning', 'dinner', 'none']);
    expect(sections[0].logs).toHaveLength(2);
    expect(sections[0].label).toBe('아침');
    expect(sections[2].label).toBe('시간대 미지정');
  });
});

describe('computeMonthlyInsights', () => {
  it('computes days logged, type counts, and top products by frequency', () => {
    const prodA = { id: 'A', name: '오리젠', brand: '오리젠', imageUrl: 'i', productType: 'food', caloriesPer100g: null };
    const ins = computeMonthlyInsights([
      log({ feedingDate: '2026-07-20', productId: 'A', product: prodA }),
      log({ feedingDate: '2026-07-20', productId: 'A', product: prodA }),
      log({ feedingDate: '2026-07-21', productType: 'snack', productId: 'A', product: { ...prodA, productType: 'snack' } }),
      log({ feedingDate: '2026-07-22', isCustomProduct: true, productType: 'custom', customProductName: '집밥' }),
    ]);
    expect(ins.daysLogged).toBe(3);
    expect(ins.totalRecords).toBe(4);
    expect(ins.topProducts[0].label).toBe('오리젠');
    expect(ins.topProducts[0].count).toBe(3);
    expect(ins.topProducts.some((p) => p.isCustom && p.label === '집밥')).toBe(true);
  });

  it('computes a consecutive-day streak ending at the latest logged day', () => {
    const ins = computeMonthlyInsights([
      log({ feedingDate: '2026-07-21' }),
      log({ feedingDate: '2026-07-22' }),
      log({ feedingDate: '2026-07-23' }),
      // gap at 07-19, isolated earlier day
      log({ feedingDate: '2026-07-17' }),
    ]);
    expect(ins.streak).toBe(3); // 21,22,23
  });
});

describe('week helpers', () => {
  it('weekStartKey returns the Sunday of the week', () => {
    // 2026-07-23 is a Thursday → week starts Sunday 2026-07-19
    expect(weekStartKey('2026-07-23')).toBe('2026-07-19');
    // a Sunday maps to itself
    expect(weekStartKey('2026-07-19')).toBe('2026-07-19');
  });
  it('weekDateKeys returns 7 consecutive days', () => {
    expect(weekDateKeys('2026-07-19')).toEqual([
      '2026-07-19', '2026-07-20', '2026-07-21', '2026-07-22', '2026-07-23', '2026-07-24', '2026-07-25',
    ]);
  });
});

describe('computePreferenceTrend', () => {
  it('averages preference per day, only for days with preference records, ascending', () => {
    const trend = computePreferenceTrend([
      log({ feedingDate: '2026-07-22', preferenceLevel: 4 }),
      log({ feedingDate: '2026-07-22', preferenceLevel: 2 }),
      log({ feedingDate: '2026-07-23', preferenceLevel: 5 }),
      log({ feedingDate: '2026-07-21', preferenceLevel: null }), // ignored
    ]);
    expect(trend).toEqual([
      { date: '2026-07-22', avg: 3, count: 2 },
      { date: '2026-07-23', avg: 5, count: 1 },
    ]);
  });
  it('returns empty when no preference is recorded', () => {
    expect(computePreferenceTrend([log({ preferenceLevel: null })])).toEqual([]);
  });
});
