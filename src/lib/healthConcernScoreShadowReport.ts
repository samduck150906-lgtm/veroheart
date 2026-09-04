import type { Product, UserPetProfile } from '../types';
import { HEALTH_CONCERN_DEFINITIONS, HEALTH_CONCERN_IDS, type ConcernStatus, type DataConfidence, type HealthConcernId } from '../health/concerns';
import {
  buildHealthConcernScoreShadowRow,
  captureLegacyHealthConcernShadowBaseline,
  type HealthConcernScoreShadowRow,
} from './healthConcernScoreShadow';

export interface HealthConcernShadowMatrixRow {
  productKey: string;
  profileDefinitionKey: string;
  profileKey: string;
  rankingCohortKey: string;
  profileSource: 'synthetic_single_concern' | 'caller_provided';
  row: HealthConcernScoreShadowRow;
}

export interface HealthConcernShadowRankingComparison {
  rankingCohortKey: string;
  profileSpecies: UserPetProfile['species'];
  legacyOrder: string[];
  comparableLegacyOrder: string[];
  candidateOrder: string[];
  products: Array<{
    productKey: string;
    productId: string;
    legacyRank: number;
    candidateRank: number | null;
    comparison: 'unchanged' | 'changed' | 'not_comparable';
  }>;
}

export interface HealthConcernShadowInvariantViolation {
  productKey: string;
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
    profileDefinitionsEvaluated: number;
    profileVariantsEvaluated: number;
    profilesEvaluated: number;
    rankingCohortCount: number;
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
    maximumIncrease: { productKey: string; productId: string; profileKey: string; delta: number } | null;
    maximumDecrease: { productKey: string; productId: string; profileKey: string; delta: number } | null;
    gradeChangeCounts: { changed: number; unchanged: number; notComparable: number };
    productsWhoseHypotheticalOrderingChanges: string[];
    topAffectedProducts: Array<{
      productKey: string;
      productId: string;
      maxAbsoluteTotalDelta: number;
      signedDelta: number;
    }>;
    productsWithMissingIngredientArrays: string[];
    productsWithEmptyHealthTags: string[];
    duplicateProductIds: string[];
    profilesContainingUnrecognizedInputs: Array<{ profileKey: string; inputs: string[] }>;
    rowsWhereAllQuantitativeEvidenceIsInformational: number;
    invariantViolations: HealthConcernShadowInvariantViolation[];
  };
}

function profileSpeciesFor(product: Product): UserPetProfile['species'] {
  return product.targetPetType === 'cat' ? 'Cat' : 'Dog';
}

