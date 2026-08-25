import {
  buildVeroheartHarnessRunReport,
  type HarnessRunReport,
} from './veroheartHarnessLoop';

export type ProductionReadOnlyDatasetId =
  | 'products'
  | 'product_ingredients'
  | 'ingredients'
  | 'canonical_ingredients'
  | 'canonical_ingredient_aliases'
  | 'canonical_ingredient_allergen_map'
  | 'canonical_ingredient_review_queue';

export type ProductionReadOnlyArtifactId =
  | 'ingredient_label_coverage'
  | 'canonical_alias_coverage'
  | 'animal_family_allergy_impact'
  | 'score_display_impact'
  | 'review_queue_gap_summary';

export type ProductionReadOnlyOperation = 'select' | 'count' | 'sample';

export interface ProductionReadOnlyDatasetPlan {
  dataset: ProductionReadOnlyDatasetId;
  operations: ProductionReadOnlyOperation[];
  purpose: string;
}

export interface ProductionReadOnlyReportPlan {
  planKind: 'production_read_only_report_plan';
  datasets: ProductionReadOnlyDatasetPlan[];
  expectedArtifacts: ProductionReadOnlyArtifactId[];
  safety: {
    allowsWrites: false;
    allowsSqlMigration: false;
    allowsRpcMutation: false;
    allowsEnvOrDeployChange: false;
    allowsProductIngredientMutation: false;
    requiresRollbackPlanBeforeWrite: true;
  };
  forbiddenOperations: string[];
  harnessGate: HarnessRunReport;
}

const DATASETS: ProductionReadOnlyDatasetPlan[] = [
  {
    dataset: 'products',
    operations: ['select', 'count', 'sample'],
    purpose: 'Map product ids, names, categories, target pet type, and current product metadata for affected-product reports.',
  },
  {
    dataset: 'product_ingredients',
    operations: ['select', 'count', 'sample'],
    purpose: 'Read product-to-ingredient rows without changing product ingredient data.',
  },
  {
    dataset: 'ingredients',
    operations: ['select', 'count', 'sample'],
    purpose: 'Read legacy ingredient names, risk levels, and allergy-related source labels.',
  },
  {
    dataset: 'canonical_ingredients',
    operations: ['select', 'count'],
    purpose: 'Compare current canonical source families and part/form separation coverage.',
  },
  {
    dataset: 'canonical_ingredient_aliases',
    operations: ['select', 'count'],
    purpose: 'Compare alias coverage using select-only reads.',
  },
  {
    dataset: 'canonical_ingredient_allergen_map',
    operations: ['select', 'count'],
    purpose: 'Check allergen-family coverage for named animal sources and adjacent parts.',
  },
  {
    dataset: 'canonical_ingredient_review_queue',
    operations: ['select', 'count'],
    purpose: 'Summarize existing review-only rows and gaps without adding queue rows.',
  },
];

const EXPECTED_ARTIFACTS: ProductionReadOnlyArtifactId[] = [
  'ingredient_label_coverage',
  'canonical_alias_coverage',
  'animal_family_allergy_impact',
  'score_display_impact',
  'review_queue_gap_summary',
];

const FORBIDDEN_OPERATIONS = [
  'insert',
  'update',
  'upsert',
  'delete',
  'truncate',
  'merge',
  'rpc mutation',
  'migration',
  'seed apply',
  'rollback execution',
  'env change',
  'deploy',
];

export function buildProductionReadOnlyReportPlan(): ProductionReadOnlyReportPlan {
  const harnessGate = buildVeroheartHarnessRunReport({
    hypothesis: {
      id: 'production-read-only-report-plan',
      statement:
        'Production ingredient and scoring impact reports should be planned as read-only evidence before any data mutation or app-visible change.',
      targetLayer: 'database',
      expectedPositiveCases: [
        'existing product and ingredient rows can be sampled for coverage reports',
        'animal-family allergy impact can be summarized without writing production data',
      ],
      expectedNegativeCases: [
        'the plan does not authorize writes, migrations, env changes, deploys, or runtime flag changes',
      ],
      expectedUnchangedSurfaces: [
        'score',
        'display_verdict',
        'allergy_hit',
        'ranking',
        'ui_copy',
        'product_ingredient_data',
        'supabase_write',
        'sql_migration',
        'env_deploy',
        'runtime_flag',
      ],
    },
    reviews: [
      {
        agent: 'data-auditor',
        status: 'pass',
        evidence: ['datasets are read-only inputs for coverage and impact reports'],
        changedSurfaces: [],
      },
      {
        agent: 'nutrition-policy',
        status: 'pass',
        evidence: ['plan preserves canonical, source family, allergen family, and part/form separation'],
        changedSurfaces: [],
      },
      {
        agent: 'allergy-safety',
        status: 'pass',
        evidence: ['plan prepares allergy impact evidence without changing matcher behavior'],
        changedSurfaces: [],
      },
      {
        agent: 'scoring-regression',
        status: 'pass',
        evidence: ['plan prepares score/display impact artifacts without changing score logic'],
        changedSurfaces: [],
      },
      {
        agent: 'product-impact',
        status: 'pass',
        evidence: ['plan requires affected-product artifacts before behavior-changing work'],
        changedSurfaces: [],
      },
      {
        agent: 'review-gate',
        status: 'pass',
        evidence: ['read-only plan remains safe because it changes no product surface'],
        changedSurfaces: [],
      },
    ],
    semanticSafety: {},
  });

  return {
    planKind: 'production_read_only_report_plan',
    datasets: DATASETS,
    expectedArtifacts: EXPECTED_ARTIFACTS,
    safety: {
      allowsWrites: false,
      allowsSqlMigration: false,
      allowsRpcMutation: false,
      allowsEnvOrDeployChange: false,
      allowsProductIngredientMutation: false,
      requiresRollbackPlanBeforeWrite: true,
    },
    forbiddenOperations: FORBIDDEN_OPERATIONS,
    harnessGate,
  };
}
