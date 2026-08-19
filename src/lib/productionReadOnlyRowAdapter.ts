import type { AnimalIngredientImpactSnapshotRow } from './animalIngredientImpactDiffHarness';

export interface ProductionReadOnlyProductRow {
  id: string;
  name: string;
  category?: string | null;
  targetPetType?: string | null;
}

export interface ProductionReadOnlyProductIngredientRow {
  productId: string;
  ingredientId: string;
  position: number;
}

export interface ProductionReadOnlyIngredientRow {
  id: string;
  nameKo: string;
  nameEn?: string | null;
  riskLevel?: string | null;
}

export interface ProductionReadOnlySignalRow {
  productId: string;
  allergyHits: string[];
  score: number;
  displayScore: number;
  rankingPosition?: number | null;
}

export interface ProductionReadOnlyRows {
  products: ProductionReadOnlyProductRow[];
  productIngredients: ProductionReadOnlyProductIngredientRow[];
  ingredients: ProductionReadOnlyIngredientRow[];
  signals: ProductionReadOnlySignalRow[];
}

export interface ProductionReadOnlyRowAdapterReport {
  rows: AnimalIngredientImpactSnapshotRow[];
  summary: {
    productsRead: number;
    productIngredientRowsRead: number;
    ingredientsRead: number;
    productsWithMissingSignal: number;
    productsWithMissingIngredientRows: number;
    productIngredientRowsWithMissingIngredient: number;
  };
  safety: {
    readOnly: true;
    mutatesProductionRows: false;
    allowsSqlMigration: false;
    allowsEnvOrDeployChange: false;
  };
}

function byId<T extends { id: string }>(rows: T[]) {
  return new Map(rows.map((row) => [row.id, row]));
}

function signalByProductId(rows: ProductionReadOnlySignalRow[]) {
  return new Map(rows.map((row) => [row.productId, row]));
}

function ingredientNamesForProduct(input: {
  productId: string;
  productIngredients: ProductionReadOnlyProductIngredientRow[];
  ingredientsById: Map<string, ProductionReadOnlyIngredientRow>;
}) {
  return input.productIngredients
    .filter((row) => row.productId === input.productId)
    .sort((a, b) => a.position - b.position)
    .map((row) => input.ingredientsById.get(row.ingredientId)?.nameKo)
    .filter((name): name is string => Boolean(name));
}

export function buildProductionReadOnlySnapshotReport(
  input: ProductionReadOnlyRows,
): ProductionReadOnlyRowAdapterReport {
  const ingredientsById = byId(input.ingredients);
  const signalsByProductId = signalByProductId(input.signals);

  const productIdsWithIngredientRows = new Set(input.productIngredients.map((row) => row.productId));
  const missingIngredientRows = input.productIngredients.filter(
    (row) => !ingredientsById.has(row.ingredientId),
  );

  const rows = input.products.map((product): AnimalIngredientImpactSnapshotRow => {
    const signal = signalsByProductId.get(product.id);
    return {
      productId: product.id,
      productName: product.name,
      ingredientNames: ingredientNamesForProduct({
        productId: product.id,
        productIngredients: input.productIngredients,
        ingredientsById,
      }),
      allergyHits: signal?.allergyHits ?? [],
      score: signal?.score ?? 0,
      displayScore: signal?.displayScore ?? 0,
      rankingPosition: signal?.rankingPosition ?? undefined,
    };
  });

  return {
    rows,
    summary: {
      productsRead: input.products.length,
      productIngredientRowsRead: input.productIngredients.length,
      ingredientsRead: input.ingredients.length,
      productsWithMissingSignal: input.products.filter((product) => !signalsByProductId.has(product.id)).length,
      productsWithMissingIngredientRows: input.products.filter(
        (product) => !productIdsWithIngredientRows.has(product.id),
      ).length,
      productIngredientRowsWithMissingIngredient: missingIngredientRows.length,
    },
    safety: {
      readOnly: true,
      mutatesProductionRows: false,
      allowsSqlMigration: false,
      allowsEnvOrDeployChange: false,
    },
  };
}
