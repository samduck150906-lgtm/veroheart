import { describe, expect, it } from 'vitest';
import {
  buildProductionPhysicalColumnMapReport,
  mapProductionPhysicalRowsToAdapterRows,
  PRODUCTION_READ_ONLY_PHYSICAL_COLUMN_MAP,
} from './productionReadOnlyPhysicalColumnMap';

describe('production read-only physical column map', () => {
  it('maps actual snake_case production columns into the logical adapter shape', () => {
    const mapped = mapProductionPhysicalRowsToAdapterRows({
      products: [
        { id: 'p1', name: '테스트 사료', main_category: '건식사료', target_pet_type: 'dog' },
      ],
      productIngredients: [
        { product_id: 'p1', ingredient_id: 'i2', sort_order: 2 },
        { product_id: 'p1', ingredient_id: 'i1', sort_order: 1 },
      ],
      ingredients: [
        { id: 'i1', name_ko: '닭고기', name_en: 'chicken', risk_level: 'safe' },
        { id: 'i2', name_ko: '오리고기', name_en: 'duck', risk_level: 'safe' },
      ],
      signals: [
        { productId: 'p1', allergyHits: [], score: 82, displayScore: 82, rankingPosition: 1 },
      ],
    });

    expect(mapped.products).toEqual([
      { id: 'p1', name: '테스트 사료', category: '건식사료', targetPetType: 'dog' },
    ]);
    expect(mapped.productIngredients).toEqual([
      { productId: 'p1', ingredientId: 'i2', position: 2 },
      { productId: 'p1', ingredientId: 'i1', position: 1 },
    ]);
    expect(mapped.ingredients[0]).toEqual({
      id: 'i1', nameKo: '닭고기', nameEn: 'chicken', riskLevel: 'safe',
    });
    expect(mapped.signals[0]?.productId).toBe('p1');
  });

  it('documents the production schema columns that differ from adapter field names', () => {
    const pairs = new Set(
      PRODUCTION_READ_ONLY_PHYSICAL_COLUMN_MAP.map(
        (row) => `${row.physicalColumn ?? 'derived'}->${row.adapterField}`,
      ),
    );

    expect(pairs).toContain('product_id->productId');
    expect(pairs).toContain('ingredient_id->ingredientId');
    expect(pairs).toContain('sort_order->position');
    expect(pairs).toContain('name_ko->nameKo');
    expect(pairs).toContain('name_en->nameEn');
    expect(pairs).toContain('risk_level->riskLevel');
    expect(pairs).toContain('target_pet_type->targetPetType');
  });

  it('keeps computed signals explicitly derived rather than pretending they are a production table', () => {
    const report = buildProductionPhysicalColumnMapReport();
    const signalMappings = report.mappings.filter((row) => row.dataset === 'computed_signals');

    expect(report.derivedDatasets).toEqual(['computed_signals']);
    expect(signalMappings.length).toBeGreaterThan(0);
    expect(signalMappings.every((row) => row.physicalTable === null && row.physicalColumn === null)).toBe(true);
  });

  it('remains a read-only mapping contract with no operational side effects', () => {
    expect(buildProductionPhysicalColumnMapReport().safety).toEqual({
      readOnlyOnly: true,
      executesSql: false,
      usesSupabaseClient: false,
      mutatesProductionRows: false,
      allowsMigration: false,
      allowsEnvOrDeployChange: false,
    });
  });
});
