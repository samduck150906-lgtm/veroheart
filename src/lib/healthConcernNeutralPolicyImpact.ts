import { resolveDisplayVerdict, type CompatibilityGrade } from '../utils/score';
import type {
  HealthConcernShadowMatrixRow,
  HealthConcernScoreShadowReport,
} from './healthConcernScoreShadowReport';
import {
  buildHealthConcernNeutralPolicyProjection,
  type HealthConcernNeutralPolicyProjection,
  type HealthConcernNeutralPolicyVariant,
} from './healthConcernNeutralPolicy';

export interface HealthConcernNeutralPolicyRankingImpact {
  cohortsCompared: number;
  cohortsNonComparable: number;
  cohortsWithOrderingChanges: number;
  productsWithChangedPosition: number;
}

export interface HealthConcernNeutralPolicyVariantImpact {
  variant: HealthConcernNeutralPolicyVariant;
  rows: number;
  computedRows: number;
  blockedRows: number;
  projectionStatusCounts: Record<HealthConcernNeutralPolicyProjection['status'], number>;
  concernFitDistribution: Record<string, number>;
  dispositionCounts: Record<string, number>;
  vsLegacy: {
    totalScoreDeltaDistribution: Record<string, number>;
    displayScoreDeltaDistribution: Record<string, number>;
    gradeChanges: number;
    ranking: HealthConcernNeutralPolicyRankingImpact;
  };
  vsExistingEvaluatorCandidate: {
    comparableRows: number;
    nonComparableRows: number;
    totalScoreDeltaDistribution: Record<string, number>;
    gradeChanges: number;
  };
}

export interface HealthConcernNeutralPolicyImpactReport {
  reportKind: 'health_concern_neutral_policy_shadow_impact';
  variants: Record<HealthConcernNeutralPolicyVariant, HealthConcernNeutralPolicyVariantImpact>;
  comparison: {
    rowsWithDifferentConcernFit: number;
    rowsWithDifferentTotalScore: number;
    rowsWithDifferentGrade: number;
    onlyAllowedDifference: 'partial_quantitative_treatment';
  };
  invariantViolations: Record<string, number>;
  safety: {
    localCopiedDataOnly: true;
    mutatesInput: false;
    changesRuntimeScore: false;
    changesRuntimeRanking: false;
    changesUiCopy: false;
    authorizesRuntimeActivation: false;
  };
}

interface ProjectedRow {
  matrixRow: HealthConcernShadowMatrixRow;
  projection: HealthConcernNeutralPolicyProjection;
  totalScore: number | null;
  displayScore: number | null;
  grade: CompatibilityGrade | null;
}

