import type {
  HealthConcernEvaluationReport,
  HealthConcernEvaluationResult,
} from '../health/concerns';

export const HEALTH_CONCERN_NEUTRAL_POLICY_VARIANTS = [
  'conservative_partial_quantitative',
  'limited_partial_quantitative_credit',
] as const;

export type HealthConcernNeutralPolicyVariant =
  (typeof HEALTH_CONCERN_NEUTRAL_POLICY_VARIANTS)[number];

export type HealthConcernNeutralPolicyDisposition =
  | 'neutral_missing_evidence'
  | 'neutral_not_applicable'
  | 'neutral_tag_only'
  | 'neutral_ingredient_only'
  | 'limited_combined_evidence'
  | 'neutral_partial_quantitative'
  | 'limited_partial_quantitative'
  | 'supported_quantitative'
  | 'contradictory_quantitative';

export interface HealthConcernNeutralPolicyResult {
  concernId: HealthConcernEvaluationResult['concernId'];
  factor: 0 | 0.25 | 0.5 | 1;
  contribution: number;
  disposition: HealthConcernNeutralPolicyDisposition;
  userFacingSummary: string;
}

export interface HealthConcernNeutralPolicyProjection {
  policy: 'health_concern_missing_evidence_neutral_v1_candidate';
  variant: HealthConcernNeutralPolicyVariant;
  status: 'not_selected' | 'computed' | 'blocked_unrecognized' | 'blocked_contract_mismatch';
  concernFit: number | null;
  results: HealthConcernNeutralPolicyResult[];
  blockingReasons: string[];
  semantics: {
    missingEvidenceIsNegativeEvidence: false;
    neutralSelectedConcernFit: 5;
    noSelectionFit: 20;
    authorizesRuntimeActivation: false;
  };
}

interface PolicyClassification {
  factor: HealthConcernNeutralPolicyResult['factor'];
  disposition: HealthConcernNeutralPolicyDisposition;
  userFacingSummary: string;
}

function activeChecks(result: HealthConcernEvaluationResult) {
  return result.quantitativeChecks.filter((check) => check.judgment === 'active');
}

function classifyResult(
  result: HealthConcernEvaluationResult,
  variant: HealthConcernNeutralPolicyVariant,
): PolicyClassification | null {
  const active = activeChecks(result);
  if (
    result.status === 'supported'
    && result.evidenceLevel === 'validated_quantitative'
    && result.confidence === 'sufficient'
    && active.some((check) => check.status === 'pass')
    && active.every((check) => check.status === 'pass')
  ) {
    return {
      factor: 1,
      disposition: 'supported_quantitative',
      userFacingSummary: '공개된 비교 가능 수치가 검토 기준을 충족해요. 질환의 치료·예방 효과를 뜻하지는 않아요.',
    };
  }
  if (
    result.status === 'not_supported'
    && result.evidenceLevel === 'contradictory'
    && result.confidence === 'sufficient'
    && active.some((check) => check.status === 'fail')
  ) {
    return {
      factor: 0,
      disposition: 'contradictory_quantitative',
      userFacingSummary: '공개된 비교 가능 수치가 검토 기준을 벗어나 있어 급여 전 확인이 필요해요.',
    };
  }
  if (
    result.status === 'possible'
    && result.evidenceLevel === 'partial_quantitative'
    && result.confidence === 'partial'
    && active.some((check) => check.status === 'pass')
  ) {
    const limitedCredit = variant === 'limited_partial_quantitative_credit';
    return {
      factor: limitedCredit ? 0.5 : 0.25,
      disposition: limitedCredit ? 'limited_partial_quantitative' : 'neutral_partial_quantitative',
      userFacingSummary: '일부 수치는 비교할 수 있지만 필요한 정보가 모두 공개되지는 않았어요.',
    };
  }
  if (
    result.status === 'possible'
    && result.evidenceLevel === 'tag_and_ingredient_quantity_unknown'
    && result.confidence === 'partial'
    && result.matchedProductTags.length > 0
    && result.matchedIngredientEvidence.length > 0
  ) {
    return {
      factor: 0.5,
      disposition: 'limited_combined_evidence',
      userFacingSummary: '관련 태그와 성분은 확인되지만 함량이 없어 제한적으로만 반영해요.',
    };
  }
  if (
    result.status === 'tag_only'
    && result.evidenceLevel === 'tag_only'
    && result.confidence === 'partial'
    && result.matchedProductTags.length > 0
  ) {
    return {
      factor: 0.25,
      disposition: 'neutral_tag_only',
      userFacingSummary: '관련 건강 태그는 있지만 이를 뒷받침할 상세 근거가 부족해 중립으로 반영해요.',
    };
  }
  if (
    result.status === 'possible'
    && result.evidenceLevel === 'ingredient_only_quantity_unknown'
    && result.confidence === 'partial'
    && result.matchedIngredientEvidence.length > 0
  ) {
    return {
      factor: 0.25,
      disposition: 'neutral_ingredient_only',
      userFacingSummary: '관련 성분은 표시되어 있지만 함량과 적합 근거가 부족해 중립으로 반영해요.',
    };
  }
  if (
    result.status === 'unknown'
    && result.evidenceLevel === 'missing'
    && result.confidence === 'insufficient'
  ) {
    return {
      factor: 0.25,
      disposition: 'neutral_missing_evidence',
      userFacingSummary: '현재 공개된 정보만으로 이 건강 고민에 대한 적합 여부를 판단하기 어려워요.',
    };
  }
  if (
    result.status === 'not_applicable'
    && result.evidenceLevel === 'not_applicable'
    && result.confidence === 'insufficient'
  ) {
    return {
      factor: 0.25,
      disposition: 'neutral_not_applicable',
      userFacingSummary: '현재 프로필이나 제품 유형에는 이 비교 기준을 적용하기 어려워 중립으로 반영해요.',
    };
  }
  return null;
}

