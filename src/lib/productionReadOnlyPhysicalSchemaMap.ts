import type {
  ProductionReadOnlyIngredientRow,
  ProductionReadOnlyProductIngredientRow,
  ProductionReadOnlyProductRow,
} from './productionReadOnlyRowAdapter';

export type ProductionPhysicalDataset = 'products' | 'product_ingredients' | 'ingredients';

export interface PhysicalColumnMap {
  physicalColumn: string;
  adapterField: string;
  required: boolean;
}

export interface ProductionPhysicalDatasetMap {
  dataset: ProductionPhysicalDataset;
  sourceKind: 'physical_table';
  tableName: ProductionPhysicalDataset;
  columns: PhysicalColumnMap[];
}

export const PRODUCTION_READ_ONLY_PHYSICAL_SCHEMA: ProductionPhysicalDatasetMap[] = [
  {
    dataset: 'products',
    sourceKind: 'physical_table',
    tableName: 'products',
    columns: [
      { physicalColumn: 'id', adapterField: 'id', required: true },
      { physicalColumn: 'name', adapterField: 'name', required: true },
      { physicalColumn: 'product_type', adapterField: 'category', required: false },
      { physicalColumn: 'target_pet_type', adapterField: 'targetPetType', required: false },
    ],
  },
  {
    dataset: 'product_ingredients',
    sourceKind: 'physical_table',
    tableName: 'product_ingredients',
    columns: [
      { physicalColumn: 'product_id', adapterField: 'productId', required: true },
      { physicalColumn: 'ingredient_id', adapterField: 'ingredientId', required: true },
      { physicalColumn: 'sort_order', adapterField: 'position', required: true },
    ],
  },
  {
    dataset: 'ingredients',
    sourceKind: 'physical_table',
    tableName: 'ingredients',
    columns: [
      { physicalColumn: 'id', adapterField: 'id', required: true },
      { physicalColumn: 'name_ko', adapterField: 'nameKo', required: true },
      { physicalColumn: 'name_en', adapterField: 'nameEn', required: false },
      { physicalColumn: 'risk_level', adapterField: 'riskLevel', required: false },
    ],
  },
];

/** computed_signals is intentionally not a Supabase table. It must be derived locally. */
export const PRODUCTION_COMPUTED_SIGNALS_CONTRACT = {
  dataset: 'computed_signals' as const,
  sourceKind: 'derived_runtime' as const,
  physicalTable: null,
  fields: ['productId', 'allergyHits', 'score', 'displayScore', 'rankingPosition'] as const,
  maySelectFromProduction: false as const,
};

type PhysicalProductRow = {
  id: string;
  name: string;
  product_type?: string | null;
  target_pet_type?: string | null;
};

type PhysicalProductIngredientRow = {
  product_id: string;
  ingredient_id: string;
  sort_order?: number | null;
};

type PhysicalIngredientRow = {
  id: string;
  name_ko: string;
  name_en?: string | null;
  risk_level?: string | null;
};

export function mapPhysicalProductRow(row: PhysicalProductRow): ProductionReadOnlyProductRow {
  return {
    id: row.id,
    name: row.name,
    category: row.product_type ?? null,
    targetPetType: row.target_pet_type ?? null,
  };
}

export function mapPhysicalProductIngredientRow(
  row: PhysicalProductIngredientRow,
): ProductionReadOnlyProductIngredientRow {
  return {
    productId: row.product_id,
    ingredientId: row.ingredient_id,
    position: row.sort_order ?? 0,
  };
}

export function mapPhysicalIngredientRow(row: PhysicalIngredientRow): ProductionReadOnlyIngredientRow {
  return {
    id: row.id,
    nameKo: row.name_ko,
    nameEn: row.name_en ?? null,
    riskLevel: row.risk_level ?? null,
  };
}

export const PRODUCTION_PHYSICAL_SCHEMA_SAFETY = {
  readOnly: true as const,
  executesSql: false as const,
  usesSupabaseClient: false as const,
  allowsMutation: false as const,
  allowsMigration: false as const,
  allowsEnvOrDeployChange: false as const,
  computedSignalsAreDerived: true as const,
};
