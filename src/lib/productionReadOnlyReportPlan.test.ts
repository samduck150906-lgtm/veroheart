import { describe, expect, it } from 'vitest';
import { buildProductionReadOnlyReportPlan } from './productionReadOnlyReportPlan';

describe('production read-only report plan', () => {
  it('declares only read-only datasets and operations', () => {
    const plan = buildProductionReadOnlyReportPlan();

    expect(plan.planKind).toBe('production_read_only_report_plan');
    expect(plan.datasets.map((item) => item.dataset)).toEqual([
      'products',
      'product_ingredients',
      'ingredients',
      'canonical_ingredients',
      'canonical_ingredient_aliases',
      'canonical_ingredient_allergen_map',
      'canonical_ingredient_review_queue',
    ]);

    for (const dataset of plan.datasets) {
      expect(dataset.operations.every((operation) => ['select', 'count', 'sample'].includes(operation))).toBe(true);
      expect(dataset.purpose.toLowerCase()).not.toMatch(/insert|update|upsert|delete|write|migration/);
    }
  });

  it('forbids production writes migrations env deploy and product ingredient mutation', () => {
    const plan = buildProductionReadOnlyReportPlan();

    expect(plan.safety.allowsWrites).toBe(false);
    expect(plan.safety.allowsSqlMigration).toBe(false);
    expect(plan.safety.allowsRpcMutation).toBe(false);
    expect(plan.safety.allowsEnvOrDeployChange).toBe(false);
    expect(plan.safety.allowsProductIngredientMutation).toBe(false);
    expect(plan.safety.requiresRollbackPlanBeforeWrite).toBe(true);

    expect(plan.forbiddenOperations).toEqual(
      expect.arrayContaining([
        'insert',
        'update',
        'upsert',
        'delete',
        'migration',
        'seed apply',
        'rollback execution',
        'env change',
        'deploy',
      ]),
    );
  });

  it('requires the expected report artifacts before behavior-changing work', () => {
    const plan = buildProductionReadOnlyReportPlan();

    expect(plan.expectedArtifacts).toEqual([
      'ingredient_label_coverage',
      'canonical_alias_coverage',
      'animal_family_allergy_impact',
      'score_display_impact',
      'review_queue_gap_summary',
    ]);
  });

  it('stays on the safe harness gate because it changes no product surface', () => {
    const plan = buildProductionReadOnlyReportPlan();

    expect(plan.harnessGate.decision).toBe('safe');
    expect(plan.harnessGate.changedSurfaces).toEqual([]);
    expect(plan.harnessGate.requiredApproval).toEqual([]);
    expect(plan.harnessGate.blockedReasons).toEqual([]);
    expect(plan.harnessGate.missingAgents).toEqual([]);
  });
});
