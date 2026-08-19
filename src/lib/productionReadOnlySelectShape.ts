export type ProductionReadOnlySelectDataset =
  | 'products'
  | 'product_ingredients'
  | 'ingredients'
  | 'computed_signals';

export interface ProductionReadOnlySelectShape {
  dataset: ProductionReadOnlySelectDataset;
  requiredColumns: string[];
  optionalColumns: string[];
  joinsTo?: ProductionReadOnlySelectDataset[];
  adapterTarget: string;
}

export interface ProductionReadOnlySelectShapePlan {
  planKind: 'production_read_only_select_shape_plan';
  shapes: ProductionReadOnlySelectShape[];
  requiredDatasetOrder: ProductionReadOnlySelectDataset[];
  safety: {
    readOnlyOnly: true;
    allowsInsert: false;
    allowsUpdate: false;
    allowsDelete: false;
    allowsMigration: false;
    allowsEnvOrDeployChange: false;
    executesSqlInAppRuntime: false;
  };
  forbiddenSql: string[];
}

const SHAPES: ProductionReadOnlySelectShape[] = [
  {
    dataset: 'products',
    requiredColumns: ['id', 'name'],
    optionalColumns: ['category', 'targetPetType'],
    adapterTarget: 'ProductionReadOnlyProductRow',
  },
  {
    dataset: 'product_ingredients',
    requiredColumns: ['productId', 'ingredientId', 'position'],
    optionalColumns: [],
    joinsTo: ['products', 'ingredients'],
    adapterTarget: 'ProductionReadOnlyProductIngredientRow',
  },
  {
    dataset: 'ingredients',
    requiredColumns: ['id', 'nameKo'],
    optionalColumns: ['nameEn', 'riskLevel'],
    adapterTarget: 'ProductionReadOnlyIngredientRow',
  },
  {
    dataset: 'computed_signals',
    requiredColumns: ['productId', 'allergyHits', 'score', 'displayScore'],
    optionalColumns: ['rankingPosition'],
    joinsTo: ['products'],
    adapterTarget: 'ProductionReadOnlySignalRow',
  },
];

const FORBIDDEN_SQL = [
  'insert',
  'update',
  'upsert',
  'delete',
  'truncate',
  'alter table',
  'create table',
  'drop table',
  'create index',
  'drop index',
  'rpc mutation',
  'security definer mutation',
];

export function buildProductionReadOnlySelectShapePlan(): ProductionReadOnlySelectShapePlan {
  return {
    planKind: 'production_read_only_select_shape_plan',
    shapes: SHAPES,
    requiredDatasetOrder: ['products', 'ingredients', 'product_ingredients', 'computed_signals'],
    safety: {
      readOnlyOnly: true,
      allowsInsert: false,
      allowsUpdate: false,
      allowsDelete: false,
      allowsMigration: false,
      allowsEnvOrDeployChange: false,
      executesSqlInAppRuntime: false,
    },
    forbiddenSql: FORBIDDEN_SQL,
  };
}

export function requiredColumnsForDataset(dataset: ProductionReadOnlySelectDataset): string[] {
  return buildProductionReadOnlySelectShapePlan().shapes.find((shape) => shape.dataset === dataset)
    ?.requiredColumns ?? [];
}
