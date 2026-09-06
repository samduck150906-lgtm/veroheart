import type { Ingredient, Product } from '../types';
import { buildHealthConcernScoreShadowReport, type HealthConcernScoreShadowReport } from './healthConcernScoreShadowReport';
import {
  auditHealthConcernProductionShadowInput,
  parseHealthConcernProductionShadowInput,
  type HealthConcernProductionShadowInputAudit,
} from './healthConcernProductionShadowInput';
import type { ProductionReadOnlyJoinedExportRow } from './productionReadOnlyJoinedExport';
import {
  diagnoseHealthConcernProductionShadowAnatomicalCollisions,
  summarizeHealthConcernProductionShadowImpact,
  type HealthConcernProductionShadowAnatomicalCollisionDiagnostic,
  type HealthConcernProductionShadowImpactSummary,
} from './healthConcernProductionShadowImpact';

const VALID_SPECIES = new Set(['dog', 'cat', 'all']);
const VALID_RISK_LEVELS = new Set<Ingredient['riskLevel']>(['safe', 'caution', 'danger']);

export type HealthConcernProductionShadowRejectionCode =
  | 'conflicting_product_metadata'
  | 'conflicting_ingredient_metadata'
  | 'conflicting_ingredient_order'
  | 'mixed_missing_and_present_ingredient_links'
  | 'linked_ingredient_name_missing'
  | 'linked_ingredient_risk_missing_or_invalid';

export interface HealthConcernProductionShadowAdapterReport {
  products: Product[];
  rejectedProducts: Array<{
    productId: string;
    codes: HealthConcernProductionShadowRejectionCode[];
  }>;
  summary: {
    rowsReceived: number;
    productsObserved: number;
    productsAdapted: number;
    productsRejected: number;
    productsWithoutIngredientLinks: number;
    productsWithInvalidTargetSpecies: number;
    repeatedProductJoinRows: number;
    exactDuplicateRows: number;
  };
  safety: {
    localCopiedDataOnly: true;
    readOnlyOnly: true;
    mutatesInput: false;
    fabricatesHealthEvidence: false;
    usesSupabaseClient: false;
    executesSql: false;
    authorizesRuntimeActivation: false;
  };
}

export interface HealthConcernProductionShadowExecutionReport {
  reportKind: 'health_concern_production_shadow_execution';
  source: {
    format: 'copied_supabase_joined_row_json';
    rowsReceived: number;
  };
  inputAudit: HealthConcernProductionShadowInputAudit;
  adapter: HealthConcernProductionShadowAdapterReport;
  shadow: HealthConcernScoreShadowReport;
  impact: HealthConcernProductionShadowImpactSummary;
  legacyAnatomicalCollisions: HealthConcernProductionShadowAnatomicalCollisionDiagnostic;
  safety: {
    localCopiedDataOnly: true;
    readOnlyOnly: true;
    changesRuntimeScore: false;
    changesRuntimeRanking: false;
    authorizesRuntimeActivation: false;
  };
}

interface IndexedRow {
  row: ProductionReadOnlyJoinedExportRow;
  index: number;
}

function setMapAdd(map: Map<string, Set<string>>, key: string, value: string): void {
  const values = map.get(key) ?? new Set<string>();
  values.add(value);
  map.set(key, values);
}

function rejectionMapAdd(
  map: Map<string, Set<HealthConcernProductionShadowRejectionCode>>,
  productId: string,
  code: HealthConcernProductionShadowRejectionCode,
): void {
  const codes = map.get(productId) ?? new Set<HealthConcernProductionShadowRejectionCode>();
  codes.add(code);
  map.set(productId, codes);
}

function validSpecies(value: string | null | undefined): Product['targetPetType'] | undefined {
  return value != null && VALID_SPECIES.has(value) ? value as Product['targetPetType'] : undefined;
}

