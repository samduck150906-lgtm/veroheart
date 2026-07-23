import type { FeedingProductType, MealPeriod, PetFeedingLog } from '../../types';
import { MEAL_PERIOD_OPTIONS, productTypeToFeedingType, toDateKey } from './feedingConstants';

/** 기록의 대표 유형 — custom 이면 조인된 제품 유형으로 보정 */
export function logFeedingType(log: PetFeedingLog): FeedingProductType {
  return log.productType === 'custom'
    ? productTypeToFeedingType(log.product?.productType)
    : log.productType;
}

export interface DailySummary {
  food: number;
  snack: number;
  supplement: number;
  total: number;
  /** 계산 가능한 기록으로 합산한 열량(kcal). 계산 가능한 기록이 없으면 null */
  kcal: number | null;
  /** 열량 합계에 실제로 반영된 기록 수 */
  kcalCounted: number;
}

/**
 * 선택 날짜의 섭취 요약. 열량은 "제품 열량(kcal/100g)이 있고 급여 단위가 g" 인
 * 기록만 합산한다. 데이터가 없으면 추정하지 않는다(kcal=null).
 */
export function computeDailySummary(logs: PetFeedingLog[]): DailySummary {
  let food = 0;
  let snack = 0;
  let supplement = 0;
  let kcal = 0;
  let kcalCounted = 0;

  for (const log of logs) {
    const t = logFeedingType(log);
    if (t === 'snack') snack += 1;
    else if (t === 'supplement') supplement += 1;
    else food += 1;

    const per100 = log.product?.caloriesPer100g;
    const isGram = (log.unit ?? '').trim() === 'g';
    if (per100 != null && per100 > 0 && isGram && log.amount != null && log.amount > 0) {
      kcal += (per100 * log.amount) / 100;
      kcalCounted += 1;
    }
  }

  return {
    food,
    snack,
    supplement,
    total: logs.length,
    kcal: kcalCounted > 0 ? Math.round(kcal) : null,
    kcalCounted,
  };
}

export interface MealSection {
  period: MealPeriod | 'none';
  label: string;
  logs: PetFeedingLog[];
}

/**
 * 하루 기록을 시간대(아침/점심/저녁/간식/기타)로 묶는다. 시간대 미지정 기록은
 * 마지막 'none' 섹션으로 모은다. 각 섹션 내부는 입력 순서(시간 오름차순)를 유지.
 */
export function groupByMealPeriod(logs: PetFeedingLog[]): MealSection[] {
  const order: (MealPeriod | 'none')[] = [...MEAL_PERIOD_OPTIONS.map((m) => m.value), 'none'];
  const labelOf = (p: MealPeriod | 'none') =>
    p === 'none' ? '시간대 미지정' : MEAL_PERIOD_OPTIONS.find((m) => m.value === p)?.label ?? '기타';

  const buckets = new Map<MealPeriod | 'none', PetFeedingLog[]>();
  for (const log of logs) {
    const key: MealPeriod | 'none' = log.mealPeriod ?? 'none';
    const arr = buckets.get(key) ?? [];
    arr.push(log);
    buckets.set(key, arr);
  }
  return order
    .filter((p) => buckets.has(p))
    .map((p) => ({ period: p, label: labelOf(p), logs: buckets.get(p)! }));
}

export interface TopProduct {
  key: string;
  label: string;
  brand: string;
  imageUrl: string | null;
  isCustom: boolean;
  count: number;
  /** 재기록(다시 기록)에 쓸 대표 기록 */
  sample: PetFeedingLog;
}

export interface MonthlyInsights {
  daysLogged: number;
  totalRecords: number;
  typeCounts: { food: number; snack: number; supplement: number };
  /** 가장 최근 기록일부터 이어진 연속 기록 일수 */
  streak: number;
  topProducts: TopProduct[];
}

function prevDateKey(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - 1);
  return toDateKey(dt);
}

function logKey(log: PetFeedingLog): string {
  if (log.isCustomProduct) return `custom:${(log.customProductName ?? '').trim().toLowerCase()}`;
  return log.productId ? `product:${log.productId}` : `custom:${(log.customProductName ?? '').trim().toLowerCase()}`;
}

function logLabel(log: PetFeedingLog): string {
  return log.isCustomProduct
    ? log.customProductName ?? '직접 입력 제품'
    : log.product?.name ?? '제품';
}

/** 월간(또는 임의 기간) 기록 집합에서 인사이트를 계산한다. */
export function computeMonthlyInsights(logs: PetFeedingLog[]): MonthlyInsights {
  const dates = new Set<string>();
  const typeCounts = { food: 0, snack: 0, supplement: 0 };
  const freq = new Map<string, TopProduct>();

  for (const log of logs) {
    dates.add(log.feedingDate);
    const t = logFeedingType(log);
    typeCounts[t === 'snack' ? 'snack' : t === 'supplement' ? 'supplement' : 'food'] += 1;

    const key = logKey(log);
    const existing = freq.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      freq.set(key, {
        key,
        label: logLabel(log),
        brand: log.isCustomProduct ? '직접 입력' : log.product?.brand ?? '',
        imageUrl: log.isCustomProduct ? null : log.product?.imageUrl ?? null,
        isCustom: log.isCustomProduct,
        count: 1,
        sample: log,
      });
    }
  }

  // 연속 기록: 가장 최근 기록일부터 하루씩 거슬러 올라가며 존재하는 동안 카운트
  let streak = 0;
  if (dates.size > 0) {
    const sorted = [...dates].sort(); // 오름차순
    let cursor = sorted[sorted.length - 1];
    while (dates.has(cursor)) {
      streak += 1;
      cursor = prevDateKey(cursor);
    }
  }

  const topProducts = [...freq.values()].sort((a, b) => b.count - a.count).slice(0, 3);

  return {
    daysLogged: dates.size,
    totalRecords: logs.length,
    typeCounts,
    streak,
    topProducts,
  };
}
