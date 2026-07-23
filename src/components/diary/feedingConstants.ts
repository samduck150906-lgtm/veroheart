import type { FeedingProductType, MealPeriod } from '../../types';

/** 제품 유형(사료/간식/영양제/직접 입력) — DB product_type 규칙과 동일 */
export const FEEDING_TYPE_OPTIONS: {
  value: FeedingProductType;
  label: string;
  /** DB products.product_type 필터값 (custom 은 검색 없음) */
  searchType?: 'food' | 'snack' | 'supplement';
  color: string;
  bg: string;
}[] = [
  { value: 'food', label: '사료', searchType: 'food', color: '#B45309', bg: 'rgba(245, 158, 11, 0.14)' },
  { value: 'snack', label: '간식', searchType: 'snack', color: '#C2410C', bg: 'rgba(249, 115, 22, 0.14)' },
  { value: 'supplement', label: '영양제', searchType: 'supplement', color: '#4338CA', bg: 'rgba(99, 102, 241, 0.14)' },
  { value: 'custom', label: '직접 입력', color: '#475569', bg: 'rgba(100, 116, 139, 0.14)' },
];

export function feedingTypeMeta(type: FeedingProductType) {
  return FEEDING_TYPE_OPTIONS.find((t) => t.value === type) ?? FEEDING_TYPE_OPTIONS[0];
}

/** DB product_type → 다이어리 유형 */
export function productTypeToFeedingType(productType?: string | null): FeedingProductType {
  if (productType === 'snack') return 'snack';
  if (productType === 'supplement') return 'supplement';
  return 'food';
}

/** 시간대(선택) */
export const MEAL_PERIOD_OPTIONS: { value: MealPeriod; label: string }[] = [
  { value: 'morning', label: '아침' },
  { value: 'lunch', label: '점심' },
  { value: 'dinner', label: '저녁' },
  { value: 'snack', label: '간식' },
  { value: 'other', label: '기타' },
];

export function mealPeriodLabel(value: MealPeriod | null | undefined): string | null {
  if (!value) return null;
  return MEAL_PERIOD_OPTIONS.find((m) => m.value === value)?.label ?? null;
}

/** 급여 단위 프리셋 (+ 직접 입력) */
export const UNIT_OPTIONS = ['g', 'ml', '개', '스푼', '캡슐', '정', '포'] as const;

/** 기호도 1~5 */
export const PREFERENCE_OPTIONS: { value: number; label: string; emoji: string }[] = [
  { value: 1, label: '거부', emoji: '😾' },
  { value: 2, label: '별로', emoji: '🙁' },
  { value: 3, label: '보통', emoji: '😐' },
  { value: 4, label: '좋아함', emoji: '🙂' },
  { value: 5, label: '아주 좋아함', emoji: '😋' },
];

/** Date → 'YYYY-MM-DD' (로컬 타임존 기준) */
export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 'HH:MM' 현재 시각 */
export function nowTimeHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;
