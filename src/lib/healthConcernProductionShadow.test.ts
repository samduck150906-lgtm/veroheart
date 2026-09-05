import { describe, expect, it } from 'vitest';
import type { ProductionReadOnlyJoinedExportRow } from './productionReadOnlyJoinedExport';
import {
  adaptHealthConcernProductionShadowProducts,
  buildHealthConcernProductionShadowExecutionReport,
} from './healthConcernProductionShadow';

function row(overrides: Partial<ProductionReadOnlyJoinedExportRow> = {}): ProductionReadOnlyJoinedExportRow {
  return {
    product_id: 'p1',
    product_name: 'Supplied product',
    main_category: 'food',
    target_pet_type: 'dog',
    ingredient_id: 'i1',
    sort_order: 1,
    ingredient_name_ko: '글루코사민',
    ingredient_name_en: 'glucosamine',
    ingredient_risk_level: 'safe',
    ...overrides,
  };
}

describe('health-concern production shadow adapter', () => {
  it('preserves supplied product and ingredient evidence without inventing health fields', () => {
    const report = adaptHealthConcernProductionShadowProducts([
      row({ ingredient_id: 'i2', sort_order: 2, ingredient_name_ko: '두 번째', ingredient_name_en: null, ingredient_risk_level: 'caution' }),
      row(),
    ]);
    expect(report.products).toEqual([{
      id: 'p1',
      brand: '',
      name: 'Supplied product',
      category: 'food',
      mainCategory: 'food',
      targetPetType: 'dog',
      imageUrl: '',
      ingredients: [
        { id: 'i1', nameKo: '글루코사민', nameEn: 'glucosamine', purpose: '', riskLevel: 'safe' },
        { id: 'i2', nameKo: '두 번째', nameEn: '', purpose: '', riskLevel: 'caution' },
      ],
      reviewsCount: 0,
      averageRating: 0,
    }]);
    expect(report.products[0]).not.toHaveProperty('healthConcerns');
    expect(report.products[0]).not.toHaveProperty('formulation');
    expect(report.products[0]).not.toHaveProperty('guaranteedAnalysis');
    expect(report.products[0]).not.toHaveProperty('caloriesPer100g');
  });

  it('preserves a missing ingredient array and omits invalid species', () => {
    const report = adaptHealthConcernProductionShadowProducts([row({
      product_id: 'missing',
      main_category: null,
      target_pet_type: 'bird',
      ingredient_id: null,
      sort_order: null,
      ingredient_name_ko: null,
      ingredient_name_en: null,
      ingredient_risk_level: null,
    })]);
    expect(report.products[0].ingredients).toBeUndefined();
    expect(report.products[0].category).toBe('');
    expect(report.products[0]).not.toHaveProperty('mainCategory');
    expect(report.products[0]).not.toHaveProperty('targetPetType');
    expect(report.summary.productsWithoutIngredientLinks).toBe(1);
    expect(report.summary.productsWithInvalidTargetSpecies).toBe(1);
  });

  it('rejects product, ingredient, order, and mixed-link conflicts instead of choosing a winner', () => {
    const report = adaptHealthConcernProductionShadowProducts([
      row(),
      row({ product_name: 'Conflicting name', sort_order: 2, ingredient_name_ko: 'Conflicting ingredient' }),
      row({ product_id: 'p2' }),
      row({ product_id: 'p2', ingredient_id: null, sort_order: null, ingredient_name_ko: null, ingredient_name_en: null, ingredient_risk_level: null }),
    ]);
    expect(report.products).toEqual([]);
    expect(report.rejectedProducts).toEqual([
      {
        productId: 'p1',
        codes: ['conflicting_ingredient_metadata', 'conflicting_ingredient_order', 'conflicting_product_metadata'],
      },
      {
        productId: 'p2',
        codes: ['conflicting_ingredient_metadata', 'mixed_missing_and_present_ingredient_links'],
      },
    ]);
  });

  it('rejects linked ingredients whose name or risk cannot be represented truthfully', () => {
    const report = adaptHealthConcernProductionShadowProducts([
      row({ product_id: 'missing-name', ingredient_id: 'i-missing-name', ingredient_name_ko: null }),
      row({ product_id: 'invalid-risk', ingredient_id: 'i-invalid-risk', ingredient_risk_level: 'unknown' }),
      row({ product_id: 'missing-risk', ingredient_id: 'i-missing-risk', ingredient_risk_level: null }),
    ]);
    expect(report.summary.productsRejected).toBe(3);
    expect(report.rejectedProducts).toEqual([
      { productId: 'invalid-risk', codes: ['linked_ingredient_risk_missing_or_invalid'] },
      { productId: 'missing-name', codes: ['linked_ingredient_name_missing'] },
      { productId: 'missing-risk', codes: ['linked_ingredient_risk_missing_or_invalid'] },
    ]);
  });

  it('is deterministic, non-mutating, and composes only with the existing shadow report', () => {
    const source = [row(), row({
      product_id: 'p2',
      product_name: 'No ingredient data',
      target_pet_type: 'cat',
      ingredient_id: null,
      sort_order: null,
      ingredient_name_ko: null,
      ingredient_name_en: null,
      ingredient_risk_level: null,
    })];
    const before = structuredClone(source);
    const first = buildHealthConcernProductionShadowExecutionReport(source);
    const second = buildHealthConcernProductionShadowExecutionReport(source);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    expect(source).toEqual(before);
    expect(first.adapter.summary.productsAdapted).toBe(2);
    expect(first.shadow.summary.matrixRowCount).toBe(18);
    expect(first.shadow.summary.blockedUnrecognizedRows).toBe(0);
    expect(first.shadow.summary.invariantViolations).toEqual([]);
    expect(first.safety).toEqual({
      localCopiedDataOnly: true,
      readOnlyOnly: true,
      changesRuntimeScore: false,
      changesRuntimeRanking: false,
      authorizesRuntimeActivation: false,
    });
  });
});
