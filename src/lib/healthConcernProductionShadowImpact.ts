import type { DataConfidence } from '../health/concerns';
import type { Product } from '../types';
import type {
  HealthConcernScoreShadowReport,
  HealthConcernShadowMatrixRow,
} from './healthConcernScoreShadowReport';

export type HealthConcernProductionShadowConfidence = DataConfidence;
export type HealthConcernProductionShadowRankingThreshold = 'partial_or_better' | 'sufficient_only';

export interface HealthConcernProductionShadowConfidenceImpact {
  rows: number;
  gradeChanges: number;
  gradeUnchanged: number;
  gradeNotComparable: number;
  comparableScoreDeltas: number;
  nonComparableScoreDeltas: number;
  scoreDeltaDistribution: Record<string, number>;
}

export interface HealthConcernProductionShadowRankingImpact {
  threshold: 'all_computed' | HealthConcernProductionShadowRankingThreshold;
  eligibleRows: number;
  comparableCohorts: number;
  nonComparableCohorts: number;
  cohortsWithOrderingChanges: number;
  productsWithOrderingChanges: number;
}

export interface HealthConcernProductionShadowImpactSummary {
  confidenceRule: {
    rowConfidence: 'weakest_selected_concern_result';
    evidenceQualifiedThreshold: 'partial_or_better';
    decisionGradeThreshold: 'sufficient_only';
    minimumEligibleProductsPerRankingCohort: 2;
  };
  byConfidence: Record<HealthConcernProductionShadowConfidence, HealthConcernProductionShadowConfidenceImpact>;
  rawExploratory: {
    gradeChanges: number;
    scoreDeltaDistribution: Record<string, number>;
    ranking: HealthConcernProductionShadowRankingImpact;
  };
  evidenceQualified: {
    threshold: 'partial_or_better';
    gradeChanges: number;
    scoreDeltaDistribution: Record<string, number>;
    ranking: HealthConcernProductionShadowRankingImpact;
  };
  decisionGrade: {
    threshold: 'sufficient_only';
    gradeChanges: number;
    scoreDeltaDistribution: Record<string, number>;
    ranking: HealthConcernProductionShadowRankingImpact;
    rankingComparisonPossible: boolean;
  };
  decisionReadiness: {
    result: 'not_decision_ready' | 'decision_grade_comparison_available';
    reasons: string[];
    authorizesRuntimeActivation: false;
  };
}

export interface HealthConcernProductionShadowAnatomicalCollisionDiagnostic {
  category: 'heart_concern_vs_anatomical_source_part_name';
  affectedShadowRows: number;
  anatomicalIngredientMatches: number;
  healthPurposeOrTagEvidenceExcluded: number;
  changesRuntimeLegacyMatcher: false;
  requiresSeparateRuntimeCorrection: true;
}

const CONFIDENCE_ORDER: Record<DataConfidence, number> = {
  insufficient: 0,
  partial: 1,
  sufficient: 2,
};

const KOREAN_ANIMAL_HEART = /(?:닭고기|닭|토끼|소고기|소|돼지고기|돼지|양고기|양|오리고기|오리|칠면조|사슴|염소|말|캥거루)\s*(?:의\s*)?심장/;
const ENGLISH_ANIMAL_HEART = /\b(?:chicken|rabbit|beef|bovine|cow|pork|pig|lamb|sheep|duck|turkey|venison|deer|goat|horse|kangaroo)\s+hearts?\b/i;

function normalizeLegacyTerm(value: string): string {
  return value
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[\s()[\]·,./_-]/g, '');
}

function includesLegacyTerm(value: string | undefined, terms: string[]): boolean {
  const normalizedValue = normalizeLegacyTerm(value ?? '');
  return terms.some((term) => normalizedValue.includes(term));
}

function isAnimalHeartName(product: Product['ingredients'][number]): boolean {
  return KOREAN_ANIMAL_HEART.test(product.nameKo.normalize('NFKC'))
    || ENGLISH_ANIMAL_HEART.test((product.nameEn ?? '').normalize('NFKC'));
}

