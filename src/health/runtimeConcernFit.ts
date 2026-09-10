import type { Product, UserPetProfile } from '../types';
import {
  buildHealthConcernNeutralPolicyProjection,
  type HealthConcernNeutralPolicyProjection,
} from '../lib/healthConcernNeutralPolicy';
import type { HealthConcernEvaluationReport } from './concerns';
import { evaluateHealthConcernsDetailed } from './evaluator';

export type RuntimeConcernFitStatus = 'not_selected' | 'computed' | 'legacy_fallback';

export interface RuntimeConcernFitResult {
  policy: 'health_concern_missing_evidence_neutral_v1';
  variant: 'conservative_partial_quantitative';
  status: RuntimeConcernFitStatus;
  concernFit: number;
  evaluation: HealthConcernEvaluationReport;
  projection: HealthConcernNeutralPolicyProjection;
  fallback: {
    active: boolean;
    reason: 'unrecognized_profile_inputs' | 'evaluator_contract_mismatch' | null;
    rawSelectedConcernLabels: string[];
  };
}

function finiteConcernFit(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(20, value)) : 0;
}

export function projectRuntimeConcernFit(input: {
  rawSelectedConcernLabels: readonly string[];
  evaluation: HealthConcernEvaluationReport;
  legacyConcernFit: number;
}): RuntimeConcernFitResult {
  const rawSelectedConcernLabels = [...input.rawSelectedConcernLabels];
  const projection = buildHealthConcernNeutralPolicyProjection({
    rawSelectedConcernLabels,
    evaluation: input.evaluation,
    variant: 'conservative_partial_quantitative',
  });

  if (projection.concernFit != null && Number.isFinite(projection.concernFit)) {
    return {
      policy: 'health_concern_missing_evidence_neutral_v1',
      variant: 'conservative_partial_quantitative',
      status: projection.status === 'not_selected' ? 'not_selected' : 'computed',
      concernFit: finiteConcernFit(projection.concernFit),
      evaluation: input.evaluation,
      projection,
      fallback: { active: false, reason: null, rawSelectedConcernLabels },
    };
  }

  return {
    policy: 'health_concern_missing_evidence_neutral_v1',
    variant: 'conservative_partial_quantitative',
    status: 'legacy_fallback',
    concernFit: finiteConcernFit(input.legacyConcernFit),
    evaluation: input.evaluation,
    projection,
    fallback: {
      active: true,
      reason: projection.status === 'blocked_unrecognized'
        ? 'unrecognized_profile_inputs'
        : 'evaluator_contract_mismatch',
      rawSelectedConcernLabels,
    },
  };
}

export function evaluateRuntimeConcernFit(
  product: Product,
  profile: UserPetProfile,
  legacyConcernFit: number,
): RuntimeConcernFitResult {
  return projectRuntimeConcernFit({
    rawSelectedConcernLabels: profile.healthConcerns,
    evaluation: evaluateHealthConcernsDetailed(product, profile),
    legacyConcernFit,
  });
}
