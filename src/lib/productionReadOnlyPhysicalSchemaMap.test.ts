import { describe, expect, it } from 'vitest';
import {
  PRODUCTION_COMPUTED_SIGNALS_CONTRACT,
  PRODUCTION_PHYSICAL_SCHEMA_SAFETY,
  PRODUCTION_READ_ONLY_PHYSICAL_SCHEMA,
  mapPhysicalIngredientRow,
  mapPhysicalProductIngredientRow,
  mapPhysicalProductRow,
} from './productionReadOnlyPhysicalSchemaMap';

describe('production read-only physical schema map', () => {
  it('maps only the three physical production tables', () => {
    expect(PRODUCTION_READ_ONLY_PHYSICAL_SCHEMA.map((entry) => entry.tableName)).toEqual([
      'products',
      'product_ingredients',
      'ingredients',
    ]);
    expect(PRODUCTION_READ_ONLY_PHYSICAL_SCHEMA.every((entry) => entry.sourceKind === 'physical_table')).toBe(true);
  });

  it('maps snake_case product columns to adapter fields', () => {
    expect(
      mapPhysicalProductRow({
        id: 'p1',
        name: '테스트 사료',
        product_type: 'food',
        target_pet_type: 'dog',
      }),
    ).toEqual({ id: 'p1', name: '테스트 사료', category: 'food', targetPetType: 'dog' });
  });

  it('maps product_ingredients sort_order to position', () => {
    expect(
      mapPhysicalProductIngredientRow({
        product_id: 'p1',
        ingredient_id: 'i1',
        sort_order: 3,
      }),
    ).toEqual({ productId: 'p1', ingredientId: 'i1', position: 3 });
  });

  it('maps ingredient snake_case fields without inventing values', () => {
    expect(
      mapPhysicalIngredientRow({
        id: 'i1',
        name_ko: '계육분',
        name_en: 'chicken meal',
        risk_level: 'safe',
      }),
    ).toEqual({ id: 'i1', nameKo: '계육분', nameEn: 'chicken meal', riskLevel: 'safe' });
  });

  it('requires computed signals to be derived locally rather than selected from production', () => {
    expect(PRODUCTION_COMPUTED_SIGNALS_CONTRACT.sourceKind).toBe('derived_runtime');
    expect(PRODUCTION_COMPUTED_SIGNALS_CONTRACT.physicalTable).toBeNull();
    expect(PRODUCTION_COMPUTED_SIGNALS_CONTRACT.maySelectFromProduction).toBe(false);
    expect(PRODUCTION_COMPUTED_SIGNALS_CONTRACT.fields).toContain('allergyHits');
    expect(PRODUCTION_COMPUTED_SIGNALS_CONTRACT.fields).toContain('displayScore');
  });

  it('keeps the bridge non-executable and non-mutating', () => {
    expect(PRODUCTION_PHYSICAL_SCHEMA_SAFETY).toEqual({
      readOnly: true,
      executesSql: false,
      usesSupabaseClient: false,
      allowsMutation: false,
      allowsMigration: false,
      allowsEnvOrDeployChange: false,
      computedSignalsAreDerived: true,
    });
  });
});