export function diagnoseHealthConcernProductionShadowAnatomicalCollisions(
  products: Product[],
  report: HealthConcernScoreShadowReport,
): HealthConcernProductionShadowAnatomicalCollisionDiagnostic {
  const snapshot = JSON.stringify(products);
  const productsById = new Map<string, Product>();
  const duplicateIds = new Set<string>();
  for (const product of products) {
    if (productsById.has(product.id)) duplicateIds.add(product.id);
    else productsById.set(product.id, product);
  }
  let affectedShadowRows = 0;
  let anatomicalIngredientMatches = 0;
  let healthPurposeOrTagEvidenceExcluded = 0;

  for (const matrixRow of report.matrix) {
    if (!matrixRow.row.identity.recognizedConcernIds.includes('heart')) continue;
    const productId = matrixRow.row.identity.productId;
    if (duplicateIds.has(productId)) continue;
    const product = productsById.get(productId);
    if (product == null) continue;
    const selectedHeartTerms = matrixRow.row.identity.rawSelectedConcernLabels
      .map(normalizeLegacyTerm)
      .filter((term) => term === normalizeLegacyTerm('심장') || term === 'heart' || term === 'cardiac');
    if (selectedHeartTerms.length === 0) continue;
    const legacyMatched = matrixRow.row.legacy.matchedConcerns.some((concern) =>
      selectedHeartTerms.includes(normalizeLegacyTerm(concern)));
    if (!legacyMatched) continue;
    const hasPurposeOrTagEvidence = (product.healthConcerns ?? []).some((tag) =>
      includesLegacyTerm(tag, selectedHeartTerms))
      || (product.ingredients ?? []).some((ingredient) => includesLegacyTerm(ingredient.purpose, selectedHeartTerms));
    const anatomicalMatches = (product.ingredients ?? []).filter(isAnimalHeartName).length;
    if (anatomicalMatches === 0) continue;
    if (hasPurposeOrTagEvidence) {
      healthPurposeOrTagEvidenceExcluded += 1;
      continue;
    }
    affectedShadowRows += 1;
    anatomicalIngredientMatches += anatomicalMatches;
  }

  if (JSON.stringify(products) !== snapshot) {
    throw new Error('Health-concern anatomical collision diagnostic mutated its product input.');
  }
  return {
    category: 'heart_concern_vs_anatomical_source_part_name',
    affectedShadowRows,
    anatomicalIngredientMatches,
    healthPurposeOrTagEvidenceExcluded,
    changesRuntimeLegacyMatcher: false,
    requiresSeparateRuntimeCorrection: true,
  };
}

function rowConfidence(matrixRow: HealthConcernShadowMatrixRow): DataConfidence | null {
  const levels = matrixRow.row.candidate.confidenceLevels;
  if (matrixRow.row.candidate.status !== 'computed' || levels.length === 0) return null;
  return [...levels].sort((a, b) => CONFIDENCE_ORDER[a] - CONFIDENCE_ORDER[b])[0];
}

function increment(distribution: Record<string, number>, value: number): void {
  const key = String(value);
  distribution[key] = (distribution[key] ?? 0) + 1;
}

function emptyConfidenceImpact(): HealthConcernProductionShadowConfidenceImpact {
  return {
    rows: 0,
    gradeChanges: 0,
    gradeUnchanged: 0,
    gradeNotComparable: 0,
    comparableScoreDeltas: 0,
    nonComparableScoreDeltas: 0,
    scoreDeltaDistribution: {},
  };
}

function stableOrder(
  rows: HealthConcernShadowMatrixRow[],
  score: (row: HealthConcernShadowMatrixRow) => number,
): HealthConcernShadowMatrixRow[] {
  return [...rows].sort((a, b) => {
    const scoreDelta = score(b) - score(a);
    if (scoreDelta !== 0) return scoreDelta;
    const productIdOrder = a.row.identity.productId.localeCompare(b.row.identity.productId);
    return productIdOrder || a.productKey.localeCompare(b.productKey);
  });
}

function rankingImpact(
  matrix: HealthConcernShadowMatrixRow[],
  duplicateProductIds: Set<string>,
  threshold: HealthConcernProductionShadowRankingImpact['threshold'],
): HealthConcernProductionShadowRankingImpact {
  const cohortKeys = [...new Set(matrix.map((row) => row.rankingCohortKey))].sort();
  const changedProducts = new Set<string>();
  let eligibleRows = 0;
  let comparableCohorts = 0;
  let nonComparableCohorts = 0;
  let cohortsWithOrderingChanges = 0;

  for (const cohortKey of cohortKeys) {
    const rows = matrix.filter((row) => row.rankingCohortKey === cohortKey);
    const eligible = rows.filter((row) => {
      const confidence = rowConfidence(row);
      if (
        !row.row.differences.rankingImpactEligible
        || row.row.candidate.totalScore == null
        || duplicateProductIds.has(row.row.identity.productId)
        || confidence == null
      ) return false;
      if (threshold === 'all_computed') return true;
      if (threshold === 'partial_or_better') return CONFIDENCE_ORDER[confidence] >= CONFIDENCE_ORDER.partial;
      return confidence === 'sufficient';
    });
    eligibleRows += eligible.length;
    if (eligible.length < 2) {
      nonComparableCohorts += 1;
      continue;
    }
    comparableCohorts += 1;
    const legacy = stableOrder(eligible, (row) => row.row.legacy.totalScore);
    const candidate = stableOrder(eligible, (row) => row.row.candidate.totalScore ?? Number.NEGATIVE_INFINITY);
    const legacyRanks = new Map(legacy.map((row, index) => [row.productKey, index]));
    const changed = candidate.filter((row, index) => legacyRanks.get(row.productKey) !== index);
    if (changed.length > 0) cohortsWithOrderingChanges += 1;
    changed.forEach((row) => changedProducts.add(row.productKey));
  }

  return {
    threshold,
    eligibleRows,
    comparableCohorts,
    nonComparableCohorts,
    cohortsWithOrderingChanges,
    productsWithOrderingChanges: changedProducts.size,
  };
}

