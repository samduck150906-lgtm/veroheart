import { describe, expect, it } from 'vitest';
import type { DataConfidence } from '../health/concerns';
import type { Product } from '../types';
import { buildHealthConcernScoreShadowReport } from './healthConcernScoreShadowReport';
import {
  diagnoseHealthConcernProductionShadowAnatomicalCollisions,
  summarizeHealthConcernProductionShadowImpact,
} from './healthConcernProductionShadowImpact';

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

function productWithIngredient(id: string, nameKo: string, nameEn = '', purpose = ''): Product {
  return {
    ...product(id),
    ingredients: [{ id: `ingredient:${id}`, nameKo, nameEn, purpose, riskLevel: 'safe' }],
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

describe('health-concern production shadow legacy anatomical collision diagnostic', () => {
  it('classifies chicken and rabbit heart names as anatomy, not heart-health claims', () => {
    const products = [
      productWithIngredient('chicken', '닭고기 심장', 'Chicken Heart'),
      productWithIngredient('rabbit', '토끼 심장', 'Rabbit Heart'),
    ];
    const before = structuredClone(products);
    const diagnostic = diagnoseHealthConcernProductionShadowAnatomicalCollisions(
      products,
      buildHealthConcernScoreShadowReport(products),
    );

    expect(diagnostic).toEqual({
      category: 'heart_concern_vs_anatomical_source_part_name',
      affectedShadowRows: 2,
      anatomicalIngredientMatches: 2,
      healthPurposeOrTagEvidenceExcluded: 0,
      changesRuntimeLegacyMatcher: false,
      requiresSeparateRuntimeCorrection: true,
    });
    expect(products).toEqual(before);
  });

  it('excludes supplied health tags and ingredient purpose and ignores unrelated substrings', () => {
    const tagged = {
      ...productWithIngredient('tagged', '닭고기 심장', 'Chicken Heart'),
      healthConcerns: ['심장 건강'],
    };
    const purpose = productWithIngredient('purpose', '토끼 심장', 'Rabbit Heart', '심장 지원');
    const unrelated = productWithIngredient('unrelated', '심장사상충 예방 원료');
    const products = [tagged, purpose, unrelated];
    const diagnostic = diagnoseHealthConcernProductionShadowAnatomicalCollisions(
      products,
      buildHealthConcernScoreShadowReport(products),
    );

    expect(diagnostic.affectedShadowRows).toBe(0);
    expect(diagnostic.anatomicalIngredientMatches).toBe(0);
    expect(diagnostic.healthPurposeOrTagEvidenceExcluded).toBe(2);
  });
});
