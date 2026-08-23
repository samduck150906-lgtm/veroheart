import type {
  ProductionReadOnlyRows,
  ProductionReadOnlySignalRow,
} from './productionReadOnlyRowAdapter';

export interface PhysicalProductRow {
  id: string;
  name: string;
  main_category?: string | null;
  target_pet_type?: string | null;
}

export interface PhysicalProductIngredientRow {
  product_id: string;
  ingredient_id: string;
  sort_order?: number | null;
}

export interface PhysicalIngredientRow {
  id: string;
  name_ko: string;
  name_en?: string | null;
  risk_level?: string | null;
}

export interface ProductionPhysicalReadOnlyInput {
  products: PhysicalProductRow[];
  productIngredients: PhysicalProductIngredientRow[];
  ingredients: PhysicalIngredientRow[];
  /**
   * computed_signals is not a physical production table in this contract.
   * It is derived by the read-only analysis harness and is already adapter-shaped.
   */
  signals?: ProductionReadOnlySignalRow[];
}

export interface PhysicalColumnMapping {
  dataset: 'products' | 'product_ingredients' | 'ingredients' | 'computed_signals';
  physicalTable: string | null;
  physicalColumn: string | null;
  adapterField: string;
  required: boolean;
}

export const PRODUCTION_READ_ONLY_PHYSICAL_COLUMN_MAP: PhysicalColumnMapping[] = [
  { dataset: 'products', physicalTable: 'products', physicalColumn: 'id', adapterField: 'id', required: true },
  { dataset: 'products', physicalTable: 'products', physicalColumn: 'name', adapterField: 'name', required: true },
  { dataset: 'products', physicalTable: 'products', physicalColumn: 'main_category', adapterField: 'category', required: false },
  { dataset: 'products', physicalTable: 'products', physicalColumn: 'target_pet_type', adapterField: 'targetPetType', required: false },

  { dataset: 'product_ingredients', physicalTable: 'product_ingredients', physicalColumn: 'product_id', adapterField: 'productId', required: true },
  { dataset: 'product_ingredients', physicalTable: 'product_ingredients', physicalColumn: 'ingredient_id', adapterField: 'ingredientId', required: true },
  { dataset: 'product_ingredients', physicalTable: 'product_ingredients', physicalColumn: 'sort_order', adapterField: 'position', required: true },

  { dataset: 'ingredients', physicalTable: 'ingredients', physicalColumn: 'id', adapterField: 'id', required: true },
  { dataset: 'ingredients', physicalTable: 'ingredients', physicalColumn: 'name_ko', adapterField: 'nameKo', required: true },
  { dataset: 'ingredients', physicalTable: 'ingredients', physicalColumn: 'name_en', adapterField: 'nameEn', required: false },
  { dataset: 'ingredients', physicalTable: 'ingredients', physicalColumn: 'risk_level', adapterField: 'riskLevel', required: false },

  { dataset: 'computed_signals', physicalTable: null, physicalColumn: null, adapterField: 'productId', required: true },
  { dataset: 'computed_signals', physicalTable: null, physicalColumn: null, adapterField: 'allergyHits', required: true },
  { dataset: 'computed_signals', physicalTable: null, physicalColumn: null, adapterField: 'score', required: true },
  { dataset: 'computed_signals', physicalTable: null, physicalColumn: null, adapterField: 'displayScore', required: true },
  { dataset: 'computed_signals', physicalTable: null, physicalColumn: null, adapterField: 'rankingPosition', required: false },
];

export function mapProductionPhysicalRowsToAdapterRows(
  input: ProductionPhysicalReadOnlyInput,
): ProductionReadOnlyRows {
  return {
    products: input.products.map((row) => ({
      id: row.id,
      name: row.name,
      category: row.main_category ?? null,
      targetPetType: row.target_pet_type ?? null,
    })),
    productIngredients: input.productIngredients.map((row) => ({
      productId: row.product_id,
      ingredientId: row.ingredient_id,
      position: row.sort_order ?? 0,
    })),
    ingredients: input.ingredients.map((row) => ({
      id: row.id,
      nameKo: row.name_ko,
      nameEn: row.name_en ?? null,
      riskLevel: row.risk_level ?? null,
    })),
    signals: input.signals ?? [],
  };
}

export function buildProductionPhysicalColumnMapReport() {
  return {
    reportKind: 'production_read_only_physical_column_map' as const,
    mappings: PRODUCTION_READ_ONLY_PHYSICAL_COLUMN_MAP,
    physicalTables: ['products', 'product_ingredients', 'ingredients'] as const,
    derivedDatasets: ['computed_signals'] as const,
    safety: {
      readOnlyOnly: true as const,
      executesSql: false as const,
      usesSupabaseClient: false as const,
      mutatesProductionRows: false as const,
      allowsMigration: false as const,
      allowsEnvOrDeployChange: false as const,
    },
  };
}
