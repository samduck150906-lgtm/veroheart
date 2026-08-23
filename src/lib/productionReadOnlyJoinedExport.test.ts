import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildProductionReadOnlyJoinedExportReport } from './productionReadOnlyJoinedExport';

function readExportSql(): string {
  return readFileSync(
    fileURLToPath(
      new URL('../../supabase/tests/manual/production_read_only_poultry_impact_export.sql', import.meta.url),
    ),
    'utf8',
  );
}

function executableSql(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--.*$/gm, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

describe('production read-only joined export', () => {
  it('keeps the manual export to one SELECT-only statement', () => {
    const sql = executableSql(readExportSql());
    const withoutTrailingSemicolon = sql.replace(/;\s*$/, '');

    expect(sql.startsWith('select ')).toBe(true);
    expect(withoutTrailingSemicolon).not.toContain(';');
    expect(sql).not.toMatch(
      /\b(insert|update|upsert|delete|merge|truncate|alter|create|drop|grant|revoke|call|do|begin|commit|rollback)\b/,
    );
  });

  it('selects only the physical tables and columns required by the read-only adapter boundary', () => {
    const sql = executableSql(readExportSql());

    for (const table of ['public.products', 'public.product_ingredients', 'public.ingredients']) {
      expect(sql).toContain(table);
    }
    for (const column of [
      'p.id as product_id',
      'p.name as product_name',
      'p.main_category',
      'p.target_pet_type',
      'pi.ingredient_id',
      'pi.sort_order',
      'i.name_ko as ingredient_name_ko',
      'i.name_en as ingredient_name_en',
      'i.risk_level::text as ingredient_risk_level',
    ]) {
      expect(sql).toContain(column);
    }
  });

  it('unflattens a joined export into deduplicated adapter rows without mutating values', () => {
    const report = buildProductionReadOnlyJoinedExportReport([
      {
        product_id: 'p1',
        product_name: '오리 레시피',
        main_category: '건식사료',
        target_pet_type: 'dog',
        ingredient_id: 'i1',
        sort_order: 1,
        ingredient_name_ko: '오리고기',
        ingredient_name_en: 'duck',
        ingredient_risk_level: 'safe',
      },
      {
        product_id: 'p1',
        product_name: '오리 레시피',
        main_category: '건식사료',
        target_pet_type: 'dog',
        ingredient_id: 'i2',
        sort_order: 2,
        ingredient_name_ko: '닭지방',
        ingredient_name_en: 'chicken fat',
        ingredient_risk_level: 'safe',
      },
      {
        product_id: 'p2',
        product_name: '원료 미등록 제품',
        main_category: '건식사료',
        target_pet_type: 'dog',
        ingredient_id: null,
        sort_order: null,
        ingredient_name_ko: null,
      },
    ]);

    expect(report.summary).toEqual({
      joinedRowsRead: 3,
      uniqueProducts: 2,
      uniqueIngredients: 2,
      productIngredientLinks: 2,
      rowsWithoutIngredientLink: 1,
      linkedRowsMissingIngredientName: 0,
    });
    expect(report.adapterRows.products.map((row) => row.id)).toEqual(['p1', 'p2']);
    expect(report.adapterRows.productIngredients).toEqual([
      { productId: 'p1', ingredientId: 'i1', position: 1 },
      { productId: 'p1', ingredientId: 'i2', position: 2 },
    ]);
    expect(report.adapterRows.ingredients.map((row) => row.nameKo)).toEqual(['오리고기', '닭지방']);
  });

  it('flags broken joined rows instead of silently inventing missing ingredient names', () => {
    const report = buildProductionReadOnlyJoinedExportReport([
      {
        product_id: 'p1',
        product_name: '깨진 링크 fixture',
        ingredient_id: 'missing-i1',
        sort_order: 1,
        ingredient_name_ko: null,
      },
    ]);

    expect(report.summary.linkedRowsMissingIngredientName).toBe(1);
    expect(report.adapterRows.productIngredients).toHaveLength(1);
    expect(report.adapterRows.ingredients).toHaveLength(0);
    expect(report.safety.mutatesProductionRows).toBe(false);
  });
});