function syntheticProfile(product: Product, concernId: HealthConcernId): UserPetProfile {
  const species = profileSpeciesFor(product);
  return {
    id: `synthetic:${species}:${concernId}`,
    name: 'Synthetic shadow profile',
    species,
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
    if (aId !== bId) return aId < bId ? -1 : 1;
    return a.productKey < b.productKey ? -1 : a.productKey > b.productKey ? 1 : 0;
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
  const contexts: Array<{
    matrixRow: HealthConcernShadowMatrixRow;
    product: Product;
    profile: UserPetProfile;
  }> = [];

  products.forEach((product, productIndex) => {
    const productKey = `product:${productIndex}:${product.id}`;
    for (const concernId of HEALTH_CONCERN_IDS) {
      const profile = syntheticProfile(product, concernId);
      const profileDefinitionKey = `synthetic:${concernId}`;
      const profileKey = `synthetic:${profile.species}:${concernId}`;
      contexts.push({
        product,
        profile,
        matrixRow: {
          productKey,
          profileDefinitionKey,
          profileKey,
          rankingCohortKey: profileKey,
          profileSource: 'synthetic_single_concern',
          row: buildHealthConcernScoreShadowRow(product, profile),
        },
      });
    }
    callerProfiles.forEach((profile, index) => {
      const profileKey = `caller:${index}:${profile.id ?? 'missing-id'}`;
      contexts.push({
        product,
        profile,
        matrixRow: {
          productKey,
          profileDefinitionKey: `caller-entry:${index}`,
          profileKey,
          rankingCohortKey: profileKey,
          profileSource: 'caller_provided',
          row: buildHealthConcernScoreShadowRow(product, profile),
        },
      });
    });
  });
  const matrix = contexts.map(({ matrixRow }) => matrixRow);
  const productIdCounts = new Map<string, number>();
  for (const product of products) {
    productIdCounts.set(product.id, (productIdCounts.get(product.id) ?? 0) + 1);
  }
  const duplicateProductIds = [...productIdCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([productId]) => productId)
    .sort();
  const duplicateProductIdSet = new Set(duplicateProductIds);

  const rankingCohortKeys = [...new Set(matrix.map((matrixRow) => matrixRow.rankingCohortKey))];
  const rankings = rankingCohortKeys.map((rankingCohortKey): HealthConcernShadowRankingComparison => {
    const profileRows = matrix.filter((matrixRow) => matrixRow.rankingCohortKey === rankingCohortKey);
    const legacy = stableScoreOrder(profileRows, (matrixRow) => matrixRow.row.legacy.totalScore);
    const comparableRows = profileRows.filter((matrixRow) =>
      matrixRow.row.differences.rankingImpactEligible
      && !duplicateProductIdSet.has(matrixRow.row.identity.productId));
    const comparableLegacy = stableScoreOrder(comparableRows, (matrixRow) => matrixRow.row.legacy.totalScore);
    const candidate = stableScoreOrder(
      comparableRows,
      (matrixRow) => matrixRow.row.candidate.totalScore ?? Number.NEGATIVE_INFINITY,
    );
    const comparableLegacyRanks = new Map(comparableLegacy.map((matrixRow, index) => [matrixRow.productKey, index + 1]));
    const candidateRanks = new Map(candidate.map((matrixRow, index) => [matrixRow.productKey, index + 1]));
    const profileSpecies = profileRows[0]?.row.identity.profileSpecies ?? 'Dog';
    return {
      rankingCohortKey,
      profileSpecies,
      legacyOrder: legacy.map((matrixRow) => matrixRow.productKey),
      comparableLegacyOrder: comparableLegacy.map((matrixRow) => matrixRow.productKey),
      candidateOrder: candidate.map((matrixRow) => matrixRow.productKey),
      products: legacy.map((matrixRow) => {
        const productId = matrixRow.row.identity.productId;
        const candidateRank = candidateRanks.get(matrixRow.productKey) ?? null;
        const legacyRank = comparableLegacyRanks.get(matrixRow.productKey) ?? legacy.indexOf(matrixRow) + 1;
        return {
          productKey: matrixRow.productKey,
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
  const comparableDeltas: Array<{ productKey: string; productId: string; profileKey: string; delta: number }> = [];
  const invariantViolations: HealthConcernShadowInvariantViolation[] = [];

  for (const { matrixRow, product, profile } of contexts) {
    increment(legacyConcernFitDistribution, matrixRow.row.legacy.concernFit);
    if (matrixRow.row.candidate.concernFit != null) increment(candidateConcernFitDistribution, matrixRow.row.candidate.concernFit);
    if (matrixRow.row.differences.totalScoreDelta != null) {
      increment(scoreDeltaDistribution, matrixRow.row.differences.totalScoreDelta);
      comparableDeltas.push({
        productKey: matrixRow.productKey,
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
        productKey: matrixRow.productKey,
        profileKey: matrixRow.profileKey,
        productId: matrixRow.row.identity.productId,
        code,
      });
    }
    if (!safetySignalsMatch(matrixRow, product, profile)) {
      invariantViolations.push({
        productKey: matrixRow.productKey,
        profileKey: matrixRow.profileKey,
        productId: matrixRow.row.identity.productId,
        code: 'baseline_safety_signal_changed',
      });
    }
  }
  for (const productId of duplicateProductIds) {
    invariantViolations.push({ productKey: '*', profileKey: '*', productId, code: 'duplicate_product_id' });
  }

  if (JSON.stringify(products) !== productsSnapshot) {
    invariantViolations.push({ productKey: '*', profileKey: '*', productId: '*', code: 'product_input_mutated' });
  }
  if (JSON.stringify(callerProfiles) !== profilesSnapshot) {
    invariantViolations.push({ productKey: '*', profileKey: '*', productId: '*', code: 'profile_input_mutated' });
  }

  const changedProductIds = [...new Set(rankings.flatMap((ranking) =>
    ranking.products.filter((product) => product.comparison === 'changed').map((product) => product.productId)))].sort();
  const impactsByProduct = new Map<string, {
    productId: string;
    maxAbsoluteTotalDelta: number;
    signedDelta: number;
  }>();
  for (const delta of comparableDeltas) {
    const current = impactsByProduct.get(delta.productKey);
    if (!current || Math.abs(delta.delta) > current.maxAbsoluteTotalDelta) {
      impactsByProduct.set(delta.productKey, {
        productId: delta.productId,
        maxAbsoluteTotalDelta: Math.abs(delta.delta),
        signedDelta: delta.delta,
      });
    }
  }
  const topAffectedProducts = [...impactsByProduct.entries()]
    .map(([productKey, impact]) => ({ productKey, ...impact }))
    .sort((a, b) => b.maxAbsoluteTotalDelta - a.maxAbsoluteTotalDelta || (a.productKey < b.productKey ? -1 : 1))
    .slice(0, 10);
  const maximumIncrease = comparableDeltas
    .filter((delta) => delta.delta > 0)
    .sort((a, b) => b.delta - a.delta)[0] ?? null;
  const maximumDecrease = comparableDeltas
    .filter((delta) => delta.delta < 0)
    .sort((a, b) => a.delta - b.delta)[0] ?? null;
  const profileKeys = [...new Set(matrix.map((matrixRow) => matrixRow.profileKey))];
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
      profileDefinitionsEvaluated: products.length === 0 ? 0 : HEALTH_CONCERN_IDS.length + callerProfiles.length,
      profileVariantsEvaluated: profileKeys.length,
      profilesEvaluated: profileKeys.length,
      rankingCohortCount: rankings.length,
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
      duplicateProductIds,
      profilesContainingUnrecognizedInputs,
      rowsWhereAllQuantitativeEvidenceIsInformational: matrix.filter((matrixRow) => {
        const checks = matrixRow.row.candidate.evaluatorResults.flatMap((result) => result.quantitativeChecks);
        return checks.length > 0 && checks.every((check) => check.judgment === 'informational');
      }).length,
      invariantViolations,
    },
  };
}