function allocateContributions(factors: Array<PolicyClassification['factor']>): number[] {
  if (factors.length === 0) return [];
  const rawCents = factors.map((factor) => (2000 * factor) / factors.length);
  const cents = rawCents.map(Math.floor);
  let remainder = Math.round(rawCents.reduce((sum, value) => sum + value, 0))
    - cents.reduce((sum, value) => sum + value, 0);
  const order = rawCents
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (const { index } of order) {
    if (remainder <= 0) break;
    cents[index] += 1;
    remainder -= 1;
  }
  return cents.map((value) => value / 100);
}

/**
 * Pure, score-neutral-policy sidecar. Runtime score and UI modules must not import this module.
 */
export function buildHealthConcernNeutralPolicyProjection(input: {
  rawSelectedConcernLabels: readonly string[];
  evaluation: HealthConcernEvaluationReport;
  variant: HealthConcernNeutralPolicyVariant;
}): HealthConcernNeutralPolicyProjection {
  const selected = [...input.rawSelectedConcernLabels];
  const base = {
    policy: 'health_concern_missing_evidence_neutral_v1_candidate' as const,
    variant: input.variant,
    semantics: {
      missingEvidenceIsNegativeEvidence: false as const,
      neutralSelectedConcernFit: 5 as const,
      noSelectionFit: 20 as const,
      authorizesRuntimeActivation: false as const,
    },
  };
  if (selected.length === 0) {
    return { ...base, status: 'not_selected', concernFit: 20, results: [], blockingReasons: [] };
  }
  if (input.evaluation.unrecognizedProfileInputs.length > 0) {
    return {
      ...base,
      status: 'blocked_unrecognized',
      concernFit: null,
      results: [],
      blockingReasons: ['unrecognized_profile_inputs'],
    };
  }
  if (input.evaluation.results.length === 0) {
    return {
      ...base,
      status: 'blocked_contract_mismatch',
      concernFit: null,
      results: [],
      blockingReasons: ['selected_input_without_evaluator_result'],
    };
  }
  const classified = input.evaluation.results.map((result) => classifyResult(result, input.variant));
  const invalidIndexes = classified.flatMap((value, index) => value == null ? [index] : []);
  if (invalidIndexes.length > 0) {
    return {
      ...base,
      status: 'blocked_contract_mismatch',
      concernFit: null,
      results: [],
      blockingReasons: invalidIndexes.map((index) => `unsupported_evaluator_result:${index}`),
    };
  }
  const valid = classified as PolicyClassification[];
  const contributions = allocateContributions(valid.map((value) => value.factor));
  const results = valid.map((value, index): HealthConcernNeutralPolicyResult => ({
    concernId: input.evaluation.results[index].concernId,
    factor: value.factor,
    contribution: contributions[index],
    disposition: value.disposition,
    userFacingSummary: value.userFacingSummary,
  }));
  return {
    ...base,
    status: 'computed',
    concernFit: Math.round(results.reduce((sum, result) => sum + result.contribution, 0) * 100) / 100,
    results,
    blockingReasons: [],
  };
}
