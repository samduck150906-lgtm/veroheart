import { describe, expect, it } from 'vitest';
import {
  PRODUCTION_READ_ONLY_SQL_TEMPLATES,
  buildProductionReadOnlySqlTemplateGuardReport,
  validateProductionReadOnlySqlTemplate,
  type ProductionReadOnlySqlTemplate,
} from './productionReadOnlySqlTemplateGuard';

describe('production read-only sql template guard', () => {
  it('keeps bundled templates select-shaped and non-executable', () => {
    const report = buildProductionReadOnlySqlTemplateGuardReport();

    expect(report.reportKind).toBe('production_read_only_sql_template_guard');
    expect(report.summary).toEqual({
      templatesChecked: 4,
      validTemplates: 4,
      invalidTemplates: 0,
      forbiddenFindings: 0,
    });
    expect(report.safety).toEqual({
      executesSql: false,
      usesSupabaseClient: false,
      allowsMutation: false,
      allowsMigration: false,
      allowsEnvOrDeployChange: false,
      appRuntimeApproved: false,
    });

    for (const template of report.templates) {
      expect(template.safety).toEqual({
        readOnlyOnly: true,
        executionApproved: false,
        appRuntimeApproved: false,
        mutationApproved: false,
        containsExecutableSqlText: false,
      });
    }
  });

  it('aligns required columns with the select shape plan', () => {
    const report = buildProductionReadOnlySqlTemplateGuardReport();
    const byDataset = new Map(report.templates.map((template) => [template.dataset, template.requiredColumns]));

    expect(byDataset.get('products')).toEqual(['id', 'name']);
    expect(byDataset.get('ingredients')).toEqual(['id', 'nameKo']);
    expect(byDataset.get('product_ingredients')).toEqual(['productId', 'ingredientId', 'position']);
    expect(byDataset.get('computed_signals')).toEqual([
      'productId',
      'allergyHits',
      'score',
      'displayScore',
    ]);
  });

  it('rejects mutation or schema-changing terms inside structured shapes', () => {
    const unsafeTemplate: ProductionReadOnlySqlTemplate = {
      ...PRODUCTION_READ_ONLY_SQL_TEMPLATES[0],
      templateId: 'unsafe-update-shape',
      selectColumns: ['id', 'update'],
    };

    const validation = validateProductionReadOnlySqlTemplate(unsafeTemplate);

    expect(validation.valid).toBe(false);
    expect(validation.forbiddenTermsFound).toEqual(['update']);
  });

  it('rejects templates missing required adapter columns', () => {
    const incompleteTemplate: ProductionReadOnlySqlTemplate = {
      ...PRODUCTION_READ_ONLY_SQL_TEMPLATES[2],
      templateId: 'incomplete-product-ingredients-shape',
      selectColumns: ['productId', 'ingredientId'],
    };

    const validation = validateProductionReadOnlySqlTemplate(incompleteTemplate);

    expect(validation.valid).toBe(false);
    expect(validation.missingRequiredColumns).toEqual(['position']);
  });

  it('rejects executable or runtime-approved shapes', () => {
    const executableTemplate: ProductionReadOnlySqlTemplate = {
      ...PRODUCTION_READ_ONLY_SQL_TEMPLATES[0],
      templateId: 'runtime-approved-shape',
      safety: {
        readOnlyOnly: true,
        executionApproved: false,
        appRuntimeApproved: false,
        mutationApproved: false,
        containsExecutableSqlText: true,
      },
    };

    const validation = validateProductionReadOnlySqlTemplate(executableTemplate);

    expect(validation.valid).toBe(false);
  });
});