function ingredientFrom(row: ProductionReadOnlyJoinedExportRow): Ingredient | null {
  if (
    row.ingredient_id == null
    || row.ingredient_name_ko == null
    || row.ingredient_name_ko.length === 0
    || row.ingredient_risk_level == null
    || !VALID_RISK_LEVELS.has(row.ingredient_risk_level as Ingredient['riskLevel'])
  ) {
    return null;
  }
  return {
    id: row.ingredient_id,
    nameKo: row.ingredient_name_ko,
    nameEn: row.ingredient_name_en ?? '',
    purpose: '',
    riskLevel: row.ingredient_risk_level as Ingredient['riskLevel'],
  };
}

export function adaptHealthConcernProductionShadowProducts(
  rows: ProductionReadOnlyJoinedExportRow[],
): HealthConcernProductionShadowAdapterReport {
  const snapshot = JSON.stringify(rows);
  const indexedByProduct = new Map<string, IndexedRow[]>();
  const productMetadata = new Map<string, Set<string>>();
  const ingredientMetadata = new Map<string, Set<string>>();
  const linkPositions = new Map<string, Set<string>>();
  const productsByIngredient = new Map<string, Set<string>>();
  const rejectionCodes = new Map<string, Set<HealthConcernProductionShadowRejectionCode>>();

  rows.forEach((row, index) => {
    const indexed = indexedByProduct.get(row.product_id) ?? [];
    indexed.push({ row, index });
    indexedByProduct.set(row.product_id, indexed);
    setMapAdd(productMetadata, row.product_id, JSON.stringify([
      row.product_name,
      row.main_category ?? null,
      row.target_pet_type ?? null,
    ]));
    if (row.ingredient_id == null || row.ingredient_id.length === 0) return;
    setMapAdd(ingredientMetadata, row.ingredient_id, JSON.stringify([
      row.ingredient_name_ko ?? null,
      row.ingredient_name_en ?? null,
      row.ingredient_risk_level ?? null,
    ]));
    setMapAdd(linkPositions, `${row.product_id}\u0000${row.ingredient_id}`, String(row.sort_order ?? null));
    setMapAdd(productsByIngredient, row.ingredient_id, row.product_id);
    if (row.ingredient_name_ko == null || row.ingredient_name_ko.length === 0) {
      rejectionMapAdd(rejectionCodes, row.product_id, 'linked_ingredient_name_missing');
    }
    if (
      row.ingredient_risk_level == null
      || !VALID_RISK_LEVELS.has(row.ingredient_risk_level as Ingredient['riskLevel'])
    ) {
      rejectionMapAdd(rejectionCodes, row.product_id, 'linked_ingredient_risk_missing_or_invalid');
    }
  });

  for (const [productId, signatures] of productMetadata) {
    if (signatures.size > 1) rejectionMapAdd(rejectionCodes, productId, 'conflicting_product_metadata');
  }
  for (const [ingredientId, signatures] of ingredientMetadata) {
    if (signatures.size <= 1) continue;
    for (const productId of productsByIngredient.get(ingredientId) ?? []) {
      rejectionMapAdd(rejectionCodes, productId, 'conflicting_ingredient_metadata');
    }
  }
  for (const [linkKey, positions] of linkPositions) {
    if (positions.size > 1) {
      rejectionMapAdd(rejectionCodes, linkKey.split('\u0000')[0], 'conflicting_ingredient_order');
    }
  }
  for (const [productId, indexedRows] of indexedByProduct) {
    const hasMissingLink = indexedRows.some(({ row }) => row.ingredient_id == null || row.ingredient_id.length === 0);
    const hasPresentLink = indexedRows.some(({ row }) => row.ingredient_id != null && row.ingredient_id.length > 0);
    if (hasMissingLink && hasPresentLink) {
      rejectionMapAdd(rejectionCodes, productId, 'mixed_missing_and_present_ingredient_links');
    }
  }

  const products: Product[] = [];
  let productsWithoutIngredientLinks = 0;
  let productsWithInvalidTargetSpecies = 0;
  for (const [productId, indexedRows] of indexedByProduct) {
    if (rejectionCodes.has(productId)) continue;
    const first = indexedRows[0].row;
    if (first.target_pet_type != null && validSpecies(first.target_pet_type) == null) {
      productsWithInvalidTargetSpecies += 1;
    }
    const linkedRows = indexedRows
      .filter(({ row }) => row.ingredient_id != null && row.ingredient_id.length > 0)
      .sort((a, b) => {
        const aOrder = a.row.sort_order ?? Number.POSITIVE_INFINITY;
        const bOrder = b.row.sort_order ?? Number.POSITIVE_INFINITY;
        return aOrder - bOrder || a.index - b.index;
      });
    const seenIngredientIds = new Set<string>();
    const ingredients = linkedRows.flatMap(({ row }) => {
      if (row.ingredient_id == null || seenIngredientIds.has(row.ingredient_id)) return [];
      seenIngredientIds.add(row.ingredient_id);
      const ingredient = ingredientFrom(row);
      return ingredient == null ? [] : [ingredient];
    });
    if (linkedRows.length === 0) productsWithoutIngredientLinks += 1;
    products.push({
      id: productId,
      brand: '',
      name: first.product_name,
      category: first.main_category ?? '',
      ...(first.main_category == null ? {} : { mainCategory: first.main_category }),
      ...(validSpecies(first.target_pet_type) == null ? {} : { targetPetType: validSpecies(first.target_pet_type) }),
      imageUrl: '',
      ingredients: linkedRows.length === 0 ? undefined as unknown as Product['ingredients'] : ingredients,
      reviewsCount: 0,
      averageRating: 0,
    });
  }

  if (JSON.stringify(rows) !== snapshot) {
    throw new Error('Health-concern production shadow adapter mutated its source rows.');
  }

  return {
    products,
    rejectedProducts: [...rejectionCodes.entries()]
      .map(([productId, codes]) => ({ productId, codes: [...codes].sort() }))
      .sort((a, b) => a.productId.localeCompare(b.productId)),
    summary: {
      rowsReceived: rows.length,
      productsObserved: indexedByProduct.size,
      productsAdapted: products.length,
      productsRejected: rejectionCodes.size,
      productsWithoutIngredientLinks,
      productsWithInvalidTargetSpecies,
      repeatedProductJoinRows: rows.length - indexedByProduct.size,
      exactDuplicateRows: rows.length - new Set(rows.map((row) => JSON.stringify(row))).size,
    },
    safety: {
      localCopiedDataOnly: true,
      readOnlyOnly: true,
      mutatesInput: false,
      fabricatesHealthEvidence: false,
      usesSupabaseClient: false,
      executesSql: false,
      authorizesRuntimeActivation: false,
    },
  };
}

export function buildHealthConcernProductionShadowExecutionReport(
  input: string | unknown,
): HealthConcernProductionShadowExecutionReport {
  const rows = parseHealthConcernProductionShadowInput(input);
  const inputAudit = auditHealthConcernProductionShadowInput(rows);
  const adapter = adaptHealthConcernProductionShadowProducts(rows);
  const shadow = buildHealthConcernScoreShadowReport(adapter.products);
  return {
    reportKind: 'health_concern_production_shadow_execution',
    source: {
      format: 'copied_supabase_joined_row_json',
      rowsReceived: rows.length,
    },
    inputAudit,
    adapter,
    shadow,
    impact: summarizeHealthConcernProductionShadowImpact(shadow),
    legacyAnatomicalCollisions: diagnoseHealthConcernProductionShadowAnatomicalCollisions(adapter.products, shadow),
    safety: {
      localCopiedDataOnly: true,
      readOnlyOnly: true,
      changesRuntimeScore: false,
      changesRuntimeRanking: false,
      authorizesRuntimeActivation: false,
    },
  };
}
