import { describe, expect, it } from 'vitest';
import type { Product } from '../types';
import { buildHealthConcernScoreShadowReport } from './healthConcernScoreShadowReport';
import { buildHealthConcernNeutralPolicyImpactReport } from './healthConcernNeutralPolicyImpact';

function product(id: string): Product {
  return {
    id,
    brand: '',
    name: `Fixture ${id}`,
    category: 'food',
    targetPetType: 'dog',
    imageUrl: '',
    ingredients: [],
    reviewsCount: 0,
    averageRating: 0,
  };
}

describe('health-concern neutral policy shadow impact', () => {
  it('removes the hidden missing-data penalty while preserving the legacy neutral score', () => {
    const report = buildHealthConcernScoreShadowReport([product('a'), product('b')]);
    const impact = buildHealthConcernNeutralPolicyImpactReport(report);
    const conservative = impact.variants.conservative_partial_quantitative;

    expect(conservative).toMatchObject({ rows: 18, computedRows: 18, blockedRows: 0 });
    expect(conservative.concernFitDistribution).toEqual({ '5': 18 });
    expect(conservative.dispositionCounts).toEqual({ neutral_missing_evidence: 18 });
    expect(conservative.vsLegacy.totalScoreDeltaDistribution).toEqual({ '0': 18 });
    expect(conservative.vsLegacy.gradeChanges).toBe(0);
    expect(conservative.vsLegacy.ranking).toMatchObject({
      cohortsCompared: 9,
      cohortsWithOrderingChanges: 0,
      productsWithChangedPosition: 0,
    });
    expect(conservative.vsExistingEvaluatorCandidate.totalScoreDeltaDistribution).toEqual({ '5': 18 });
    expect(impact.comparison).toMatchObject({
      rowsWithDifferentConcernFit: 0,
      rowsWithDifferentTotalScore: 0,
      rowsWithDifferentGrade: 0,
    });
    expect(impact.invariantViolations).toEqual({});
  });

  it('isolates variant differences to partial quantitative evidence', () => {
    const report = buildHealthConcernScoreShadowReport([product('a')]);
    const row = report.matrix.find((entry) => entry.rankingCohortKey === 'synthetic:Dog:joint');
    if (row == null) throw new Error('joint fixture row missing');
    row.row.candidate.evaluatorResults[0] = {
      ...row.row.candidate.evaluatorResults[0],
      status: 'possible',
      evidenceLevel: 'partial_quantitative',
      confidence: 'partial',
      quantitativeChecks: [{
        nutrient: 'fixture',
        status: 'pass',
        valueKind: 'label_declared',
        concernDomain: 'general',
        judgment: 'active',
        inputEvidence: [],
        message: 'fixture',
      }],
    };
    row.row.candidate.evidenceLevels = ['partial_quantitative'];
    row.row.candidate.confidenceLevels = ['partial'];
    const impact = buildHealthConcernNeutralPolicyImpactReport(report);

    expect(impact.comparison.rowsWithDifferentConcernFit).toBe(1);
    expect(impact.comparison.rowsWithDifferentTotalScore).toBe(1);
    expect(impact.invariantViolations).toEqual({});
  });

  it('is deterministic, does not mutate input, and keeps protected surfaces inactive', () => {
    const report = buildHealthConcernScoreShadowReport([product('a'), product('b')]);
    const before = structuredClone(report);
    const first = buildHealthConcernNeutralPolicyImpactReport(report);
    const second = buildHealthConcernNeutralPolicyImpactReport(report);
    expect(second).toEqual(first);
    expect(report).toEqual(before);
    expect(first.safety).toEqual({
      localCopiedDataOnly: true,
      mutatesInput: false,
      changesRuntimeScore: false,
      changesRuntimeRanking: false,
      changesUiCopy: false,
      authorizesRuntimeActivation: false,
    });
  });
});
