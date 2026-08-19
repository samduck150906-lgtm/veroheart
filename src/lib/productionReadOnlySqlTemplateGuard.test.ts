import { describe, expect, it } from 'vitest';
import {
  PRODUCTION_READ_ONLY_SQL_TEMPLATES,
  buildProductionReadOnlySqlTemplateGuardReport,
  validateProductionReadOnlySqlTemplate,
  type ProductionReadOnlySqlTemplate,
} from './productionReadOnlySqlTemplateGuard';

describe('production read-only sql template guard', () => {
  it('keeps bundled templates select-only and non-executable', () => {
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

  it('rejects mutation or schema-changing statements', () => {
    const unsafeTemplate: ProductionReadOnlySqlTemplate = {
      ...PRODUCTION_READ_ONLY_SQL_TEMPLATES[0],
      templateId: 'unsafe-update-template',
      sql: 'select id, name from products; update products set name = name',
    };

    const validation = validateProductionReadOnlySqlTemplate(unsafeTemplate);

    expect(validation.valid).toBe(false);
    expect(validation.hasSingleStatement).toBe(false);
    expect(validation.forbiddenTermsFound).toEqual(['update']);
  });

  it('rejects templates missing required adapter columns', () => {
    const incompleteTemplate: ProductionReadOnlySqlTemplate = {
      ...PRODUCTION_READ_ONLY_SQL_TEMPLATES[2],
      templateId: 'incomplete-product-ingredients-template',
      sql: 'select product_id as productId, ingredient_id as ingredientId from product_ingredients',
    };

    const validation = validateProductionReadOnlySqlTemplate(incompleteTemplate);

    expect(validation.valid).toBe(false);
    expect(validation.missingRequiredColumns).toEqual(['position']);
  });

  it('rejects non-select templates even without forbidden mutation terms', () => {
    const nonSelectTemplate: ProductionReadOnlySqlTemplate = {
      ...PRODUCTION_READ_ONLY_SQL_TEMPLATES[0],
      templateId: 'with-template',
      sql: 'with sampled as (select id, name from products) select id, name from sampled',
    };

    const validation = validateProductionReadOnlySqlTemplate(nonSelectTemplate);

    expect(validation.valid).toBe(false);
    expect(validation.startsWithSelect).toBe(false);
  });
});
