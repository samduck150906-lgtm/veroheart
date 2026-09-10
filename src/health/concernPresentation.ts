import {
  HEALTH_CONCERN_DEFINITIONS,
  type HealthConcernEvaluationResult,
  type HealthConcernId,
} from './concerns';
import type { RuntimeConcernFitResult } from './runtimeConcernFit';

export type ConcernPresentationState =
  | 'insufficient_neutral'
  | 'limited_evidence'
  | 'supported_evidence'
  | 'contradiction_caution'
  | 'legacy_review';

export interface ConcernPresentationItem {
  concernId: HealthConcernId | null;
  label: string;
  state: ConcernPresentationState;
  title: string;
  summary: string;
  scoreEffect: string;
  confidence: HealthConcernEvaluationResult['confidence'] | 'unknown';
}

export interface HealthConcernPresentation {
  status: 'not_selected' | 'available' | 'legacy_review';
  items: ConcernPresentationItem[];
}

function evidenceFor(
  result: RuntimeConcernFitResult,
  concernId: HealthConcernId,
): HealthConcernEvaluationResult | undefined {
  return result.evaluation.results.find((item) => item.concernId === concernId);
}

function ingredientNames(evaluation: HealthConcernEvaluationResult | undefined): string {
  return evaluation?.matchedIngredientEvidence.slice(0, 3).join(', ') ?? '';
}

export function buildHealthConcernPresentation(
  runtime: RuntimeConcernFitResult,
): HealthConcernPresentation {
  if (runtime.status === 'not_selected') return { status: 'not_selected', items: [] };

  if (runtime.status === 'legacy_fallback') {
    const labels = runtime.fallback.rawSelectedConcernLabels.filter(Boolean);
    return {
      status: 'legacy_review',
      items: [{
        concernId: null,
        label: labels.join(', ') || '저장된 건강 고민',
        state: 'legacy_review',
        title: '건강 고민 정보를 확인해 주세요',
        summary: '저장된 건강 고민을 현재 표준화 규칙으로 평가하지 못해 기존 점수를 유지했어요. 프로필의 건강 고민 항목을 다시 확인해 주세요.',
        scoreEffect: '기존 점수 유지',
        confidence: 'unknown',
      }],
    };
  }

  const items = runtime.projection.results.map((projected): ConcernPresentationItem => {
    const label = HEALTH_CONCERN_DEFINITIONS[projected.concernId].label;
    const evaluation = evidenceFor(runtime, projected.concernId);
    const confidence = evaluation?.confidence ?? 'unknown';

    if (projected.disposition === 'neutral_missing_evidence' || projected.disposition === 'neutral_not_applicable') {
      return {
        concernId: projected.concernId,
        label,
        state: 'insufficient_neutral',
        title: `${label}: 판단할 정보가 부족해요`,
        summary: projected.disposition === 'neutral_not_applicable'
          ? '현재 프로필이나 제품 유형에는 등록된 비교 기준을 적용하기 어려워 중립적으로 반영했어요. 적합하거나 부적합하다는 뜻은 아니에요.'
          : '현재 등록된 제품 정보만으로 긍정 또는 부정 판단을 하기 어려워 중립적으로 반영했어요. 적합하다는 뜻은 아니에요.',
        scoreEffect: '정보 부족으로 중립 반영',
        confidence,
      };
    }

    if (projected.disposition === 'supported_quantitative') {
      return {
        concernId: projected.concernId,
        label,
        state: 'supported_evidence',
        title: `${label}: 관련 수치 근거가 확인됐어요`,
        summary: '등록된 제품 정보에 선택한 건강 고민과 관련된 비교 가능 수치 근거가 있어 반영했어요. 질환의 치료·예방이나 효과를 보장하지는 않아요.',
        scoreEffect: '확인된 근거 반영',
        confidence,
      };
    }

    if (projected.disposition === 'contradictory_quantitative') {
      return {
        concernId: projected.concernId,
        label,
        state: 'contradiction_caution',
        title: `${label}: 등록 수치와 기준이 맞지 않아요`,
        summary: '등록된 비교 가능 수치가 현재 검토 기준과 충돌해 이 건강 고민의 점수를 반영하지 않았어요. 급여 전 제품 정보와 전문가 안내를 함께 확인해 주세요.',
        scoreEffect: '충돌 근거로 0점 반영',
        confidence,
      };
    }

    const names = ingredientNames(evaluation);
    const detail = projected.disposition === 'neutral_tag_only'
      ? '관련 건강 태그가 등록되어 있지만 상세 수치나 추가 근거는 확인되지 않았어요.'
      : projected.disposition === 'neutral_ingredient_only'
        ? `관련 성분${names ? `(${names})` : ''}은 등록되어 있지만 함량과 적합 근거는 확인되지 않았어요.`
        : projected.disposition === 'limited_combined_evidence'
          ? `관련 건강 태그와 성분${names ? `(${names})` : ''}이 함께 등록되어 있지만 함량 근거는 확인되지 않았어요.`
          : '일부 비교 가능한 수치는 있지만 판단에 필요한 정보가 모두 등록되지는 않았어요.';
    return {
      concernId: projected.concernId,
      label,
      state: 'limited_evidence',
      title: `${label}: 제한적인 근거가 있어요`,
      summary: `${detail} 확인된 범위만 제한적으로 반영했으며 의학적 효능이나 적합성을 뜻하지 않아요.`,
      scoreEffect: projected.factor === 0.5 ? '제한 근거 50% 반영' : '제한 근거 25% 반영',
      confidence,
    };
  });

  return { status: 'available', items };
}
