import {
  buildProductionReadOnlySqlTemplateGuardReport,
  type ProductionReadOnlySqlTemplateGuardReport,
} from './productionReadOnlySqlTemplateGuard';
import {
  buildProductionReadOnlyImpactDryRun,
  type ProductionReadOnlyImpactDryRunReport,
} from './productionReadOnlyImpactDryRun';
import type { ProductionReadOnlyRows } from './productionReadOnlyRowAdapter';

export interface SampledReportPacketFixture {
  packetKind: 'sampled_report_packet_fixture';
  templateGuard: ProductionReadOnlySqlTemplateGuardReport;
  dryRun: ProductionReadOnlyImpactDryRunReport;
  summary: {
    validTemplateShapes: number;
    invalidTemplateShapes: number;
    beforeProductsRead: number;
    afterProductsRead: number;
    productsCompared: number;
    allergyHitChangedProducts: number;
    scoreChangedProducts: number;
    displayChangedProducts: number;
    rankingChangedProducts: number;
    missingJoinOrSignalWarnings: number;
    gateDecision: string;
  };
  safety: {
    executesSql: false;
    usesSupabaseClient: false;
    mutatesProductionRows: false;
    changesRuntimeScoreLogic: false;
    changesUi: false;
    changesEnvOrDeploy: false;
    appRuntimeApproved: false;
  };
}

const beforeRows: ProductionReadOnlyRows = {
  products: [
    { id: 'p1', name: 'Chicken meal sample' },
    { id: 'p2', name: 'Unknown byproduct sample' },
    { id: 'p3', name: 'Fish oil sample' },
  ],
  productIngredients: [
    { productId: 'p1', ingredientId: 'i1', position: 1 },
    { productId: 'p1', ingredientId: 'i2', position: 2 },
    { productId: 'p2', ingredientId: 'i3', position: 1 },
    { productId: 'p3', ingredientId: 'i4', position: 1 },
  ],
  ingredients: [
    { id: 'i1', nameKo: '계육분' },
    { id: 'i2', nameKo: '닭지방' },
    { id: 'i3', nameKo: '동물성부산물' },
    { id: 'i4', nameKo: '연어오일' },
  ],
  signals: [
    { productId: 'p1', allergyHits: [], score: 82, displayScore: 82, rankingPosition: 1 },
    { productId: 'p2', allergyHits: [], score: 70, displayScore: 70, rankingPosition: 2 },
    { productId: 'p3', allergyHits: [], score: 78, displayScore: 78, rankingPosition: 3 },
  ],
};

const afterRows: ProductionReadOnlyRows = {
  ...beforeRows,
  signals: [
    { productId: 'p1', allergyHits: ['닭'], score: 0, displayScore: 0, rankingPosition: 3 },
    { productId: 'p2', allergyHits: [], score: 70, displayScore: 70, rankingPosition: 1 },
    { productId: 'p3', allergyHits: ['생선'], score: 0, displayScore: 0, rankingPosition: 2 },
  ],
};

export function buildSampledReportPacketFixture(): SampledReportPacketFixture {
  const templateGuard = buildProductionReadOnlySqlTemplateGuardReport();
  const dryRun = buildProductionReadOnlyImpactDryRun({
    hypothesisId: 'sampled-report-packet-fixture',
    hypothesisStatement:
      'Sampled read-only evidence should combine template shapes, selected rows, impact diff, and gate output without production access.',
    beforeRows,
    afterRows,
  });

  return {
    packetKind: 'sampled_report_packet_fixture',
    templateGuard,
    dryRun,
    summary: {
      validTemplateShapes: templateGuard.summary.validTemplates,
      invalidTemplateShapes: templateGuard.summary.invalidTemplates,
      beforeProductsRead: dryRun.summary.beforeProductsRead,
      afterProductsRead: dryRun.summary.afterProductsRead,
      productsCompared: dryRun.summary.productsCompared,
      allergyHitChangedProducts: dryRun.summary.allergyHitChangedProducts,
      scoreChangedProducts: dryRun.summary.scoreChangedProducts,
      displayChangedProducts: dryRun.summary.displayChangedProducts,
      rankingChangedProducts: dryRun.summary.rankingChangedProducts,
      missingJoinOrSignalWarnings: dryRun.summary.missingJoinOrSignalWarnings,
      gateDecision: dryRun.impactDiff.harnessGate.decision,
    },
    safety: {
      executesSql: false,
      usesSupabaseClient: false,
      mutatesProductionRows: false,
      changesRuntimeScoreLogic: false,
      changesUi: false,
      changesEnvOrDeploy: false,
      appRuntimeApproved: false,
    },
  };
}
