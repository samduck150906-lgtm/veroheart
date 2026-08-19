import { describe, expect, it } from 'vitest';
import {
  buildProductionReadOnlySelectShapePlan,
  requiredColumnsForDataset,
} from './productionReadOnlySelectShape';

describe('production read-only select shape plan', () => {
  it('defines the select rows needed by the read-only row adapter', () => {
    const plan = buildProductionReadOnlySelectShapePlan();

    expect(plan.planKind).toBe('production_read_only_select_shape_plan');
    expect(plan.shapes.map((shape) => shape.dataset)).toEqual([
      'products',
      'product_ingredients',
      'ingredients',
      'computed_signals',
    ]);
    expect(requiredColumnsForDataset('products')).toEqual(['id', 'name']);
    expect(requiredColumnsForDataset('ingredients')).toEqual(['id', 'nameKo']);
    expect(requiredColumnsForDataset('product_ingredients')).toEqual([
      'productId',
      'ingredientId',
      'position',
    ]);
    expect(requiredColumnsForDataset('computed_signals')).toEqual([
      'productId',
      'allergyHits',
      'score',
      'displayScore',
    ]);
  });

  it('maps each dataset to the production read-only adapter target', () => {
    const plan = buildProductionReadOnlySelectShapePlan();
    const byDataset = new Map(plan.shapes.map((shape) => [shape.dataset, shape.adapterTarget]));

    expect(byDataset.get('products')).toBe('ProductionReadOnlyProductRow');
    expect(byDataset.get('product_ingredients')).toBe('ProductionReadOnlyProductIngredientRow');
    expect(byDataset.get('ingredients')).toBe('ProductionReadOnlyIngredientRow');
    expect(byDataset.get('computed_signals')).toBe('ProductionReadOnlySignalRow');
  });

  it('keeps the plan read-only and outside app runtime execution', () => {
    const plan = buildProductionReadOnlySelectShapePlan();

    expect(plan.safety).toEqual({
      readOnlyOnly: true,
      allowsInsert: false,
      allowsUpdate: false,
      allowsDelete: false,
      allowsMigration: false,
      allowsEnvOrDeployChange: false,
      executesSqlInAppRuntime: false,
    });
  });

  it('forbids mutation and schema-changing sql verbs', () => {
    const plan = buildProductionReadOnlySelectShapePlan();

    expect(plan.forbiddenSql).toEqual(
      expect.arrayContaining([
        'insert',
        'update',
        'upsert',
        'delete',
        'alter table',
        'create table',
        'drop table',
      ]),
    );
  });
});
