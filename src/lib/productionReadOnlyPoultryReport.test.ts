import { describe, expect, it } from 'vitest';
import {
  buildProductionReadOnlyPoultryReport,
  parseProductionReadOnlyPoultryExportJson,
} from './productionReadOnlyPoultryReport';

const rows = [
  {
    product_id: 'p-duck',
    product_name: '오리 레시피',
    main_category: '건식사료',
    target_pet_type: 'dog',
    ingredient_id: 'i-duck',
    sort_order: 1,
    ingredient_name_ko: '오리고기',
    ingredient_name_en: 'duck',
    ingredient_risk_level: 'safe',
  },
  {
    product_id: 'p-chicken',
    product_name: '치킨 레시피',
    main_category: '건식사료',
    target_pet_type: 'dog',
    ingredient_id: 'i-chicken',
    sort_order: 1,
    ingredient_name_ko: '닭고기',
    ingredient_name_en: 'chicken',
    ingredient_risk_level: 'safe',
  },
];

describe('production read-only poultry report', () => {
  it('accepts copied Supabase JSON arrays and API-style data envelopes', () => {
    expect(parseProductionReadOnlyPoultryExportJson(JSON.stringify(rows))).toEqual(rows);
    expect(parseProductionReadOnlyPoultryExportJson({ data: rows })).toEqual(rows);
  });

  it('rejects a malformed row with its exact index', () => {
    expect(() =>
      parseProductionReadOnlyPoultryExportJson([rows[0], { product_id: 'missing-name' }]),
    ).toThrow('row at index 1');
  });

  it('composes the full export-to-impact report without a second policy implementation', () => {
    const report = buildProductionReadOnlyPoultryReport(JSON.stringify(rows));
    const chicken = report.impactSummary.profiles.find(
      (profile) => profile.profileId === 'chicken',
    )!;

    expect(report.source).toEqual({
      format: 'supabase_joined_export_json',
      rowsReceived: 2,
    });
    expect(report.joinedExport.summary.uniqueProducts).toBe(2);
    expect(report.signalMatrix.summary.matrixRows).toBe(8);
    expect(chicken.hardProducts).toBe(1);
    expect(chicken.cautionOnlyProducts).toBe(1);
    expect(chicken.affectedProducts.map((row) => row.productId)).toEqual([
      'p-chicken',
      'p-duck',
    ]);
    expect(report.impactSummary.dataQuality.reportReady).toBe(true);
  });

  it('keeps the composed report offline, read-only, and non-authorizing', () => {
    const report = buildProductionReadOnlyPoultryReport(rows);

    expect(report.safety).toEqual({
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
