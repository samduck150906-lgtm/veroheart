import { describe, expect, it } from 'vitest';
import type { DataConfidence } from '../health/concerns';
import type { Product } from '../types';
import { buildHealthConcernScoreShadowReport } from './healthConcernScoreShadowReport';
import { summarizeHealthConcernProductionShadowImpact } from './healthConcernProductionShadowImpact';

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

function controlledReport(rows: Array<{
  confidence: DataConfidence;
  legacy: number;
  candidate: number;
  gradeChanged: boolean;
}>) {
  const report = buildHealthConcernScoreShadowReport(rows.map((_, index) => product(`p${index + 1}`)));
  report.matrix = report.matrix
    .filter((row) => row.rankingCohortKey === 'synthetic:Dog:joint')
    .map((matrixRow, index) => {
      const value = rows[index];
      matrixRow.row.candidate.status = 'computed';
      matrixRow.row.candidate.confidenceLevels = [value.confidence];
      matrixRow.row.legacy.totalScore = value.legacy;
      matrixRow.row.candidate.totalScore = value.candidate;
      matrixRow.row.differences.totalScoreDelta = value.candidate - value.legacy;
      matrixRow.row.differences.gradeChanged = value.gradeChanged;
      matrixRow.row.differences.rankingImpactEligible = true;
      return matrixRow;
    });
  return report;
}

describe('health-concern production shadow evidence-qualified impact', () => {
  it('separates insufficient-only grade changes from partial evidence with no delta', () => {
    const report = controlledReport([
      { confidence: 'insufficient', legacy: 80, candidate: 75, gradeChanged: true },
      { confidence: 'partial', legacy: 70, candidate: 70, gradeChanged: false },
    ]);
    const impact = summarizeHealthConcernProductionShadowImpact(report);

    expect(impact.byConfidence.insufficient).toMatchObject({ rows: 1, gradeChanges: 1 });
    expect(impact.byConfidence.insufficient.scoreDeltaDistribution).toEqual({ '-5': 1 });
    expect(impact.byConfidence.partial).toMatchObject({ rows: 1, gradeChanges: 0 });
    expect(impact.byConfidence.partial.scoreDeltaDistribution).toEqual({ '0': 1 });
    expect(impact.byConfidence.sufficient).toMatchObject({ rows: 0, gradeChanges: 0 });
    expect(impact.evidenceQualified.gradeChanges).toBe(0);
    expect(impact.evidenceQualified.ranking).toMatchObject({
      eligibleRows: 1,
      comparableCohorts: 0,
      nonComparableCohorts: 1,
      cohortsWithOrderingChanges: 0,
    });
    expect(impact.decisionGrade.rankingComparisonPossible).toBe(false);
    expect(impact.decisionReadiness).toEqual({
      result: 'not_decision_ready',
      reasons: ['no_sufficient_confidence_rows', 'no_comparable_sufficient_confidence_ranking_cohort'],
      authorizesRuntimeActivation: false,
    });
  });

  it('handles mixed confidence, applies ranking thresholds, and does not mutate input', () => {
    const report = controlledReport([
      { confidence: 'insufficient', legacy: 90, candidate: 10, gradeChanged: true },
      { confidence: 'partial', legacy: 80, candidate: 70, gradeChanged: true },
      { confidence: 'sufficient', legacy: 60, candidate: 75, gradeChanged: true },
    ]);
    const before = structuredClone(report);
    const first = summarizeHealthConcernProductionShadowImpact(report);
    const second = summarizeHealthConcernProductionShadowImpact(report);

    expect(first.rawExploratory.ranking).toMatchObject({
      eligibleRows: 3,
      comparableCohorts: 1,
      productsWithOrderingChanges: 2,
    });
    expect(first.evidenceQualified.ranking).toMatchObject({
      eligibleRows: 2,
      comparableCohorts: 1,
      nonComparableCohorts: 0,
      cohortsWithOrderingChanges: 1,
      productsWithOrderingChanges: 2,
    });
    expect(first.decisionGrade.ranking).toMatchObject({
      eligibleRows: 1,
      comparableCohorts: 0,
      nonComparableCohorts: 1,
    });
    expect(first.decisionGrade.rankingComparisonPossible).toBe(false);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    expect(report).toEqual(before);
  });
});
