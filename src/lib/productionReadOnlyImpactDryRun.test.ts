import { describe, expect, it } from 'vitest';
import { buildProductionReadOnlyImpactDryRun } from './productionReadOnlyImpactDryRun';
import type { ProductionReadOnlyRows } from './productionReadOnlyRowAdapter';

const beforeRows: ProductionReadOnlyRows = {
  products: [
    { id: 'p1', name: 'Chicken meal fixture' },
    { id: 'p2', name: 'Unknown byproduct fixture' },
  ],
  productIngredients: [
    { productId: 'p1', ingredientId: 'i1', position: 1 },
    { productId: 'p2', ingredientId: 'i2', position: 1 },
  ],
  ingredients: [
    { id: 'i1', nameKo: '계육분' },
    { id: 'i2', nameKo: '동물성부산물' },
  ],
  signals: [
    { productId: 'p1', allergyHits: [], score: 80, displayScore: 80, rankingPosition: 1 },
    { productId: 'p2', allergyHits: [], score: 70, displayScore: 70, rankingPosition: 2 },
  ],
};

const afterRows: ProductionReadOnlyRows = {
  ...beforeRows,
  signals: [
    { productId: 'p1', allergyHits: ['닭'], score: 0, displayScore: 0, rankingPosition: 2 },
    { productId: 'p2', allergyHits: [], score: 70, displayScore: 70, rankingPosition: 1 },
  ],
};

describe('production read-only impact dry-run', () => {
  it('connects read-only rows through snapshot adapter and impact diff harness', () => {
    const report = buildProductionReadOnlyImpactDryRun({
      hypothesisId: 'readonly-chicken-family-impact',
      hypothesisStatement: 'Read-only production-shaped rows should produce a gated allergy and score impact report.',
      beforeRows,
      afterRows,
    });

    expect(report.reportKind).toBe('production_read_only_impact_dry_run');
    expect(report.beforeSnapshot.rows.map((row) => row.productId)).toEqual(['p1', 'p2']);
    expect(report.afterSnapshot.rows.map((row) => row.productId)).toEqual(['p1', 'p2']);
    expect(report.impactDiff.summary).toEqual({
      productsCompared: 2,
      allergyHitChangedProducts: 1,
      scoreChangedProducts: 1,
      displayChangedProducts: 1,
      rankingChangedProducts: 2,
    });
    expect(report.summary).toEqual({
      beforeProductsRead: 2,
      afterProductsRead: 2,
      productsCompared: 2,
      allergyHitChangedProducts: 1,
      scoreChangedProducts: 1,
      displayChangedProducts: 1,
      rankingChangedProducts: 2,
      missingJoinOrSignalWarnings: 0,
    });
  });

  it('routes behavior-changing dry-run output through approval required gate', () => {
    const report = buildProductionReadOnlyImpactDryRun({
      hypothesisId: 'readonly-chicken-family-impact',
      hypothesisStatement: 'Read-only production-shaped rows should produce a gated allergy and score impact report.',
      beforeRows,
      afterRows,
    });

    expect(report.impactDiff.harnessGate.decision).toBe('approval_required');
    expect(report.impactDiff.harnessGate.requiredApproval).toEqual(
      expect.arrayContaining([
        'allergy_hit change requires owner approval',
        'score change requires owner approval',
        'display_verdict change requires owner approval',
        'ranking change requires owner approval',
      ]),
    );
  });

  it('preserves dry-run safety boundaries', () => {
    const report = buildProductionReadOnlyImpactDryRun({
      hypothesisId: 'readonly-chicken-family-impact',
      hypothesisStatement: 'Read-only production-shaped rows should produce a gated allergy and score impact report.',
      beforeRows,
      afterRows,
    });

    expect(report.safety).toEqual({
      usesSupabaseClient: false,
      executesSql: false,
      mutatesProductionRows: false,
      changesRuntimeScoreLogic: false,
      changesUi: false,
      changesEnvOrDeploy: false,
    });
  });
});
