import type { Product, UserPetProfile } from '../types';
import { HEALTH_CONCERN_DEFINITIONS, HEALTH_CONCERN_IDS, type ConcernStatus, type DataConfidence, type HealthConcernId } from '../health/concerns';
import {
  buildHealthConcernScoreShadowRow,
  captureLegacyHealthConcernShadowBaseline,
  type HealthConcernScoreShadowRow,
} from './healthConcernScoreShadow';

export interface HealthConcernShadowMatrixRow {
  profileKey: string;
  profileSource: 'synthetic_single_concern' | 'caller_provided';
  row: HealthConcernScoreShadowRow;
}

export interface HealthConcernShadowRankingComparison {
  profileKey: string;
  legacyOrder: string[];
  comparableLegacyOrder: string[];
  candidateOrder: string[];
  products: Array<{
    productId: string;
    legacyRank: number;
    candidateRank: number | null;
    comparison: 'unchanged' | 'changed' | 'not_comparable';
  }>;
}

export interface HealthConcernShadowInvariantViolation {
  profileKey: string;
  productId: string;
  code: string;
}

export interface HealthConcernScoreShadowReport {
  reportKind: 'health_concern_score_shadow_report';
  visibility: 'non_visible_internal_report';
  dataset: 'caller_supplied_or_fixture_only';
  runtimeActivationAuthorized: false;
  syntheticDefaultSpecies: 'Dog';
  matrix: HealthConcernShadowMatrixRow[];
  rankings: HealthConcernShadowRankingComparison[];
  summary: {
    productsRead: number;
    profilesEvaluated: number;
    matrixRowCount: number;
    computedRows: number;
    notSelectedRows: number;
    blockedUnrecognizedRows: number;
    rowsWithInsufficientEvidence: number;
    statusCountsByConcern: Partial<Record<HealthConcernId, Partial<Record<ConcernStatus, number>>>>;
    confidenceCounts: Record<DataConfidence, number>;
    legacyConcernFitDistribution: Record<string, number>;
    candidateConcernFitDistribution: Record<string, number>;
    scoreDeltaDistribution: Record<string, number>;
    maximumIncrease: { productId: string; profileKey: string; delta: number } | null;
    maximumDecrease: { productId: string; profileKey: string; delta: number } | null;
    gradeChangeCounts: { changed: number; unchanged: number; notComparable: number };
    productsWhoseHypotheticalOrderingChanges: string[];
    topAffectedProducts: Array<{ productId: string; maxAbsoluteTotalDelta: number; signedDelta: number }>;
    productsWithMissingIngredientArrays: string[];
    productsWithEmptyHealthTags: string[];
    profilesContainingUnrecognizedInputs: Array<{ profileKey: string; inputs: string[] }>;
    rowsWhereAllQuantitativeEvidenceIsInformational: number;
    invariantViolations: HealthConcernShadowInvariantViolation[];
  };
}

function profileSpeciesFor(product: Product): UserPetProfile['species'] {
  return product.targetPetType === 'cat' ? 'Cat' : 'Dog';
}

function syntheticProfile(product: Product, concernId: HealthConcernId): UserPetProfile {
  return {
    id: `synthetic:${concernId}`,
    name: 'Synthetic shadow profile',
    species: profileSpeciesFor(product),
    age: 4,
    allergies: [],
    healthConcerns: [HEALTH_CONCERN_DEFINITIONS[concernId].label],
  };
}

function increment(distribution: Record<string, number>, value: number): void {
  const key = String(value);
  distribution[key] = (distribution[key] ?? 0) + 1;
}

function stableScoreOrder(
  values: HealthConcernShadowMatrixRow[],
  score: (value: HealthConcernShadowMatrixRow) => number,
): HealthConcernShadowMatrixRow[] {
  return [...values].sort((a, b) => {
    const scoreDelta = score(b) - score(a);
    if (scoreDelta !== 0) return scoreDelta;
    const aId = a.row.identity.productId;
    const bId = b.row.identity.productId;
    return aId < bId ? -1 : aId > bId ? 1 : 0;
  });
}

function safetySignalsMatch(matrixRow: HealthConcernShadowMatrixRow, product: Product, profile: UserPetProfile): boolean {
  const baseline = captureLegacyHealthConcernShadowBaseline(product, profile).breakdown;
  return JSON.stringify(matrixRow.row.unchangedSafetySignals) === JSON.stringify({
    speciesMismatch: baseline.speciesMismatch,
    allergyHits: baseline.allergyHits,
    allergyPenalty: baseline.allergyPenalty,
    allergyCautions: baseline.allergyCautions,
    allergyCautionPenalty: baseline.allergyCautionPenalty,
    poultryCautionPenalty: baseline.allergyCautionPenalty,
    preferencePenalty: baseline.preferencePenalty,
    preferenceLevel: baseline.preferenceLevel,
    ingredientSafety: baseline.ingredientSafety,
    healthSuitability: baseline.healthSuitability,
    dangerCount: baseline.dangerCount,
    cautionCount: baseline.cautionCount,
    visibleReasons: baseline.reasons,
  });
}

