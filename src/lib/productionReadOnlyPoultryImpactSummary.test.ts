import { describe, expect, it } from 'vitest';
import { mapProductionPhysicalRowsToAdapterRows } from './productionReadOnlyPhysicalColumnMap';
import { buildProductionReadOnlyPoultrySignalMatrix } from './productionReadOnlyPoultrySignalMatrix';
import { buildProductionReadOnlyPoultryImpactSummary } from './productionReadOnlyPoultryImpactSummary';

function fixtureRows() {
  return mapProductionPhysicalRowsToAdapterRows({
    products: [
      { id: 'p-chicken', name: '치킨 레시피', target_pet_type: 'dog' },
      { id: 'p-duck', name: '오리 레시피', target_pet_type: 'dog' },
      { id: 'p-fat', name: '치킨 팻 레시피', target_pet_type: 'dog' },
      { id: 'p-none', name: '비가금류 레시피', target_pet_type: 'dog' },
      { id: 'p-missing', name: '원료 누락 제품', target_pet_type: 'dog' },
    ],
    productIngredients: [
      { product_id: 'p-chicken', ingredient_id: 'i-chicken', sort_order: 1 },
      { product_id: 'p-duck', ingredient_id: 'i-duck', sort_order: 1 },
      { product_id: 'p-fat', ingredient_id: 'i-fat', sort_order: 1 },
      { product_id: 'p-none', ingredient_id: 'i-beef', sort_order: 1 },
    ],
    ingredients: [
      { id: 'i-chicken', name_ko: '닭고기', risk_level: 'safe' },
      { id: 'i-duck', name_ko: '오리고기', risk_level: 'safe' },
      { id: 'i-fat', name_ko: '닭지방', risk_level: 'safe' },
      { id: 'i-beef', name_ko: '소고기', risk_level: 'safe' },
    ],
  });
}

describe('production read-only poultry impact summary', () => {
  it('summarizes HARD, caution-only, unaffected, and incomplete products by profile', () => {
    const summary = buildProductionReadOnlyPoultryImpactSummary(
      buildProductionReadOnlyPoultrySignalMatrix(fixtureRows()),
    );
    const chicken = summary.profiles.find((profile) => profile.profileId === 'chicken')!;

    expect(chicken.products).toBe(5);
    expect(chicken.computedProducts).toBe(4);
    expect(chicken.incompleteProducts).toBe(1);
    expect(chicken.hardProducts).toBe(1);
    expect(chicken.cautionOnlyProducts).toBe(2);
    expect(chicken.noSignalComputedProducts).toBe(1);
    expect(chicken.maxCautionPenalty).toBe(8);
  });

  it('places HARD products before caution-only products in the affected review list', () => {
    const summary = buildProductionReadOnlyPoultryImpactSummary(
      buildProductionReadOnlyPoultrySignalMatrix(fixtureRows()),
    );
    const chicken = summary.profiles.find((profile) => profile.profileId === 'chicken')!;

    expect(chicken.affectedProducts.map((row) => row.productId)).toEqual([
      'p-chicken',
      'p-duck',
      'p-fat',
    ]);
    expect(chicken.affectedProducts.map((row) => row.signal)).toEqual([
      'hard',
      'caution',
      'caution',
    ]);
  });

  it('marks the report not-ready when production source data is incomplete and explains why', () => {
    const summary = buildProductionReadOnlyPoultryImpactSummary(
      buildProductionReadOnlyPoultrySignalMatrix(fixtureRows()),
    );

    expect(summary.dataQuality.reportReady).toBe(false);
    expect(summary.dataQuality.incompleteMatrixRows).toBe(4);
    expect(summary.dataQuality.productsMissingIngredientLinks).toBe(1);
    expect(summary.dataQuality.warnings.join(' ')).toContain('원료 데이터가 불완전');
    expect(summary.dataQuality.warnings.join(' ')).toContain('연결된 원료 행이 없');
  });

  it('preserves all four profile identities even when the export contains zero products', () => {
    const emptyMatrix = buildProductionReadOnlyPoultrySignalMatrix({
      products: [],
      productIngredients: [],
      ingredients: [],
      signals: [],
    });
    const summary = buildProductionReadOnlyPoultryImpactSummary(emptyMatrix);

    expect(summary.profiles.map((profile) => [profile.profileId, profile.allergyLabel])).toEqual([
      ['chicken', '닭'],
      ['duck', '오리'],
      ['turkey', '칠면조'],
      ['poultry', '가금류'],
    ]);
    expect(summary.profiles.every((profile) => profile.products === 0)).toBe(true);
  });

  it('does not authorize any production or runtime change', () => {
    const summary = buildProductionReadOnlyPoultryImpactSummary(
      buildProductionReadOnlyPoultrySignalMatrix(fixtureRows()),
    );

    expect(summary.safety).toEqual({
      readOnlyOnly: true,
      executesSql: false,
      usesSupabaseClient: false,
      mutatesProductionRows: false,
      changesRuntimePolicy: false,
      authorizesProductionChange: false,
      allowsMigration: false,
      allowsEnvOrDeployChange: false,
    });
  });
});
