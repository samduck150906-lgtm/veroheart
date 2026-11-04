import type { GuaranteedAnalysis } from './types';

export const NUTRITION_INSUFFICIENT_NOTICE = '영양정보 부족으로 영양 균형을 평가할 수 없습니다.';

export function isObservedPercent(value: unknown): boolean {
  return (typeof value === 'number' || (typeof value === 'string' && value.trim() !== ''))
    && Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 100;
}

/** The existing calculator's input gates, shared with presentation; zero is observed. */
export function getNutritionReadiness(ga: GuaranteedAnalysis | undefined) {
  const proximate = [ga?.crudeProtein, ga?.crudeFat, ga?.crudeFiber, ga?.crudeAsh, ga?.moisture];
  const canEstimateEnergy = proximate.every(isObservedPercent)
    && proximate.reduce<number>((sum, value) => sum + Number(value), 0) <= 100;
  const proteinFat = [ga?.crudeProtein, ga?.crudeFat, ga?.moisture];
  const canEvaluateProteinFat = proteinFat.every(isObservedPercent)
    && Number(ga?.moisture) < 100
    && proteinFat.reduce<number>((sum, value) => sum + Number(value), 0) <= 100;
  return { canEstimateEnergy, canEvaluateProteinFat };
}

export function getNutritionPresentation(ga: GuaranteedAnalysis | undefined) {
  const readiness = getNutritionReadiness(ga);
  const limited = !readiness.canEstimateEnergy || !readiness.canEvaluateProteinFat;
  const scopeLabel = limited
    ? readiness.canEvaluateProteinFat ? '일부 영양 포함 참고' : '원료 기준 참고'
    : '원료·기초 영양 참고';
  return {
    ...readiness,
    limited,
    scopeLabel,
    notice: limited ? NUTRITION_INSUFFICIENT_NOTICE : '',
    detail: limited && readiness.canEvaluateProteinFat
      ? '단백질·지방의 건물기준 평가는 가능하지만 전체 영양 구성은 평가하지 않았습니다.'
      : limited ? '원료 정보 중심의 점수이며 종합 안전·영양 적합성 등급이 아닙니다.'
        : '등록 원료와 기초 영양 지표의 참고 평가이며 완전한 영양 적합성을 보장하지 않습니다.',
  };
}