function bounded(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function increment(distribution: Record<string, number>, value: string | number): void {
  const key = String(value);
  distribution[key] = (distribution[key] ?? 0) + 1;
}

function sortedDistribution(distribution: Record<string, number>): Record<string, number> {
  return Object.fromEntries(Object.entries(distribution).sort(([a], [b]) => {
    const numeric = Number(a) - Number(b);
    return Number.isNaN(numeric) ? a.localeCompare(b) : numeric;
  }));
}

function projectRow(
  matrixRow: HealthConcernShadowMatrixRow,
  variant: HealthConcernNeutralPolicyVariant,
): ProjectedRow {
  const projection = buildHealthConcernNeutralPolicyProjection({
    rawSelectedConcernLabels: matrixRow.row.identity.rawSelectedConcernLabels,
    evaluation: {
      results: matrixRow.row.candidate.evaluatorResults,
      unrecognizedProfileInputs: matrixRow.row.identity.unrecognizedProfileInputs,
    },
    variant,
  });
  if (projection.concernFit == null) {
    return { matrixRow, projection, totalScore: null, displayScore: null, grade: null };
  }
  const unchanged = matrixRow.row.unchangedSafetySignals;
  const baseScore = bounded(Math.round(
    unchanged.ingredientSafety + unchanged.healthSuitability + projection.concernFit,
  ), 0, 100);
  const totalScore = unchanged.speciesMismatch
    ? 0
    : bounded(Math.round(
        baseScore
        - unchanged.allergyPenalty
        - unchanged.allergyCautionPenalty
        - unchanged.preferencePenalty,
      ), 0, 100);
  const verdict = resolveDisplayVerdict(totalScore, {
    speciesMismatch: unchanged.speciesMismatch,
    allergyHits: unchanged.allergyHits.length,
    dangerCount: unchanged.dangerCount,
  });
  return {
    matrixRow,
    projection,
    totalScore,
    displayScore: verdict.score,
    grade: verdict.grade,
  };
}

function stableOrder(rows: ProjectedRow[], score: (row: ProjectedRow) => number): ProjectedRow[] {
  return [...rows].sort((a, b) => {
    const scoreDelta = score(b) - score(a);
    if (scoreDelta !== 0) return scoreDelta;
    const idOrder = a.matrixRow.row.identity.productId.localeCompare(b.matrixRow.row.identity.productId);
    return idOrder || a.matrixRow.productKey.localeCompare(b.matrixRow.productKey);
  });
}

function rankingImpact(
  rows: ProjectedRow[],
  duplicateProductIds: Set<string>,
): HealthConcernNeutralPolicyRankingImpact {
  const cohortKeys = [...new Set(rows.map((row) => row.matrixRow.rankingCohortKey))].sort();
  const changedProducts = new Set<string>();
  let cohortsCompared = 0;
  let cohortsNonComparable = 0;
  let cohortsWithOrderingChanges = 0;
  for (const cohortKey of cohortKeys) {
    const eligible = rows.filter((row) =>
      row.matrixRow.rankingCohortKey === cohortKey
      && row.totalScore != null
      && !duplicateProductIds.has(row.matrixRow.row.identity.productId));
    if (eligible.length < 2) {
      cohortsNonComparable += 1;
      continue;
    }
    cohortsCompared += 1;
    const legacy = stableOrder(eligible, (row) => row.matrixRow.row.legacy.totalScore);
    const candidate = stableOrder(eligible, (row) => row.totalScore ?? Number.NEGATIVE_INFINITY);
    const legacyRanks = new Map(legacy.map((row, index) => [row.matrixRow.productKey, index]));
    const changed = candidate.filter((row, index) => legacyRanks.get(row.matrixRow.productKey) !== index);
    if (changed.length > 0) cohortsWithOrderingChanges += 1;
    changed.forEach((row) => changedProducts.add(row.matrixRow.productKey));
  }
  return {
    cohortsCompared,
    cohortsNonComparable,
    cohortsWithOrderingChanges,
    productsWithChangedPosition: changedProducts.size,
  };
}

function variantImpact(
  report: HealthConcernScoreShadowReport,
  variant: HealthConcernNeutralPolicyVariant,
): { impact: HealthConcernNeutralPolicyVariantImpact; rows: ProjectedRow[] } {
  const rows = report.matrix.map((matrixRow) => projectRow(matrixRow, variant));
  const projectionStatusCounts: HealthConcernNeutralPolicyVariantImpact['projectionStatusCounts'] = {
    not_selected: 0,
    computed: 0,
    blocked_unrecognized: 0,
    blocked_contract_mismatch: 0,
  };
  const concernFitDistribution: Record<string, number> = {};
  const dispositionCounts: Record<string, number> = {};
  const legacyTotalDeltas: Record<string, number> = {};
  const legacyDisplayDeltas: Record<string, number> = {};
  const existingCandidateDeltas: Record<string, number> = {};
  let gradeChanges = 0;
  let existingComparableRows = 0;
  let existingNonComparableRows = 0;
  let existingGradeChanges = 0;
  for (const row of rows) {
    projectionStatusCounts[row.projection.status] += 1;
    if (row.projection.concernFit != null) increment(concernFitDistribution, row.projection.concernFit);
    row.projection.results.forEach((result) => increment(dispositionCounts, result.disposition));
    if (row.totalScore != null && row.displayScore != null && row.grade != null) {
      increment(legacyTotalDeltas, row.totalScore - row.matrixRow.row.legacy.totalScore);
      increment(legacyDisplayDeltas, row.displayScore - row.matrixRow.row.legacy.displayScore);
      if (row.grade !== row.matrixRow.row.legacy.grade) gradeChanges += 1;
    }
    const existingTotal = row.matrixRow.row.candidate.totalScore;
    const existingGrade = row.matrixRow.row.candidate.grade;
    if (row.totalScore == null || row.grade == null || existingTotal == null || existingGrade == null) {
      existingNonComparableRows += 1;
    } else {
      existingComparableRows += 1;
      increment(existingCandidateDeltas, row.totalScore - existingTotal);
      if (row.grade !== existingGrade) existingGradeChanges += 1;
    }
  }
  return {
    rows,
    impact: {
      variant,
      rows: rows.length,
      computedRows: projectionStatusCounts.computed,
      blockedRows: projectionStatusCounts.blocked_unrecognized + projectionStatusCounts.blocked_contract_mismatch,
      projectionStatusCounts,
      concernFitDistribution: sortedDistribution(concernFitDistribution),
      dispositionCounts: sortedDistribution(dispositionCounts),
      vsLegacy: {
        totalScoreDeltaDistribution: sortedDistribution(legacyTotalDeltas),
        displayScoreDeltaDistribution: sortedDistribution(legacyDisplayDeltas),
        gradeChanges,
        ranking: rankingImpact(rows, new Set(report.summary.duplicateProductIds)),
      },
      vsExistingEvaluatorCandidate: {
        comparableRows: existingComparableRows,
        nonComparableRows: existingNonComparableRows,
        totalScoreDeltaDistribution: sortedDistribution(existingCandidateDeltas),
        gradeChanges: existingGradeChanges,
      },
    },
  };
}

export function buildHealthConcernNeutralPolicyImpactReport(
  report: HealthConcernScoreShadowReport,
): HealthConcernNeutralPolicyImpactReport {
  const snapshot = JSON.stringify(report);
  const conservative = variantImpact(report, 'conservative_partial_quantitative');
  const limited = variantImpact(report, 'limited_partial_quantitative_credit');
  let rowsWithDifferentConcernFit = 0;
  let rowsWithDifferentTotalScore = 0;
  let rowsWithDifferentGrade = 0;
  const invariantViolations: Record<string, number> = {};
  conservative.rows.forEach((row, index) => {
    const other = limited.rows[index];
    if (row.projection.concernFit !== other.projection.concernFit) {
      rowsWithDifferentConcernFit += 1;
      const evidence = row.matrixRow.row.candidate.evidenceLevels;
      if (!evidence.includes('partial_quantitative')) increment(invariantViolations, 'variant_difference_without_partial_quantitative');
    }
    if (row.totalScore !== other.totalScore) rowsWithDifferentTotalScore += 1;
    if (row.grade !== other.grade) rowsWithDifferentGrade += 1;
  });
  if (JSON.stringify(report) !== snapshot) increment(invariantViolations, 'shadow_report_mutated');
  return {
    reportKind: 'health_concern_neutral_policy_shadow_impact',
    variants: {
      conservative_partial_quantitative: conservative.impact,
      limited_partial_quantitative_credit: limited.impact,
    },
    comparison: {
      rowsWithDifferentConcernFit,
      rowsWithDifferentTotalScore,
      rowsWithDifferentGrade,
      onlyAllowedDifference: 'partial_quantitative_treatment',
    },
    invariantViolations,
    safety: {
      localCopiedDataOnly: true,
      mutatesInput: false,
      changesRuntimeScore: false,
      changesRuntimeRanking: false,
      changesUiCopy: false,
      authorizesRuntimeActivation: false,
    },
  };
}
