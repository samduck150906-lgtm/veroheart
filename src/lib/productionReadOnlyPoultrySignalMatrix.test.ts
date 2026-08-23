import { describe, expect, it } from 'vitest';
import { mapProductionPhysicalRowsToAdapterRows } from './productionReadOnlyPhysicalColumnMap';
import { buildProductionReadOnlyPoultrySignalMatrix } from './productionReadOnlyPoultrySignalMatrix';

const rows = mapProductionPhysicalRowsToAdapterRows({
  products: [
    { id: 'p-chicken', name: '치킨', target_pet_type: 'dog' },
    { id: 'p-duck', name: '덕', target_pet_type: 'dog' },
    { id: 'p-fat', name: '치킨 팻', target_pet_type: 'dog' },
    { id: 'p-unknown', name: '언노운', target_pet_type: 'dog' },
    { id: 'p-cat-turkey', name: '캣 터키', target_pet_type: 'cat' },
    { id: 'p-incomplete', name: '리스크 누락', target_pet_type: 'dog' },
  ],
  productIngredients: [
    { product_id: 'p-chicken', ingredient_id: 'i-chicken', sort_order: 1 },
    { product_id: 'p-duck', ingredient_id: 'i-duck', sort_order: 1 },
    { product_id: 'p-fat', ingredient_id: 'i-fat', sort_order: 1 },
    { product_id: 'p-unknown', ingredient_id: 'i-unknown', sort_order: 1 },
    { product_id: 'p-cat-turkey', ingredient_id: 'i-turkey', sort_order: 1 },
    { product_id: 'p-incomplete', ingredient_id: 'i-incomplete', sort_order: 1 },
  ],
  ingredients: [
    { id: 'i-chicken', name_ko: '닭고기', risk_level: 'safe' },
    { id: 'i-duck', name_ko: '오리고기', risk_level: 'safe' },
    { id: 'i-fat', name_ko: '닭지방', risk_level: 'safe' },
    { id: 'i-unknown', name_ko: '동물성부산물', risk_level: 'caution' },
    { id: 'i-turkey', name_ko: '칠면조', risk_level: 'safe' },
    { id: 'i-incomplete', name_ko: '닭고기', risk_level: null },
  ],
});

function matrixRow(productId: string, profileId: 'chicken' | 'duck' | 'turkey' | 'poultry') {
  return buildProductionReadOnlyPoultrySignalMatrix(rows).rows.find(
    (row) => row.productId === productId && row.profileId === profileId,
  )!;
}

describe('production read-only poultry signal matrix', () => {
  it('uses current runtime policy for same-source HARD and cross-poultry caution', () => {
    const chicken = matrixRow('p-chicken', 'chicken');
    const duck = matrixRow('p-duck', 'chicken');

    expect(chicken.hardHits).toEqual(['닭고기']);
    expect(chicken.cautionKinds).toEqual([]);
    expect(chicken.allergyPenalty).toBe(90);
    expect(chicken.displayScore).not.toBeNull();
    expect(chicken.displayScore as number).toBeLessThanOrEqual(9);

    expect(duck.hardHits).toEqual([]);
    expect(duck.cautionKinds).toContain('cross_caution');
    expect(duck.allergyPenalty).toBe(0);
    expect(duck.allergyCautionPenalty).toBe(8);
    expect(duck.displayScore as number).toBeGreaterThan(9);
  });

  it('keeps poultry fat as processing caution and unknown animal byproduct unnamed', () => {
    const fat = matrixRow('p-fat', 'chicken');
    const unknown = matrixRow('p-unknown', 'chicken');

    expect(fat.hardHits).toEqual([]);
    expect(fat.cautionKinds).toContain('processing_caution');
    expect(fat.allergyCautionPenalty).toBe(5);

    expect(unknown.hardHits).toEqual([]);
    expect(unknown.cautionKinds).toEqual([]);
    expect(unknown.allergyPenalty).toBe(0);
    expect(unknown.allergyCautionPenalty).toBe(0);
  });

  it('treats explicit broad poultry allergy as HARD for a named poultry protein', () => {
    const broad = matrixRow('p-duck', 'poultry');

    expect(broad.hardHits).toEqual(['오리고기']);
    expect(broad.cautionKinds).toEqual([]);
    expect(broad.allergyPenalty).toBe(90);
  });

  it('matches the synthetic pet species to cat-target products so species mismatch does not erase allergy analysis', () => {
    const turkeyForChickenAllergy = matrixRow('p-cat-turkey', 'chicken');

    expect(turkeyForChickenAllergy.syntheticSpecies).toBe('Cat');
    expect(turkeyForChickenAllergy.scoreStatus).toBe('computed');
    expect(turkeyForChickenAllergy.cautionKinds).toContain('cross_caution');
    expect(turkeyForChickenAllergy.score).not.toBe(0);
  });

  it('never converts a missing physical risk level into a scoreable safe ingredient', () => {
    const incomplete = matrixRow('p-incomplete', 'chicken');
    const report = buildProductionReadOnlyPoultrySignalMatrix(rows);

    expect(incomplete.hardHits).toEqual(['닭고기']);
    expect(incomplete.scoreStatus).toBe('data_incomplete');
    expect(incomplete.score).toBeNull();
    expect(incomplete.displayScore).toBeNull();
    expect(report.summary.invalidRiskLevelIngredients).toBe(1);
  });

  it('assigns ranking positions only to scoreable rows within each synthetic profile', () => {
    const report = buildProductionReadOnlyPoultrySignalMatrix(rows);
    const chickenRows = report.rows.filter((row) => row.profileId === 'chicken');
    const computedRanks = chickenRows
      .filter((row) => row.scoreStatus === 'computed')
      .map((row) => row.rankingPosition);

    expect(computedRanks.every((rank) => typeof rank === 'number' && rank > 0)).toBe(true);
    expect(matrixRow('p-incomplete', 'chicken').rankingPosition).toBeNull();
  });

  it('remains a pure read-only harness with four fixed poultry profiles', () => {
    const report = buildProductionReadOnlyPoultrySignalMatrix(rows);

    expect(report.summary.productsRead).toBe(6);
    expect(report.summary.profileCount).toBe(4);
    expect(report.summary.matrixRows).toBe(24);
    expect(report.summary.incompleteRows).toBe(4);
    expect(report.safety).toEqual({
      readOnlyOnly: true,
      executesSql: false,
      usesSupabaseClient: false,
      mutatesProductionRows: false,
      changesRuntimePolicy: false,
      allowsMigration: false,
      allowsEnvOrDeployChange: false,
    });
  });
});
