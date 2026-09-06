import type { ProductionReadOnlyJoinedExportRow } from './productionReadOnlyJoinedExport';

export const HEALTH_CONCERN_PRODUCTION_SHADOW_INPUT_COLUMNS = [
  'product_id',
  'product_name',
  'main_category',
  'target_pet_type',
  'ingredient_id',
  'sort_order',
  'ingredient_name_ko',
  'ingredient_name_en',
  'ingredient_risk_level',
] as const;

const HEALTH_EVIDENCE_COLUMNS = [
  'health_concerns',
  'formulation',
  'guaranteed_analysis',
  'calories_per_100g',
  'ingredient_purpose',
] as const;

const VALID_TARGET_SPECIES = new Set(['dog', 'cat', 'all']);
const VALID_RISK_LEVELS = new Set(['safe', 'caution', 'danger']);

export interface HealthConcernProductionShadowInputAudit {
  summary: {
    joinedRows: number;
    distinctProductIds: number;
    distinctProductNames: number;
    distinctIngredientIds: number;
    distinctProductIngredientLinks: number;
    rowsWithoutIngredientLinks: number;
    linkedRowsMissingIngredientNames: number;
    exactDuplicateRows: number;
    productNamesSharedAcrossIds: number;
    productMetadataConflictIds: number;
    ingredientMetadataConflictIds: number;
    conflictingProductIngredientLinks: number;
    invalidTargetSpeciesRows: number;
    invalidIngredientRiskRows: number;
  };
  conflicts: {
    productIds: string[];
    ingredientIds: string[];
    productIngredientKeys: string[];
  };
  productCounts: {
    byTargetSpecies: Record<string, number>;
    byCategory: Record<string, number>;
  };
  columns: {
    supplied: string[];
    unsupported: string[];
    healthEvidence: Record<(typeof HEALTH_EVIDENCE_COLUMNS)[number], {
      supplied: boolean;
      consumedByAdapter: false;
    }>;
    suppliedButNotConsumedHealthEvidence: string[];
  };
  analysisReadiness: {
    decisionReady: false;
    reasons: Array<'no_consumed_health_evidence' | 'supplied_health_evidence_not_consumed'>;
  };
  safety: {
    localCopiedDataOnly: true;
    readOnlyOnly: true;
    usesSupabaseClient: false;
    executesSql: false;
    mutatesInput: false;
    authorizesRuntimeActivation: false;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null | undefined {
  return value == null || typeof value === 'string';
}

function isNullableFiniteNumber(value: unknown): value is number | null | undefined {
  return value == null || (typeof value === 'number' && Number.isFinite(value));
}

function isStructurallyValidRow(value: unknown): value is ProductionReadOnlyJoinedExportRow {
  if (!isRecord(value)) return false;
  return (
    typeof value.product_id === 'string'
    && value.product_id.trim().length > 0
    && typeof value.product_name === 'string'
    && value.product_name.trim().length > 0
    && isNullableString(value.main_category)
    && isNullableString(value.target_pet_type)
    && isNullableString(value.ingredient_id)
    && isNullableFiniteNumber(value.sort_order)
    && isNullableString(value.ingredient_name_ko)
    && isNullableString(value.ingredient_name_en)
    && isNullableString(value.ingredient_risk_level)
  );
}

export function parseHealthConcernProductionShadowInput(
  input: string | unknown,
): ProductionReadOnlyJoinedExportRow[] {
  const parsed = typeof input === 'string' ? JSON.parse(input) : input;
  const candidate = isRecord(parsed) && 'data' in parsed ? parsed.data : parsed;
  if (!Array.isArray(candidate)) {
    throw new TypeError('Health-concern production shadow input must be a JSON row array or { data: row[] }.');
  }
  candidate.forEach((row, index) => {
    if (!isStructurallyValidRow(row)) {
      throw new TypeError(`Invalid health-concern production shadow input row at index ${index}.`);
    }
  });
  return candidate;
}

function addToSetMap(map: Map<string, Set<string>>, key: string, value: string): void {
  const values = map.get(key) ?? new Set<string>();
  values.add(value);
  map.set(key, values);
}

function sortedCountRecord(values: Map<string, number>): Record<string, number> {
  return Object.fromEntries([...values.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

export function auditHealthConcernProductionShadowInput(
  rows: ProductionReadOnlyJoinedExportRow[],
): HealthConcernProductionShadowInputAudit {
  const snapshot = JSON.stringify(rows);
  const productIds = new Set<string>();
  const productNames = new Set<string>();
  const ingredientIds = new Set<string>();
  const productIngredientLinks = new Set<string>();
  const exactRows = new Set<string>();
  const productMetadata = new Map<string, Set<string>>();
  const ingredientMetadata = new Map<string, Set<string>>();
  const linkPositions = new Map<string, Set<string>>();
  const productIdsByName = new Map<string, Set<string>>();
  const productsByTargetSpecies = new Map<string, number>();
  const productsByCategory = new Map<string, number>();
  const suppliedColumns = new Set<string>();
  let rowsWithoutIngredientLinks = 0;
  let linkedRowsMissingIngredientNames = 0;
  let invalidTargetSpeciesRows = 0;
  let invalidIngredientRiskRows = 0;

  for (const row of rows) {
    if (!productIds.has(row.product_id)) {
      const species = row.target_pet_type ?? '<missing>';
      const category = row.main_category ?? '<missing>';
      productsByTargetSpecies.set(species, (productsByTargetSpecies.get(species) ?? 0) + 1);
      productsByCategory.set(category, (productsByCategory.get(category) ?? 0) + 1);
    }
    productIds.add(row.product_id);
    productNames.add(row.product_name);
    exactRows.add(JSON.stringify(row));
    Object.keys(row).forEach((column) => suppliedColumns.add(column));
    addToSetMap(productIdsByName, row.product_name, row.product_id);
    addToSetMap(productMetadata, row.product_id, JSON.stringify([
      row.product_name,
      row.main_category ?? null,
      row.target_pet_type ?? null,
    ]));
    if (row.target_pet_type != null && !VALID_TARGET_SPECIES.has(row.target_pet_type)) {
      invalidTargetSpeciesRows += 1;
    }
    if (row.ingredient_id == null || row.ingredient_id.length === 0) {
      rowsWithoutIngredientLinks += 1;
      continue;
    }
    ingredientIds.add(row.ingredient_id);
    const linkKey = `${row.product_id}\u0000${row.ingredient_id}`;
    productIngredientLinks.add(linkKey);
    addToSetMap(linkPositions, linkKey, String(row.sort_order ?? null));
    addToSetMap(ingredientMetadata, row.ingredient_id, JSON.stringify([
      row.ingredient_name_ko ?? null,
      row.ingredient_name_en ?? null,
      row.ingredient_risk_level ?? null,
    ]));
    if (row.ingredient_name_ko == null || row.ingredient_name_ko.length === 0) {
      linkedRowsMissingIngredientNames += 1;
    }
    if (row.ingredient_risk_level != null && !VALID_RISK_LEVELS.has(row.ingredient_risk_level)) {
      invalidIngredientRiskRows += 1;
    }
  }

  const knownColumns = new Set<string>(HEALTH_CONCERN_PRODUCTION_SHADOW_INPUT_COLUMNS);
  const productConflictIds = [...productMetadata.entries()]
    .filter(([, values]) => values.size > 1)
    .map(([id]) => id)
    .sort();
  const ingredientConflictIds = [...ingredientMetadata.entries()]
    .filter(([, values]) => values.size > 1)
    .map(([id]) => id)
    .sort();
  const conflictingLinkKeys = [...linkPositions.entries()]
    .filter(([, values]) => values.size > 1)
    .map(([key]) => key)
    .sort();
  const suppliedButNotConsumedHealthEvidence = HEALTH_EVIDENCE_COLUMNS
    .filter((column) => suppliedColumns.has(column));

  if (JSON.stringify(rows) !== snapshot) {
    throw new Error('Health-concern production shadow input audit mutated its source rows.');
  }

  return {
    summary: {
      joinedRows: rows.length,
      distinctProductIds: productIds.size,
      distinctProductNames: productNames.size,
      distinctIngredientIds: ingredientIds.size,
      distinctProductIngredientLinks: productIngredientLinks.size,
      rowsWithoutIngredientLinks,
      linkedRowsMissingIngredientNames,
      exactDuplicateRows: rows.length - exactRows.size,
      productNamesSharedAcrossIds: [...productIdsByName.values()].filter((ids) => ids.size > 1).length,
      productMetadataConflictIds: productConflictIds.length,
      ingredientMetadataConflictIds: ingredientConflictIds.length,
      conflictingProductIngredientLinks: conflictingLinkKeys.length,
      invalidTargetSpeciesRows,
      invalidIngredientRiskRows,
    },
    conflicts: {
      productIds: productConflictIds,
      ingredientIds: ingredientConflictIds,
      productIngredientKeys: conflictingLinkKeys,
    },
    productCounts: {
      byTargetSpecies: sortedCountRecord(productsByTargetSpecies),
      byCategory: sortedCountRecord(productsByCategory),
    },
    columns: {
      supplied: [...suppliedColumns].sort(),
      unsupported: [...suppliedColumns].filter((column) => !knownColumns.has(column)).sort(),
      healthEvidence: Object.fromEntries(
        HEALTH_EVIDENCE_COLUMNS.map((column) => [column, {
          supplied: suppliedColumns.has(column),
          consumedByAdapter: false as const,
        }]),
      ) as HealthConcernProductionShadowInputAudit['columns']['healthEvidence'],
      suppliedButNotConsumedHealthEvidence,
    },
    analysisReadiness: {
      decisionReady: false,
      reasons: suppliedButNotConsumedHealthEvidence.length > 0
        ? ['no_consumed_health_evidence', 'supplied_health_evidence_not_consumed']
        : ['no_consumed_health_evidence'],
    },
    safety: {
      localCopiedDataOnly: true,
      readOnlyOnly: true,
      usesSupabaseClient: false,
      executesSql: false,
      mutatesInput: false,
      authorizesRuntimeActivation: false,
    },
  };
}
