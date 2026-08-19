import {
  buildAnimalIngredientImpactDiffReport,
  type AnimalIngredientImpactDiffReport,
} from './animalIngredientImpactDiffHarness';
import {
  buildProductionReadOnlySnapshotReport,
  type ProductionReadOnlyRowAdapterReport,
  type ProductionReadOnlyRows,
} from './productionReadOnlyRowAdapter';

export interface ProductionReadOnlyImpactDryRunInput {
  hypothesisId: string;
  hypothesisStatement: string;
  beforeRows: ProductionReadOnlyRows;
  afterRows: ProductionReadOnlyRows;
}

export interface ProductionReadOnlyImpactDryRunReport {
  reportKind: 'production_read_only_impact_dry_run';
  beforeSnapshot: ProductionReadOnlyRowAdapterReport;
  afterSnapshot: ProductionReadOnlyRowAdapterReport;
  impactDiff: AnimalIngredientImpactDiffReport;
  summary: {
    beforeProductsRead: number;
    afterProductsRead: number;
    productsCompared: number;
    allergyHitChangedProducts: number;
    scoreChangedProducts: number;
    displayChangedProducts: number;
    rankingChangedProducts: number;
    missingJoinOrSignalWarnings: number;
  };
  safety: {
    usesSupabaseClient: false;
    executesSql: false;
    mutatesProductionRows: false;
    changesRuntimeScoreLogic: false;
    changesUi: false;
    changesEnvOrDeploy: false;
  };
}

export function buildProductionReadOnlyImpactDryRun(
  input: ProductionReadOnlyImpactDryRunInput,
): ProductionReadOnlyImpactDryRunReport {
  const beforeSnapshot = buildProductionReadOnlySnapshotReport(input.beforeRows);
  const afterSnapshot = buildProductionReadOnlySnapshotReport(input.afterRows);

  const impactDiff = buildAnimalIngredientImpactDiffReport({
    hypothesisId: input.hypothesisId,
    hypothesisStatement: input.hypothesisStatement,
    before: beforeSnapshot.rows,
    after: afterSnapshot.rows,
  });

  const missingJoinOrSignalWarnings =
    beforeSnapshot.summary.productsWithMissingSignal +
    beforeSnapshot.summary.productsWithMissingIngredientRows +
    beforeSnapshot.summary.productIngredientRowsWithMissingIngredient +
    afterSnapshot.summary.productsWithMissingSignal +
    afterSnapshot.summary.productsWithMissingIngredientRows +
    afterSnapshot.summary.productIngredientRowsWithMissingIngredient;

  return {
    reportKind: 'production_read_only_impact_dry_run',
    beforeSnapshot,
    afterSnapshot,
    impactDiff,
    summary: {
      beforeProductsRead: beforeSnapshot.summary.productsRead,
      afterProductsRead: afterSnapshot.summary.productsRead,
      productsCompared: impactDiff.summary.productsCompared,
      allergyHitChangedProducts: impactDiff.summary.allergyHitChangedProducts,
      scoreChangedProducts: impactDiff.summary.scoreChangedProducts,
      displayChangedProducts: impactDiff.summary.displayChangedProducts,
      rankingChangedProducts: impactDiff.summary.rankingChangedProducts,
      missingJoinOrSignalWarnings,
    },
    safety: {
      usesSupabaseClient: false,
      executesSql: false,
      mutatesProductionRows: false,
      changesRuntimeScoreLogic: false,
      changesUi: false,
      changesEnvOrDeploy: false,
    },
  };
}