function combinedDistribution(
  groups: HealthConcernProductionShadowConfidenceImpact[],
): Record<string, number> {
  const combined: Record<string, number> = {};
  for (const group of groups) {
    for (const [delta, count] of Object.entries(group.scoreDeltaDistribution)) {
      combined[delta] = (combined[delta] ?? 0) + count;
    }
  }
  return Object.fromEntries(Object.entries(combined).sort(([a], [b]) => Number(a) - Number(b)));
}

export function summarizeHealthConcernProductionShadowImpact(
  report: HealthConcernScoreShadowReport,
): HealthConcernProductionShadowImpactSummary {
  const byConfidence: HealthConcernProductionShadowImpactSummary['byConfidence'] = {
    insufficient: emptyConfidenceImpact(),
    partial: emptyConfidenceImpact(),
    sufficient: emptyConfidenceImpact(),
  };
  for (const matrixRow of report.matrix) {
    const confidence = rowConfidence(matrixRow);
    if (confidence == null) continue;
    const group = byConfidence[confidence];
    group.rows += 1;
    if (matrixRow.row.differences.gradeChanged === true) group.gradeChanges += 1;
    else if (matrixRow.row.differences.gradeChanged === false) group.gradeUnchanged += 1;
    else group.gradeNotComparable += 1;
    const delta = matrixRow.row.differences.totalScoreDelta;
    if (delta == null) group.nonComparableScoreDeltas += 1;
    else {
      group.comparableScoreDeltas += 1;
      increment(group.scoreDeltaDistribution, delta);
    }
  }
  for (const group of Object.values(byConfidence)) {
    group.scoreDeltaDistribution = Object.fromEntries(
      Object.entries(group.scoreDeltaDistribution).sort(([a], [b]) => Number(a) - Number(b)),
    );
  }

  const duplicateProductIds = new Set(report.summary.duplicateProductIds);
  const rawRanking = rankingImpact(report.matrix, duplicateProductIds, 'all_computed');
  const evidenceQualifiedRanking = rankingImpact(report.matrix, duplicateProductIds, 'partial_or_better');
  const decisionGradeRanking = rankingImpact(report.matrix, duplicateProductIds, 'sufficient_only');
  const evidenceQualifiedGroups = [byConfidence.partial, byConfidence.sufficient];
  const sufficientRankingComparisonPossible = decisionGradeRanking.comparableCohorts > 0;
  const reasons: string[] = [];
  if (byConfidence.sufficient.rows === 0) reasons.push('no_sufficient_confidence_rows');
  if (!sufficientRankingComparisonPossible) reasons.push('no_comparable_sufficient_confidence_ranking_cohort');

  return {
    confidenceRule: {
      rowConfidence: 'weakest_selected_concern_result',
      evidenceQualifiedThreshold: 'partial_or_better',
      decisionGradeThreshold: 'sufficient_only',
      minimumEligibleProductsPerRankingCohort: 2,
    },
    byConfidence,
    rawExploratory: {
      gradeChanges: Object.values(byConfidence).reduce((sum, group) => sum + group.gradeChanges, 0),
      scoreDeltaDistribution: combinedDistribution(Object.values(byConfidence)),
      ranking: rawRanking,
    },
    evidenceQualified: {
      threshold: 'partial_or_better',
      gradeChanges: evidenceQualifiedGroups.reduce((sum, group) => sum + group.gradeChanges, 0),
      scoreDeltaDistribution: combinedDistribution(evidenceQualifiedGroups),
      ranking: evidenceQualifiedRanking,
    },
    decisionGrade: {
      threshold: 'sufficient_only',
      gradeChanges: byConfidence.sufficient.gradeChanges,
      scoreDeltaDistribution: { ...byConfidence.sufficient.scoreDeltaDistribution },
      ranking: decisionGradeRanking,
      rankingComparisonPossible: sufficientRankingComparisonPossible,
    },
    decisionReadiness: {
      result: reasons.length === 0 ? 'decision_grade_comparison_available' : 'not_decision_ready',
      reasons,
      authorizesRuntimeActivation: false,
    },
  };
}
