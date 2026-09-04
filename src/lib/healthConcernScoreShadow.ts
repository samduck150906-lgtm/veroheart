import type { Product, UserPetProfile } from '../types';
import { evaluateHealthConcernsDetailed } from '../health/evaluator';
import type {
  ConcernEvidenceLevel,
  ConcernStatus,
  DataConfidence,
  HealthConcernEvaluationResult,
  HealthConcernId,
} from '../health/concerns';
import {
  calculateCompatibilityScore,
  getRecommendationBreakdown,
  resolveDisplayVerdict,
  type CompatibilityGrade,
  type DisplayVerdict,
  type RecommendationBreakdown,
} from '../utils/score';

export interface LegacyHealthConcernShadowBaseline {
  breakdown: RecommendationBreakdown;
  compatibilityScore: number;
  displayVerdict: DisplayVerdict;
}

function productForShadowBaseline(product: Product): Product {
  return product.ingredients == null ? { ...product, ingredients: [] } : product;
}

export type HealthConcernCandidateStatus = 'not_selected' | 'computed' | 'blocked_unrecognized';

export interface HealthConcernScoreShadowRow {
  reportKind: 'health_concern_score_shadow_row';
  visibility: 'non_visible_internal_report';
  runtimeMutationAllowed: false;
  identity: {
    productId: string;
    productName: string;
    profileId: string | null;
    profileSpecies: UserPetProfile['species'];
    rawSelectedConcernLabels: string[];
    recognizedConcernIds: HealthConcernId[];
    unrecognizedProfileInputs: string[];
  };
  legacy: {
    concernFit: number;
    baseScore: number;
    totalScore: number;
    displayScore: number;
    grade: CompatibilityGrade;
    matchedConcerns: string[];
  };
  candidate: {
    status: HealthConcernCandidateStatus;
    evaluatorResults: HealthConcernEvaluationResult[];
    concernStatuses: ConcernStatus[];
    evidenceLevels: ConcernEvidenceLevel[];
    confidenceLevels: DataConfidence[];
    scoringContributions: number[];
    concernFit: number | null;
    baseScore: number | null;
    totalScore: number | null;
    displayScore: number | null;
    grade: CompatibilityGrade | null;
  };
  differences: {
    concernFitDelta: number | null;
    totalScoreDelta: number | null;
    displayScoreDelta: number | null;
    gradeChanged: boolean | null;
    rankingImpactEligible: boolean;
    blockedOrIncompleteReasons: string[];
  };
  unchangedSafetySignals: {
    speciesMismatch: boolean;
    allergyHits: string[];
    allergyPenalty: number;
    allergyCautions: RecommendationBreakdown['allergyCautions'];
    allergyCautionPenalty: number;
    poultryCautionPenalty: number;
    preferencePenalty: number;
    preferenceLevel: number | null;
    ingredientSafety: number;
    healthSuitability: number;
    dangerCount: number;
    cautionCount: number;
    visibleReasons: string[];
  };
  invariantViolations: string[];
}

