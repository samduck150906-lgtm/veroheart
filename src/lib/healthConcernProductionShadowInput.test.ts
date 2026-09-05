import { describe, expect, it } from 'vitest';
import {
  auditHealthConcernProductionShadowInput,
  parseHealthConcernProductionShadowInput,
} from './healthConcernProductionShadowInput';

const validRows = [
  {
    product_id: 'p1',
    product_name: 'Product one',
    main_category: 'food',
    target_pet_type: 'dog',
    ingredient_id: 'i1',
    sort_order: 1,
    ingredient_name_ko: '원료',
    ingredient_name_en: 'ingredient',
    ingredient_risk_level: 'safe',
  },
  {
    product_id: 'p2',
    product_name: 'Same display name',
    main_category: null,
    target_pet_type: null,
    ingredient_id: null,
    sort_order: null,
    ingredient_name_ko: null,
    ingredient_name_en: null,
    ingredient_risk_level: null,
  },
];

describe('health-concern production shadow input contract', () => {
  it('accepts copied arrays and data envelopes without mutating input', () => {
    const source = structuredClone(validRows);
    const before = structuredClone(source);
    expect(parseHealthConcernProductionShadowInput(source)).toBe(source);
    expect(parseHealthConcernProductionShadowInput({ data: source })).toBe(source);
    expect(parseHealthConcernProductionShadowInput(JSON.stringify(source))).toEqual(source);
    expect(source).toEqual(before);
  });

  it('rejects malformed rows with the exact source index', () => {
    expect(() => parseHealthConcernProductionShadowInput([
      validRows[0],
      { ...validRows[1], product_name: null },
    ])).toThrow('row at index 1');
    expect(() => parseHealthConcernProductionShadowInput([
      { ...validRows[0], sort_order: Number.NaN },
    ])).toThrow('row at index 0');
  });

  it('audits conflicts, invalid semantic values, missing links, and unsupported evidence', () => {
    const rows = parseHealthConcernProductionShadowInput([
      validRows[0],
      { ...validRows[0], product_name: 'Conflicting product name', sort_order: 2 },
      { ...validRows[1], product_name: 'Product one', target_pet_type: 'bird' },
      { ...validRows[0], product_id: 'p3', ingredient_risk_level: 'unknown-risk' },
    ]);
    const before = structuredClone(rows);
    const audit = auditHealthConcernProductionShadowInput(rows);

    expect(audit.summary).toMatchObject({
      joinedRows: 4,
      distinctProductIds: 3,
      distinctProductNames: 2,
      distinctIngredientIds: 1,
      distinctProductIngredientLinks: 2,
      rowsWithoutIngredientLinks: 1,
      productNamesSharedAcrossIds: 1,
      productMetadataConflictIds: 1,
      ingredientMetadataConflictIds: 1,
      conflictingProductIngredientLinks: 1,
      invalidTargetSpeciesRows: 1,
      invalidIngredientRiskRows: 1,
    });
    expect(audit.conflicts.productIds).toEqual(['p1']);
    expect(audit.productCounts).toEqual({
      byTargetSpecies: { bird: 1, dog: 2 },
      byCategory: { '<missing>': 1, food: 2 },
    });
    expect(audit.columns.healthEvidence).toEqual({
      health_concerns: false,
      formulation: false,
      guaranteed_analysis: false,
      calories_per_100g: false,
      ingredient_purpose: false,
    });
    expect(rows).toEqual(before);
    expect(audit.safety.authorizesRuntimeActivation).toBe(false);
  });

  it('is byte-equivalent across repeated audits', () => {
    const rows = parseHealthConcernProductionShadowInput(validRows);
    expect(JSON.stringify(auditHealthConcernProductionShadowInput(rows)))
      .toBe(JSON.stringify(auditHealthConcernProductionShadowInput(rows)));
  });
});
