/**
 * 영양성분 계산 — 순수 함수.
 *
 * 라벨 표기(as-fed)는 수분 차이 때문에 제품 간 단순 비교가 왜곡된다.
 * 내부 비교는 건물 기준(Dry Matter Basis)으로 환산한다.
 */
import type { GuaranteedAnalysis } from './types';

/**
 * 보장성분 값을 계산에 쓸 수 있는 유한한 퍼센트로 정리한다.
 *
 * DB·크롤링 데이터에는 문자열("28"), 단위가 붙은 문자열("28%"), null, 음수가 섞여
 * 들어온다. 그대로 산술에 넣으면 NaN 이 화면까지 새어 나가 "NaNkcal" 처럼 보인다.
 * 숫자로 해석되지 않으면 fallback 을 쓰고, 퍼센트는 0~100 으로 가둔다.
 */
export function toPercent(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(0, n));
}

/** 퍼센트 제약이 없는 값(칼슘·인 등)을 유한한 양수로 정리한다. */
function toPositiveNumber(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/** as-fed % → 건물 기준 % */
export function toDryMatter(asFedPercent: number, moisturePercent: number): number | null {
  const asFed = toPercent(asFedPercent);
  const moisture = toPercent(moisturePercent);
  if (moisture >= 100) return null;
  return (asFed / (100 - moisture)) * 100;
}

/**
 * Modified Atwater 칼로리 추정 (단백 3.5 / 지방 8.5 / 탄수 3.5 kcal/g).
 * NFE(추정 탄수화물) = 100 - 단백 - 지방 - 섬유 - 회분 - 수분
 */
export function calculateCalories(ga: GuaranteedAnalysis): {
  kcalPer100g: number;
  kcalPerKg: number;
  distribution: { protein: number; fat: number; carbs: number };
} {
  const protein = toPercent(ga.crudeProtein);
  const fat = toPercent(ga.crudeFat);
  const fiber = toPercent(ga.crudeFiber);
  const ash = toPercent(ga.crudeAsh);
  const moisture = toPercent(ga.moisture);

  const nfe = Math.max(0, 100 - protein - fat - fiber - ash - moisture);

  const proteinKcal = protein * 3.5;
  const fatKcal = fat * 8.5;
  const carbKcal = nfe * 3.5;
  const total = proteinKcal + fatKcal + carbKcal;

  if (total === 0) {
    return { kcalPer100g: 0, kcalPerKg: 0, distribution: { protein: 0, fat: 0, carbs: 0 } };
  }

  return {
    kcalPer100g: Math.round(total),
    kcalPerKg: Math.round(total * 10),
    distribution: {
      protein: Math.round((proteinKcal / total) * 100),
      fat: Math.round((fatKcal / total) * 100),
      carbs: Math.round((carbKcal / total) * 100),
    },
  };
}

/**
 * AAFCO 성체 유지(Adult Maintenance) 최소 기준 충족 여부 (건물 기준).
 * 완전사료(complete_food)에만 의미가 있다.
 */
export function validateAAFCO(
  ga: GuaranteedAnalysis,
  species: 'dog' | 'cat',
): { passed: boolean; details: string[] } {
  const details: string[] = [];
  let passed = true;

  const moisture = toPercent(ga.moisture, 10);
  const proteinDMB = toDryMatter(toPercent(ga.crudeProtein), moisture) ?? 0;
  const fatDMB = toDryMatter(toPercent(ga.crudeFat), moisture) ?? 0;

  const isCat = species === 'cat';
  const minProtein = isCat ? 26 : 18;
  const minFat = isCat ? 9 : 5.5;

  if (proteinDMB < minProtein) {
    passed = false;
    details.push(
      `AAFCO 조단백질 기준 미달: 기준 ${minProtein}% (건물 기준 ${proteinDMB.toFixed(1)}%)`,
    );
  }
  if (fatDMB < minFat) {
    passed = false;
    details.push(`AAFCO 조지방 기준 미달: 기준 ${minFat}% (건물 기준 ${fatDMB.toFixed(1)}%)`);
  }

  return { passed, details };
}

/** 칼슘:인 비율 점검 (권장 1:1 ~ 2:1) */
export function checkCalciumPhosphorusRatio(ga: GuaranteedAnalysis): string | null {
  const calcium = toPositiveNumber(ga.calcium);
  const phosphorus = toPositiveNumber(ga.phosphorus);
  if (calcium === null || phosphorus === null) return null;
  const ratio = calcium / phosphorus;
  if (ratio < 1.0 || ratio > 2.0) {
    // ratio 는 칼슘/인 이므로 "칼슘:인 = ratio:1" 로 적는다.
    // 예전에는 `1:${ratio}` 로 적어 칼슘 과다를 인 과다처럼 뒤집어 보여줬다.
    return `칼슘:인 비율이 권장 범위를 벗어나요 (현재 ${ratio.toFixed(2)}:1, 권장 1:1~2:1).`;
  }
  return null;
}