function bounded(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Read-only baseline capture for sidecar comparison. Runtime modules must never import this module. */
export function captureLegacyHealthConcernShadowBaseline(
  product: Product,
  profile: UserPetProfile,
): LegacyHealthConcernShadowBaseline {
  const shadowProduct = productForShadowBaseline(product);
  const breakdown = getRecommendationBreakdown(shadowProduct, profile);
  return {
    breakdown,
    compatibilityScore: calculateCompatibilityScore(shadowProduct, profile),
    displayVerdict: resolveDisplayVerdict(breakdown.total, {
      speciesMismatch: breakdown.speciesMismatch,
      allergyHits: breakdown.allergyHits.length,
      dangerCount: breakdown.dangerCount,
    }),
  };
}

export function buildHealthConcernScoreShadowRow(
  product: Product,
  profile: UserPetProfile,
): HealthConcernScoreShadowRow {
  const shadowProduct = productForShadowBaseline(product);
  const baseline = captureLegacyHealthConcernShadowBaseline(product, profile);
  const evaluation = evaluateHealthConcernsDetailed(shadowProduct, profile);
  const selectedLabels = [...profile.healthConcerns];
  const recognizedConcernIds = evaluation.results.map((result) => result.concernId);
  const candidateStatus: HealthConcernCandidateStatus =
    selectedLabels.length === 0
      ? 'not_selected'
      : evaluation.unrecognizedProfileInputs.length > 0
        ? 'blocked_unrecognized'
        : 'computed';
  const blocked = candidateStatus === 'blocked_unrecognized';
  const candidateConcernFit = blocked
    ? null
    : candidateStatus === 'not_selected'
      ? 20
      : bounded(
          evaluation.results.reduce((sum, result) => sum + result.scoringContribution, 0),
          0,
          20,
        );
  const candidateBaseScore = candidateConcernFit == null
    ? null
    : bounded(Math.round(
        baseline.breakdown.ingredientSafety
        + baseline.breakdown.healthSuitability
        + candidateConcernFit,
      ), 0, 100);
  const candidateTotalScore = candidateBaseScore == null
    ? null
    : baseline.breakdown.speciesMismatch
      ? 0
      : bounded(Math.round(
          candidateBaseScore
          - baseline.breakdown.allergyPenalty
          - baseline.breakdown.allergyCautionPenalty
          - baseline.breakdown.preferencePenalty,
        ), 0, 100);
  const candidateVerdict = candidateTotalScore == null
    ? null
    : resolveDisplayVerdict(candidateTotalScore, {
        speciesMismatch: baseline.breakdown.speciesMismatch,
        allergyHits: baseline.breakdown.allergyHits.length,
        dangerCount: baseline.breakdown.dangerCount,
      });
  const blockedOrIncompleteReasons: string[] = [];
  if (candidateStatus === 'not_selected') {
    blockedOrIncompleteReasons.push('neutral_no_concern_selection_not_health_suitability_evidence');
  }
  if (blocked) blockedOrIncompleteReasons.push('unrecognized_profile_inputs');
  if (product.ingredients == null) blockedOrIncompleteReasons.push('missing_ingredient_array_normalized_to_empty_for_shadow');
  if (evaluation.results.some((result) => result.confidence === 'insufficient')) {
    blockedOrIncompleteReasons.push('insufficient_evidence');
  }
  const invariantViolations: string[] = [];
  if (candidateConcernFit != null && (candidateConcernFit < 0 || candidateConcernFit > 20)) {
    invariantViolations.push('candidate_concern_fit_out_of_bounds');
  }
  if (candidateTotalScore != null && (candidateTotalScore < 0 || candidateTotalScore > 100)) {
    invariantViolations.push('candidate_total_score_out_of_bounds');
  }
  if (blocked && (candidateConcernFit != null || candidateBaseScore != null || candidateTotalScore != null || candidateVerdict != null)) {
    invariantViolations.push('unrecognized_input_received_candidate_score');
  }
  if (evaluation.results.some((result) =>
    result.scoringContribution > 0
    && result.matchedProductTags.length === 0
    && result.matchedIngredientEvidence.length === 0
    && result.quantitativeChecks.length > 0
    && result.quantitativeChecks.every((check) => check.judgment === 'informational'))) {
    invariantViolations.push('informational_threshold_contributed_points');
  }

  return {
    reportKind: 'health_concern_score_shadow_row',
    visibility: 'non_visible_internal_report',
    runtimeMutationAllowed: false,
    identity: {
      productId: product.id,
      productName: product.name,
      profileId: profile.id ?? null,
      profileSpecies: profile.species,
      rawSelectedConcernLabels: selectedLabels,
      recognizedConcernIds,
      unrecognizedProfileInputs: [...evaluation.unrecognizedProfileInputs],
    },
    legacy: {
      concernFit: baseline.breakdown.concernFit,
      baseScore: baseline.breakdown.baseScore,
      totalScore: baseline.breakdown.total,
      displayScore: baseline.displayVerdict.score,
      grade: baseline.displayVerdict.grade,
      matchedConcerns: [...baseline.breakdown.matchedConcerns],
    },
    candidate: {
      status: candidateStatus,
      evaluatorResults: evaluation.results,
      concernStatuses: evaluation.results.map((result) => result.status),
      evidenceLevels: evaluation.results.map((result) => result.evidenceLevel),
      confidenceLevels: evaluation.results.map((result) => result.confidence),
      scoringContributions: evaluation.results.map((result) => result.scoringContribution),
      concernFit: candidateConcernFit,
      baseScore: candidateBaseScore,
      totalScore: candidateTotalScore,
      displayScore: candidateVerdict?.score ?? null,
      grade: candidateVerdict?.grade ?? null,
    },
    differences: {
      concernFitDelta: candidateConcernFit == null ? null : candidateConcernFit - baseline.breakdown.concernFit,
      totalScoreDelta: candidateTotalScore == null ? null : candidateTotalScore - baseline.breakdown.total,
      displayScoreDelta: candidateVerdict == null ? null : candidateVerdict.score - baseline.displayVerdict.score,
      gradeChanged: candidateVerdict == null ? null : candidateVerdict.grade !== baseline.displayVerdict.grade,
      rankingImpactEligible: !blocked,
      blockedOrIncompleteReasons,
    },
    unchangedSafetySignals: {
      speciesMismatch: baseline.breakdown.speciesMismatch,
      allergyHits: [...baseline.breakdown.allergyHits],
      allergyPenalty: baseline.breakdown.allergyPenalty,
      allergyCautions: baseline.breakdown.allergyCautions.map((match) => ({ ...match })),
      allergyCautionPenalty: baseline.breakdown.allergyCautionPenalty,
      poultryCautionPenalty: baseline.breakdown.allergyCautionPenalty,
      preferencePenalty: baseline.breakdown.preferencePenalty,
      preferenceLevel: baseline.breakdown.preferenceLevel,
      ingredientSafety: baseline.breakdown.ingredientSafety,
      healthSuitability: baseline.breakdown.healthSuitability,
      dangerCount: baseline.breakdown.dangerCount,
      cautionCount: baseline.breakdown.cautionCount,
      visibleReasons: [...baseline.breakdown.reasons],
    },
    invariantViolations,
  };
}
