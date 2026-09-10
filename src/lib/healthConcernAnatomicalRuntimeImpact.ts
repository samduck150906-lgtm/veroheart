import { classifyLegacyIngredientConcernEvidence } from '../health/anatomicalHeartEvidence';
import {
  HEALTH_CONCERN_DEFINITIONS,
  HEALTH_CONCERN_IDS,
  type HealthConcernId,
} from '../health/concerns';
import type { Product, UserPetProfile } from '../types';
import {
  getRecommendationBreakdown,
  resolveDisplayVerdict,
  type RecommendationBreakdown,
} from '../utils/score';

export interface HealthConcernAnatomicalRuntimeImpactReport {
  reportKind: 'health_concern_anatomical_runtime_impact';
  rowsCompared: number;
  affectedRows: number;
  affectedConcernCounts: Partial<Record<HealthConcernId, number>>;
  concernFitTransitions: Record<string, number>;
  totalScoreDeltaDistribution: Record<string, number>;
  displayScoreDeltaDistribution: Record<string, number>;
  gradeChanges: number;
  ordering: {
    cohortsCompared: number;
    cohortsChanged: number;
    productsWithChangedPosition: number;
  };
  reasonChanges: {
    matchedConcernReasonRemoved: number;
    neutralNoDirectMatchReasonAdded: number;
  };
  nonConcernComponentChanges: Record<
    | 'ingredientSafety'
    | 'healthSuitability'
    | 'allergyHits'
    | 'allergyPenalty'
    | 'allergyCautions'
    | 'allergyCautionPenalty'
    | 'preferencePenalty'
    | 'preferenceLevel'
    | 'speciesMismatch'
    | 'dangerCount'
    | 'cautionCount',
    number
  >;
  everyAffectedRowConfirmedAnatomicalHeartCollision: boolean;
  otherConcernChanges: number;
  invariantViolations: Record<string, number>;
  safety: {
    localCopiedDataOnly: true;
    mutatesInput: false;
    changesCanonicalHealthConcernScore: false;
    changesMissingEvidencePolicy: false;
    authorizesRuntimeActivation: false;
  };
}

interface ComparedRow {
  productKey: string;
  productId: string;
  cohortKey: string;
  concernId: HealthConcernId;
  confirmedCollision: boolean;
  before: RecommendationBreakdown;
  after: RecommendationBreakdown;
  beforeDisplay: ReturnType<typeof resolveDisplayVerdict>;
  afterDisplay: ReturnType<typeof resolveDisplayVerdict>;
}

const NON_CONCERN_COMPONENTS = [
  'ingredientSafety',
  'healthSuitability',
  'allergyHits',
  'allergyPenalty',
  'allergyCautions',
  'allergyCautionPenalty',
  'preferencePenalty',
  'preferenceLevel',
  'speciesMismatch',
  'dangerCount',
  'cautionCount',
] as const;

function normalizeLegacyMatch(value: string): string {
  return value
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[\s()[\]·,./_-]/g, '');
}

function productSpecies(product: Product): UserPetProfile['species'] {
  return product.targetPetType === 'cat' ? 'Cat' : 'Dog';
}

function profileFor(product: Product, concernId: HealthConcernId): UserPetProfile {
  const species = productSpecies(product);
  return {
    id: `anatomical-runtime-impact:${species}:${concernId}`,
    name: 'Aggregate impact profile',
    species,
    age: 4,
    allergies: [],
    healthConcerns: [HEALTH_CONCERN_DEFINITIONS[concernId].label],
  };
}

function isPureAnatomicalCollision(product: Product, concern: string): boolean {
  const normalizedConcern = normalizeLegacyMatch(concern);
  const tagMatches = (product.healthConcerns ?? []).some((tag) =>
    normalizeLegacyMatch(tag).includes(normalizedConcern));
  const ingredientEvidence = (product.ingredients ?? []).map((ingredient) =>
    classifyLegacyIngredientConcernEvidence(concern, ingredient));
  return ingredientEvidence.some((evidence) => evidence.anatomicalHeartNameCollision)
    && !tagMatches
    && !ingredientEvidence.some((evidence) => evidence.matches);
}

function beforeFixProduct(product: Product, profile: UserPetProfile, collision: boolean): Product {
  if (!collision) return product;
  return {
    ...product,
    healthConcerns: [...(product.healthConcerns ?? []), ...profile.healthConcerns],
  };
}

function displayVerdict(breakdown: RecommendationBreakdown) {
  return resolveDisplayVerdict(breakdown.total, {
    speciesMismatch: breakdown.speciesMismatch,
    allergyHits: breakdown.allergyHits.length,
    dangerCount: breakdown.dangerCount,
  });
}

function increment(distribution: Record<string, number>, value: string | number): void {
  const key = String(value);
  distribution[key] = (distribution[key] ?? 0) + 1;
}

function stableOrder(rows: ComparedRow[], score: (row: ComparedRow) => number): ComparedRow[] {
  return [...rows].sort((a, b) => {
    const scoreDelta = score(b) - score(a);
    if (scoreDelta !== 0) return scoreDelta;
    const idOrder = a.productId.localeCompare(b.productId);
    return idOrder || a.productKey.localeCompare(b.productKey);
  });
}

