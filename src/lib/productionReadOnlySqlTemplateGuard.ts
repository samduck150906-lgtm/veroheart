import {
  buildProductionReadOnlySelectShapePlan,
  type ProductionReadOnlySelectDataset,
} from './productionReadOnlySelectShape';

export interface ProductionReadOnlySqlTemplate {
  templateId: string;
  dataset: ProductionReadOnlySelectDataset;
  selectColumns: string[];
  orderBy: string[];
  limitParameter: ':limit';
  requiredColumns: string[];
  safety: {
    readOnlyOnly: true;
    executionApproved: false;
    appRuntimeApproved: false;
    mutationApproved: false;
    containsExecutableSqlText: false;
  };
}

export interface ProductionReadOnlySqlTemplateValidation {
  templateId: string;
  dataset: ProductionReadOnlySelectDataset;
  valid: boolean;
  missingRequiredColumns: string[];
  forbiddenTermsFound: string[];
  hasSelectColumns: boolean;
  hasLimitParameter: boolean;
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
  'perform',
  'call',
];

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

function hasRequiredColumn(columns: string[], column: string): boolean {
  const normalizedColumns = columns.map(normalizeText);
  return normalizedColumns.includes(column.toLowerCase());
}

function forbiddenTermsFound(template: ProductionReadOnlySqlTemplate): string[] {
  const searchable = [
    template.templateId,
    template.dataset,
    ...template.selectColumns,
    ...template.orderBy,
    template.limitParameter,
  ]
    .map(normalizeText)
    .join(' ');

  return FORBIDDEN_TERMS.filter((term) => searchable.includes(term));
}

export const PRODUCTION_READ_ONLY_SQL_TEMPLATES: ProductionReadOnlySqlTemplate[] = [
  {
    templateId: 'products-readonly-select-shape',
    dataset: 'products',
    selectColumns: ['id', 'name', 'category', 'targetPetType'],
    orderBy: ['id'],
    limitParameter: ':limit',
    requiredColumns: ['id', 'name'],
    safety: {
      readOnlyOnly: true,
      executionApproved: false,
      appRuntimeApproved: false,
      mutationApproved: false,
      containsExecutableSqlText: false,
    },
  },
  {
    templateId: 'ingredients-readonly-select-shape',
    dataset: 'ingredients',
    selectColumns: ['id', 'nameKo', 'nameEn', 'riskLevel'],
    orderBy: ['id'],
    limitParameter: ':limit',
    requiredColumns: ['id', 'nameKo'],
    safety: {
      readOnlyOnly: true,
      executionApproved: false,
      appRuntimeApproved: false,
      mutationApproved: false,
      containsExecutableSqlText: false,
    },
  },
  {
    templateId: 'product-ingredients-readonly-select-shape',
    dataset: 'product_ingredients',
    selectColumns: ['productId', 'ingredientId', 'position'],
    orderBy: ['productId', 'position'],
    limitParameter: ':limit',
    requiredColumns: ['productId', 'ingredientId', 'position'],
    safety: {
      readOnlyOnly: true,
      executionApproved: false,
      appRuntimeApproved: false,
      mutationApproved: false,
      containsExecutableSqlText: false,
    },
  },
  {
    templateId: 'computed-signals-readonly-select-shape',
    dataset: 'computed_signals',
    selectColumns: ['productId', 'allergyHits', 'score', 'displayScore', 'rankingPosition'],
    orderBy: ['productId'],
    limitParameter: ':limit',
    requiredColumns: ['productId', 'allergyHits', 'score', 'displayScore'],
    safety: {
      readOnlyOnly: true,
      executionApproved: false,
      appRuntimeApproved: false,
      mutationApproved: false,
      containsExecutableSqlText: false,
    },
  },
];

export function validateProductionReadOnlySqlTemplate(
  template: ProductionReadOnlySqlTemplate,
): ProductionReadOnlySqlTemplateValidation {
  const missingRequiredColumns = template.requiredColumns.filter(
    (column) => !hasRequiredColumn(template.selectColumns, column),
  );
  const foundForbiddenTerms = forbiddenTermsFound(template);
  const hasSelectColumns = template.selectColumns.length > 0;
  const hasLimitParameter = template.limitParameter === ':limit';

  return {
    templateId: template.templateId,
    dataset: template.dataset,
    valid:
      missingRequiredColumns.length === 0 &&
      foundForbiddenTerms.length === 0 &&
      hasSelectColumns &&
      hasLimitParameter &&
      template.safety.readOnlyOnly &&
      !template.safety.executionApproved &&
      !template.safety.appRuntimeApproved &&
      !template.safety.mutationApproved &&
      !template.safety.containsExecutableSqlText,
    missingRequiredColumns,
    forbiddenTermsFound: foundForbiddenTerms,
    hasSelectColumns,
    hasLimitParameter,
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
