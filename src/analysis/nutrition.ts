/**
 * 영양성분 계산 — 순수 함수.
 *
 * 라벨 표기(as-fed)는 수분 차이 때문에 제품 간 단순 비교가 왜곡된다.
 * 내부 비교는 건물 기준(Dry Matter Basis)으로 환산한다.
 */
import type { GuaranteedAnalysis } from './types';

/** as-fed % → 건물 기준 % */
export function toDryMatter(asFedPercent: number, moisturePercent: number): number | null {
  if (moisturePercent >= 100) return null;
  return (asFedPercent / (100 - moisturePercent)) * 100;
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
  const protein = ga.crudeProtein ?? 0;
  const fat = ga.crudeFat ?? 0;
  const fiber = ga.crudeFiber ?? 0;
  const ash = ga.crudeAsh ?? 0;
  const moisture = ga.moisture ?? 0;

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

  const moisture = ga.moisture ?? 10;
  const proteinDMB = toDryMatter(ga.crudeProtein ?? 0, moisture) ?? 0;
  const fatDMB = toDryMatter(ga.crudeFat ?? 0, moisture) ?? 0;

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
  if (!ga.calcium || !ga.phosphorus) return null;
  const ratio = ga.calcium / ga.phosphorus;
  if (ratio < 1.0 || ratio > 2.0) {
    return `칼슘:인 비율이 권장 범위를 벗어나요 (현재 1:${ratio.toFixed(2)}, 권장 1:1~2:1).`;
  }
  return null;
}
