import { describe, expect, it } from 'vitest';
import { buildProductionReadOnlySnapshotReport } from './productionReadOnlyRowAdapter';

describe('production read-only row adapter', () => {
  it('adapts selected production-like rows into impact snapshot rows without mutation', () => {
    const report = buildProductionReadOnlySnapshotReport({
      products: [
        { id: 'p1', name: 'Chicken fixture food' },
        { id: 'p2', name: 'Unknown byproduct fixture food' },
      ],
      productIngredients: [
        { productId: 'p1', ingredientId: 'i2', position: 2 },
        { productId: 'p1', ingredientId: 'i1', position: 1 },
        { productId: 'p2', ingredientId: 'i3', position: 1 },
      ],
      ingredients: [
        { id: 'i1', nameKo: '닭고기' },
        { id: 'i2', nameKo: '계육분' },
        { id: 'i3', nameKo: '동물성부산물' },
      ],
      signals: [
        { productId: 'p1', allergyHits: ['닭'], score: 0, displayScore: 0, rankingPosition: 2 },
        { productId: 'p2', allergyHits: [], score: 70, displayScore: 70, rankingPosition: 1 },
      ],
    });

    expect(report.rows).toEqual([
      {
        productId: 'p1',
        productName: 'Chicken fixture food',
        ingredientNames: ['닭고기', '계육분'],
        allergyHits: ['닭'],
        score: 0,
        displayScore: 0,
        rankingPosition: 2,
      },
      {
        productId: 'p2',
        productName: 'Unknown byproduct fixture food',
        ingredientNames: ['동물성부산물'],
        allergyHits: [],
        score: 70,
        displayScore: 70,
        rankingPosition: 1,
      },
    ]);
    expect(report.safety).toEqual({
      readOnly: true,
      mutatesProductionRows: false,
      allowsSqlMigration: false,
      allowsEnvOrDeployChange: false,
    });
  });

  it('summarizes missing read-only joins without guessing or writing fallback rows', () => {
    const report = buildProductionReadOnlySnapshotReport({
      products: [
        { id: 'p1', name: 'Missing ingredient fixture' },
        { id: 'p2', name: 'Missing signal fixture' },
      ],
      productIngredients: [{ productId: 'p1', ingredientId: 'missing-ingredient', position: 1 }],
      ingredients: [],
      signals: [{ productId: 'p1', allergyHits: [], score: 50, displayScore: 50 }],
    });

    expect(report.summary).toEqual({
      productsRead: 2,
      productIngredientRowsRead: 1,
      ingredientsRead: 0,
      productsWithMissingSignal: 1,
      productsWithMissingIngredientRows: 1,
      productIngredientRowsWithMissingIngredient: 1,
    });
    expect(report.rows.find((row) => row.productId === 'p1')?.ingredientNames).toEqual([]);
    expect(report.rows.find((row) => row.productId === 'p2')?.score).toBe(0);
  });
});
