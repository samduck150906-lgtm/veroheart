import type { ProductionReadOnlySignalRow } from './productionReadOnlyRowAdapter';
import {
  mapProductionPhysicalRowsToAdapterRows,
  type PhysicalIngredientRow,
  type PhysicalProductIngredientRow,
  type PhysicalProductRow,
} from './productionReadOnlyPhysicalColumnMap';

export interface ProductionReadOnlyJoinedExportRow {
  product_id: string;
  product_name: string;
  main_category?: string | null;
  target_pet_type?: string | null;
  ingredient_id?: string | null;
  sort_order?: number | null;
  ingredient_name_ko?: string | null;
  ingredient_name_en?: string | null;
  ingredient_risk_level?: string | null;
}

export interface ProductionReadOnlyJoinedExportReport {
  adapterRows: ReturnType<typeof mapProductionPhysicalRowsToAdapterRows>;
  summary: {
    joinedRowsRead: number;
    uniqueProducts: number;
    uniqueIngredients: number;
    productIngredientLinks: number;
    rowsWithoutIngredientLink: number;
    linkedRowsMissingIngredientName: number;
  };
  safety: {
    readOnlyOnly: true;
    executesSql: false;
    usesSupabaseClient: false;
    mutatesProductionRows: false;
    allowsMigration: false;
    allowsEnvOrDeployChange: false;
  };
}

function dedupeById<T extends { id: string }>(rows: T[]): T[] {
  return Array.from(new Map(rows.map((row) => [row.id, row])).values());
}

function linkKey(row: PhysicalProductIngredientRow): string {
  return `${row.product_id}:${row.ingredient_id}`;
}

export function buildProductionReadOnlyJoinedExportReport(
  rows: ProductionReadOnlyJoinedExportRow[],
  signals: ProductionReadOnlySignalRow[] = [],
): ProductionReadOnlyJoinedExportReport {
  const products: PhysicalProductRow[] = dedupeById(
    rows.map((row) => ({
      id: row.product_id,
      name: row.product_name,
      main_category: row.main_category ?? null,
      target_pet_type: row.target_pet_type ?? null,
    })),
  );

  const productIngredients = Array.from(
    new Map(
      rows
        .filter((row) => Boolean(row.ingredient_id))
        .map((row) => {
          const link: PhysicalProductIngredientRow = {
            product_id: row.product_id,
            ingredient_id: row.ingredient_id as string,
            sort_order: row.sort_order ?? 0,
          };
          return [linkKey(link), link] as const;
        }),
    ).values(),
  );

  const ingredients: PhysicalIngredientRow[] = dedupeById(
    rows
      .filter((row) => Boolean(row.ingredient_id) && Boolean(row.ingredient_name_ko))
      .map((row) => ({
        id: row.ingredient_id as string,
        name_ko: row.ingredient_name_ko as string,
        name_en: row.ingredient_name_en ?? null,
        risk_level: row.ingredient_risk_level ?? null,
      })),
  );

  const rowsWithoutIngredientLink = rows.filter((row) => !row.ingredient_id).length;
  const linkedRowsMissingIngredientName = rows.filter(
    (row) => Boolean(row.ingredient_id) && !row.ingredient_name_ko,
  ).length;

  return {
    adapterRows: mapProductionPhysicalRowsToAdapterRows({
      products,
      productIngredients,
      ingredients,
      signals,
    }),
    summary: {
      joinedRowsRead: rows.length,
      uniqueProducts: products.length,
      uniqueIngredients: ingredients.length,
      productIngredientLinks: productIngredients.length,
      rowsWithoutIngredientLink,
      linkedRowsMissingIngredientName,
    },
    safety: {
      readOnlyOnly: true,
      executesSql: false,
      usesSupabaseClient: false,
      mutatesProductionRows: false,
      allowsMigration: false,
      allowsEnvOrDeployChange: false,
    },
  };
}
