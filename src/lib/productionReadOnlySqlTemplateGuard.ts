import {
  buildProductionReadOnlySelectShapePlan,
  type ProductionReadOnlySelectDataset,
} from './productionReadOnlySelectShape';

export interface ProductionReadOnlySqlTemplate {
  templateId: string;
  dataset: ProductionReadOnlySelectDataset;
  sql: string;
  requiredColumns: string[];
  safety: {
    readOnlyOnly: true;
    executionApproved: false;
    appRuntimeApproved: false;
    mutationApproved: false;
  };
}

export interface ProductionReadOnlySqlTemplateValidation {
  templateId: string;
  dataset: ProductionReadOnlySelectDataset;
  valid: boolean;
  missingRequiredColumns: string[];
  forbiddenTermsFound: string[];
  startsWithSelect: boolean;
  hasSingleStatement: boolean;
}

export interface ProductionReadOnlySqlTemplateGuardReport {
  reportKind: 'production_read_only_sql_template_guard';
  templates: ProductionReadOnlySqlTemplate[];
  validations: ProductionReadOnlySqlTemplateValidation[];
  summary: {
    templatesChecked: number;
    validTemplates: number;
    invalidTemplates: number;
    forbiddenFindings: number;
  };
  safety: {
    executesSql: false;
    usesSupabaseClient: false;
    allowsMutation: false;
    allowsMigration: false;
    allowsEnvOrDeployChange: false;
    appRuntimeApproved: false;
  };
}

const FORBIDDEN_TERMS = [
  'insert',
  'update',
  'upsert',
  'delete',
  'truncate',
  'alter table',
  'create table',
  'drop table',
  'create index',
  'drop index',
  'grant',
  'revoke',
  'security definer',
  'perform ',
  'call ',
];

function normalizeSql(sql: string): string {
  return sql.replace(/\s+/g, ' ').trim().toLowerCase();
}

function hasRequiredColumn(sql: string, column: string): boolean {
  const normalized = normalizeSql(sql);
  return normalized.includes(column.toLowerCase());
}

function hasSingleStatement(sql: string): boolean {
  const withoutTrailingSemicolon = sql.trim().replace(/;$/, '');
  return !withoutTrailingSemicolon.includes(';');
}

function forbiddenTermsFound(sql: string): string[] {
  const normalized = normalizeSql(sql);
  return FORBIDDEN_TERMS.filter((term) => normalized.includes(term));
}

export const PRODUCTION_READ_ONLY_SQL_TEMPLATES: ProductionReadOnlySqlTemplate[] = [
  {
    templateId: 'products-readonly-select',
    dataset: 'products',
    sql: 'select id, name, category, target_pet_type as targetPetType from products order by id limit :limit',
    requiredColumns: ['id', 'name'],
    safety: {
      readOnlyOnly: true,
      executionApproved: false,
      appRuntimeApproved: false,
      mutationApproved: false,
    },
  },
  {
    templateId: 'ingredients-readonly-select',
    dataset: 'ingredients',
    sql: 'select id, name_ko as nameKo, name_en as nameEn, risk_level as riskLevel from ingredients order by id limit :limit',
    requiredColumns: ['id', 'nameKo'],
    safety: {
      readOnlyOnly: true,
      executionApproved: false,
      appRuntimeApproved: false,
      mutationApproved: false,
    },
  },
  {
    templateId: 'product-ingredients-readonly-select',
    dataset: 'product_ingredients',
    sql: 'select product_id as productId, ingredient_id as ingredientId, position from product_ingredients order by product_id, position limit :limit',
    requiredColumns: ['productId', 'ingredientId', 'position'],
    safety: {
      readOnlyOnly: true,
      executionApproved: false,
      appRuntimeApproved: false,
      mutationApproved: false,
    },
  },
  {
    templateId: 'computed-signals-placeholder-select',
    dataset: 'computed_signals',
    sql: 'select product_id as productId, allergy_hits as allergyHits, score, display_score as displayScore, ranking_position as rankingPosition from computed_read_only_signals order by product_id limit :limit',
    requiredColumns: ['productId', 'allergyHits', 'score', 'displayScore'],
    safety: {
      readOnlyOnly: true,
      executionApproved: false,
      appRuntimeApproved: false,
      mutationApproved: false,
    },
  },
];

export function validateProductionReadOnlySqlTemplate(
  template: ProductionReadOnlySqlTemplate,
): ProductionReadOnlySqlTemplateValidation {
  const missingRequiredColumns = template.requiredColumns.filter(
    (column) => !hasRequiredColumn(template.sql, column),
  );
  const foundForbiddenTerms = forbiddenTermsFound(template.sql);
  const startsWithSelect = normalizeSql(template.sql).startsWith('select ');
  const singleStatement = hasSingleStatement(template.sql);

  return {
    templateId: template.templateId,
    dataset: template.dataset,
    valid:
      missingRequiredColumns.length === 0 &&
      foundForbiddenTerms.length === 0 &&
      startsWithSelect &&
      singleStatement &&
      template.safety.readOnlyOnly &&
      !template.safety.executionApproved &&
      !template.safety.appRuntimeApproved &&
      !template.safety.mutationApproved,
    missingRequiredColumns,
    forbiddenTermsFound: foundForbiddenTerms,
    startsWithSelect,
    hasSingleStatement: singleStatement,
  };
}

export function buildProductionReadOnlySqlTemplateGuardReport(
  templates: ProductionReadOnlySqlTemplate[] = PRODUCTION_READ_ONLY_SQL_TEMPLATES,
): ProductionReadOnlySqlTemplateGuardReport {
  const selectShapePlan = buildProductionReadOnlySelectShapePlan();
  const requiredColumnsByDataset = new Map(
    selectShapePlan.shapes.map((shape) => [shape.dataset, shape.requiredColumns]),
  );

  const templatesWithShapeColumns = templates.map((template) => ({
    ...template,
    requiredColumns: requiredColumnsByDataset.get(template.dataset) ?? template.requiredColumns,
  }));
  const validations = templatesWithShapeColumns.map(validateProductionReadOnlySqlTemplate);

  return {
    reportKind: 'production_read_only_sql_template_guard',
    templates: templatesWithShapeColumns,
    validations,
    summary: {
      templatesChecked: validations.length,
      validTemplates: validations.filter((validation) => validation.valid).length,
      invalidTemplates: validations.filter((validation) => !validation.valid).length,
      forbiddenFindings: validations.reduce(
        (sum, validation) => sum + validation.forbiddenTermsFound.length,
        0,
      ),
    },
    safety: {
      executesSql: false,
      usesSupabaseClient: false,
      allowsMutation: false,
      allowsMigration: false,
      allowsEnvOrDeployChange: false,
      appRuntimeApproved: false,
    },
  };
}