export function buildHealthConcernScoreShadowReport(
  products: Product[],
  callerProfiles: UserPetProfile[] = [],
): HealthConcernScoreShadowReport {
  const productsSnapshot = JSON.stringify(products);
  const profilesSnapshot = JSON.stringify(callerProfiles);
  const matrix: HealthConcernShadowMatrixRow[] = [];
  const profileInputs = new Map<string, UserPetProfile>();

  for (const product of products) {
    for (const concernId of HEALTH_CONCERN_IDS) {
      const profile = syntheticProfile(product, concernId);
      const profileKey = `synthetic:${concernId}`;
      profileInputs.set(`${profileKey}\u0000${product.id}`, profile);
      matrix.push({
        profileKey,
        profileSource: 'synthetic_single_concern',
        row: buildHealthConcernScoreShadowRow(product, profile),
      });
    }
    callerProfiles.forEach((profile, index) => {
      const profileKey = `caller:${profile.id ?? index}`;
      profileInputs.set(`${profileKey}\u0000${product.id}`, profile);
      matrix.push({
        profileKey,
        profileSource: 'caller_provided',
        row: buildHealthConcernScoreShadowRow(product, profile),
      });
    });
  }

  const profileKeys = [...new Set(matrix.map((matrixRow) => matrixRow.profileKey))];
  const rankings = profileKeys.map((profileKey): HealthConcernShadowRankingComparison => {
    const profileRows = matrix.filter((matrixRow) => matrixRow.profileKey === profileKey);
    const legacy = stableScoreOrder(profileRows, (matrixRow) => matrixRow.row.legacy.totalScore);
    const comparableRows = profileRows.filter((matrixRow) => matrixRow.row.differences.rankingImpactEligible);
    const comparableLegacy = stableScoreOrder(comparableRows, (matrixRow) => matrixRow.row.legacy.totalScore);
    const candidate = stableScoreOrder(
      comparableRows,
      (matrixRow) => matrixRow.row.candidate.totalScore ?? Number.NEGATIVE_INFINITY,
    );
    const comparableLegacyRanks = new Map(comparableLegacy.map((matrixRow, index) => [matrixRow.row.identity.productId, index + 1]));
    const candidateRanks = new Map(candidate.map((matrixRow, index) => [matrixRow.row.identity.productId, index + 1]));
    return {
      profileKey,
      legacyOrder: legacy.map((matrixRow) => matrixRow.row.identity.productId),
      comparableLegacyOrder: comparableLegacy.map((matrixRow) => matrixRow.row.identity.productId),
      candidateOrder: candidate.map((matrixRow) => matrixRow.row.identity.productId),
      products: legacy.map((matrixRow) => {
        const productId = matrixRow.row.identity.productId;
        const candidateRank = candidateRanks.get(productId) ?? null;
        const legacyRank = comparableLegacyRanks.get(productId) ?? legacy.indexOf(matrixRow) + 1;
        return {
          productId,
          legacyRank,
          candidateRank,
          comparison: candidateRank == null
            ? 'not_comparable'
            : candidateRank === legacyRank ? 'unchanged' : 'changed',
        };
      }),
    };
  });

  const statusCountsByConcern: HealthConcernScoreShadowReport['summary']['statusCountsByConcern'] = {};
  const confidenceCounts: Record<DataConfidence, number> = { sufficient: 0, partial: 0, insufficient: 0 };
  const legacyConcernFitDistribution: Record<string, number> = {};
  const candidateConcernFitDistribution: Record<string, number> = {};
  const scoreDeltaDistribution: Record<string, number> = {};
  const comparableDeltas: Array<{ productId: string; profileKey: string; delta: number }> = [];
  const invariantViolations: HealthConcernShadowInvariantViolation[] = [];

  for (const matrixRow of matrix) {
    increment(legacyConcernFitDistribution, matrixRow.row.legacy.concernFit);
    if (matrixRow.row.candidate.concernFit != null) increment(candidateConcernFitDistribution, matrixRow.row.candidate.concernFit);
    if (matrixRow.row.differences.totalScoreDelta != null) {
      increment(scoreDeltaDistribution, matrixRow.row.differences.totalScoreDelta);
      comparableDeltas.push({
        productId: matrixRow.row.identity.productId,
        profileKey: matrixRow.profileKey,
        delta: matrixRow.row.differences.totalScoreDelta,
      });
    }
    for (const result of matrixRow.row.candidate.evaluatorResults) {
      const concernCounts = statusCountsByConcern[result.concernId] ?? {};
      concernCounts[result.status] = (concernCounts[result.status] ?? 0) + 1;
      statusCountsByConcern[result.concernId] = concernCounts;
      confidenceCounts[result.confidence] += 1;
    }
    for (const code of matrixRow.row.invariantViolations) {
      invariantViolations.push({
        profileKey: matrixRow.profileKey,
        productId: matrixRow.row.identity.productId,
        code,
      });
    }
    const product = products.find((item) => item.id === matrixRow.row.identity.productId);
    const profile = profileInputs.get(`${matrixRow.profileKey}\u0000${matrixRow.row.identity.productId}`);
    if (product && profile && !safetySignalsMatch(matrixRow, product, profile)) {
      invariantViolations.push({
        profileKey: matrixRow.profileKey,
        productId: matrixRow.row.identity.productId,
        code: 'baseline_safety_signal_changed',
      });
    }
  }

  if (JSON.stringify(products) !== productsSnapshot) {
    invariantViolations.push({ profileKey: '*', productId: '*', code: 'product_input_mutated' });
  }
  if (JSON.stringify(callerProfiles) !== profilesSnapshot) {
    invariantViolations.push({ profileKey: '*', productId: '*', code: 'profile_input_mutated' });
  }

  const changedProductIds = [...new Set(rankings.flatMap((ranking) =>
    ranking.products.filter((product) => product.comparison === 'changed').map((product) => product.productId)))].sort();
  const impactsByProduct = new Map<string, { maxAbsoluteTotalDelta: number; signedDelta: number }>();
  for (const delta of comparableDeltas) {
    const current = impactsByProduct.get(delta.productId);
    if (!current || Math.abs(delta.delta) > current.maxAbsoluteTotalDelta) {
      impactsByProduct.set(delta.productId, { maxAbsoluteTotalDelta: Math.abs(delta.delta), signedDelta: delta.delta });
    }
  }
  const topAffectedProducts = [...impactsByProduct.entries()]
    .map(([productId, impact]) => ({ productId, ...impact }))
    .sort((a, b) => b.maxAbsoluteTotalDelta - a.maxAbsoluteTotalDelta || (a.productId < b.productId ? -1 : 1))
    .slice(0, 10);
  const maximumIncrease = comparableDeltas
    .filter((delta) => delta.delta > 0)
    .sort((a, b) => b.delta - a.delta)[0] ?? null;
  const maximumDecrease = comparableDeltas
    .filter((delta) => delta.delta < 0)
    .sort((a, b) => a.delta - b.delta)[0] ?? null;
  const profilesContainingUnrecognizedInputs = profileKeys.flatMap((profileKey) => {
    const inputs = [...new Set(matrix
      .filter((matrixRow) => matrixRow.profileKey === profileKey)
      .flatMap((matrixRow) => matrixRow.row.identity.unrecognizedProfileInputs))];
    return inputs.length > 0 ? [{ profileKey, inputs }] : [];
  });

  return {
    reportKind: 'health_concern_score_shadow_report',
    visibility: 'non_visible_internal_report',
    dataset: 'caller_supplied_or_fixture_only',
    runtimeActivationAuthorized: false,
    syntheticDefaultSpecies: 'Dog',
    matrix,
    rankings,
    summary: {
      productsRead: products.length,
      profilesEvaluated: products.length === 0 ? 0 : HEALTH_CONCERN_IDS.length + callerProfiles.length,
      matrixRowCount: matrix.length,
      computedRows: matrix.filter((matrixRow) => matrixRow.row.candidate.status === 'computed').length,
      notSelectedRows: matrix.filter((matrixRow) => matrixRow.row.candidate.status === 'not_selected').length,
      blockedUnrecognizedRows: matrix.filter((matrixRow) => matrixRow.row.candidate.status === 'blocked_unrecognized').length,
      rowsWithInsufficientEvidence: matrix.filter((matrixRow) =>
        matrixRow.row.differences.blockedOrIncompleteReasons.includes('insufficient_evidence')).length,
      statusCountsByConcern,
      confidenceCounts,
      legacyConcernFitDistribution,
      candidateConcernFitDistribution,
      scoreDeltaDistribution,
      maximumIncrease,
      maximumDecrease,
      gradeChangeCounts: {
        changed: matrix.filter((matrixRow) => matrixRow.row.differences.gradeChanged === true).length,
        unchanged: matrix.filter((matrixRow) => matrixRow.row.differences.gradeChanged === false).length,
        notComparable: matrix.filter((matrixRow) => matrixRow.row.differences.gradeChanged == null).length,
      },
      productsWhoseHypotheticalOrderingChanges: changedProductIds,
      topAffectedProducts,
      productsWithMissingIngredientArrays: products
        .filter((product) => product.ingredients == null)
        .map((product) => product.id)
        .sort(),
      productsWithEmptyHealthTags: products
        .filter((product) => (product.healthConcerns ?? []).length === 0)
        .map((product) => product.id)
        .sort(),
      profilesContainingUnrecognizedInputs,
      rowsWhereAllQuantitativeEvidenceIsInformational: matrix.filter((matrixRow) => {
        const checks = matrixRow.row.candidate.evaluatorResults.flatMap((result) => result.quantitativeChecks);
        return checks.length > 0 && checks.every((check) => check.judgment === 'informational');
      }).length,
      invariantViolations,
    },
  };
}