export function buildHealthConcernAnatomicalRuntimeImpactReport(
  products: Product[],
): HealthConcernAnatomicalRuntimeImpactReport {
  const snapshot = JSON.stringify(products);
  const rows: ComparedRow[] = [];
  products.forEach((sourceProduct, productIndex) => {
    const product = sourceProduct.ingredients == null
      ? { ...sourceProduct, ingredients: [] }
      : sourceProduct;
    for (const concernId of HEALTH_CONCERN_IDS) {
      const profile = profileFor(product, concernId);
      const confirmedCollision = isPureAnatomicalCollision(product, profile.healthConcerns[0]);
      const after = getRecommendationBreakdown(product, profile);
      const before = getRecommendationBreakdown(beforeFixProduct(product, profile, confirmedCollision), profile);
      rows.push({
        productKey: `product:${productIndex}:${product.id}`,
        productId: product.id,
        cohortKey: `${profile.species}:${concernId}`,
        concernId,
        confirmedCollision,
        before,
        after,
        beforeDisplay: displayVerdict(before),
        afterDisplay: displayVerdict(after),
      });
    }
  });

  const affected = rows.filter((row) =>
    JSON.stringify(row.before) !== JSON.stringify(row.after)
    || JSON.stringify(row.beforeDisplay) !== JSON.stringify(row.afterDisplay));
  const affectedConcernCounts: HealthConcernAnatomicalRuntimeImpactReport['affectedConcernCounts'] = {};
  const concernFitTransitions: Record<string, number> = {};
  const totalScoreDeltaDistribution: Record<string, number> = {};
  const displayScoreDeltaDistribution: Record<string, number> = {};
  const nonConcernComponentChanges = Object.fromEntries(
    NON_CONCERN_COMPONENTS.map((component) => [component, 0]),
  ) as HealthConcernAnatomicalRuntimeImpactReport['nonConcernComponentChanges'];
  const invariantViolations: Record<string, number> = {};
  let gradeChanges = 0;
  let matchedConcernReasonRemoved = 0;
  let neutralNoDirectMatchReasonAdded = 0;

  for (const row of affected) {
    affectedConcernCounts[row.concernId] = (affectedConcernCounts[row.concernId] ?? 0) + 1;
    increment(concernFitTransitions, `${row.before.concernFit}->${row.after.concernFit}`);
    increment(totalScoreDeltaDistribution, row.after.total - row.before.total);
    increment(displayScoreDeltaDistribution, row.afterDisplay.score - row.beforeDisplay.score);
    if (row.beforeDisplay.grade !== row.afterDisplay.grade) gradeChanges += 1;
    if (
      row.before.reasons.some((reason) => reason.includes('고민과 연관'))
      && !row.after.reasons.some((reason) => reason.includes('고민과 연관'))
    ) matchedConcernReasonRemoved += 1;
    if (
      !row.before.reasons.includes('등록한 건강 고민과 직접 매칭되는 정보가 적음')
      && row.after.reasons.includes('등록한 건강 고민과 직접 매칭되는 정보가 적음')
    ) neutralNoDirectMatchReasonAdded += 1;
    for (const component of NON_CONCERN_COMPONENTS) {
      if (JSON.stringify(row.before[component]) !== JSON.stringify(row.after[component])) {
        nonConcernComponentChanges[component] += 1;
      }
    }
    if (!row.confirmedCollision) increment(invariantViolations, 'affected_row_not_confirmed_collision');
    if (row.concernId !== 'heart') increment(invariantViolations, 'non_heart_concern_changed');
    if (row.before.concernFit !== row.after.concernFit) {
      increment(invariantViolations, 'unexpected_concern_fit_transition');
    }
  }

  const cohortKeys = [...new Set(rows.map((row) => row.cohortKey))].sort();
  const changedPositions = new Set<string>();
  let cohortsChanged = 0;
  for (const cohortKey of cohortKeys) {
    const cohortRows = rows.filter((row) => row.cohortKey === cohortKey);
    const before = stableOrder(cohortRows, (row) => row.before.total);
    const after = stableOrder(cohortRows, (row) => row.after.total);
    const beforeRanks = new Map(before.map((row, index) => [row.productKey, index]));
    const changed = after.filter((row, index) => beforeRanks.get(row.productKey) !== index);
    if (changed.length > 0) cohortsChanged += 1;
    changed.forEach((row) => changedPositions.add(row.productKey));
  }

  if (JSON.stringify(products) !== snapshot) increment(invariantViolations, 'product_input_mutated');
  const otherConcernChanges = affected.filter((row) => row.concernId !== 'heart').length;
  return {
    reportKind: 'health_concern_anatomical_runtime_impact',
    rowsCompared: rows.length,
    affectedRows: affected.length,
    affectedConcernCounts,
    concernFitTransitions,
    totalScoreDeltaDistribution,
    displayScoreDeltaDistribution,
    gradeChanges,
    ordering: {
      cohortsCompared: cohortKeys.length,
      cohortsChanged,
      productsWithChangedPosition: changedPositions.size,
    },
    reasonChanges: {
      matchedConcernReasonRemoved,
      neutralNoDirectMatchReasonAdded,
    },
    nonConcernComponentChanges,
    everyAffectedRowConfirmedAnatomicalHeartCollision:
      affected.length > 0 && affected.every((row) => row.confirmedCollision),
    otherConcernChanges,
    invariantViolations,
    safety: {
      localCopiedDataOnly: true,
      mutatesInput: false,
      changesCanonicalHealthConcernScore: false,
      changesMissingEvidencePolicy: false,
      authorizesRuntimeActivation: false,
    },
  };
}
