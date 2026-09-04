import { describe, expect, it } from 'vitest';
import type { Product, UserPetProfile } from '../types';
import {
  HEALTH_CONCERN_SHADOW_FIXTURE_PRODUCTS,
  HEALTH_CONCERN_SHADOW_FIXTURE_PROFILES,
  buildHealthConcernScoreShadowFixtureReport,
} from './healthConcernScoreShadowFixture';
import { buildHealthConcernScoreShadowReport } from './healthConcernScoreShadowReport';

describe('health-concern score shadow matrix report', () => {
  it('builds nine canonical compatible-species rows per product plus caller profiles', () => {
    const report = buildHealthConcernScoreShadowFixtureReport();
    expect(report.summary.productsRead).toBe(3);
    expect(report.summary.profilesEvaluated).toBe(14);
    expect(report.summary.matrixRowCount).toBe(42);
    expect(report.matrix.filter((matrixRow) => matrixRow.profileSource === 'synthetic_single_concern')).toHaveLength(27);
    expect(new Set(report.matrix
      .filter((matrixRow) => matrixRow.profileSource === 'synthetic_single_concern')
      .map((matrixRow) => matrixRow.profileKey))).toHaveLength(9);
    for (const matrixRow of report.matrix.filter((row) => row.profileSource === 'synthetic_single_concern')) {
      const product = HEALTH_CONCERN_SHADOW_FIXTURE_PRODUCTS.find((item) => item.id === matrixRow.row.identity.productId);
      expect(matrixRow.row.unchangedSafetySignals.speciesMismatch).toBe(false);
      expect(matrixRow.row.identity.profileSpecies).toBe(product?.targetPetType === 'cat' ? 'Cat' : 'Dog');
    }
  });

  it('keeps caller multi-concern, duplicate, mixed, and unknown-only inputs explicit', () => {
    const report = buildHealthConcernScoreShadowFixtureReport();
    const callerRows = report.matrix.filter((matrixRow) => matrixRow.profileSource === 'caller_provided');
    expect(callerRows).toHaveLength(15);
    expect(callerRows.filter((matrixRow) => matrixRow.profileKey === 'caller:duplicate-aliases')
      .every((matrixRow) => matrixRow.row.identity.recognizedConcernIds.length === 1)).toBe(true);
    expect(report.summary.blockedUnrecognizedRows).toBe(6);
    expect(report.summary.profilesContainingUnrecognizedInputs).toEqual([
      { profileKey: 'caller:mixed-unknown', inputs: ['legacy-unknown'] },
      { profileKey: 'caller:unknown-only', inputs: ['legacy-unknown'] },
    ]);
  });

  it('summarizes evidence, deltas, grades, missing data, and fixture-only impact deterministically', () => {
    const first = buildHealthConcernScoreShadowFixtureReport();
    const second = buildHealthConcernScoreShadowFixtureReport();
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    expect(first.dataset).toBe('caller_supplied_or_fixture_only');
    expect(first.runtimeActivationAuthorized).toBe(false);
    expect(first.summary.computedRows).toBe(36);
    expect(first.summary.notSelectedRows).toBe(0);
    expect(first.summary.rowsWithInsufficientEvidence).toBeGreaterThan(0);
    expect(first.summary.confidenceCounts.insufficient).toBeGreaterThan(0);
    expect(first.summary.legacyConcernFitDistribution).not.toEqual({});
    expect(first.summary.candidateConcernFitDistribution).not.toEqual({});
    expect(first.summary.scoreDeltaDistribution).not.toEqual({});
    expect(first.summary.maximumIncrease).not.toBeNull();
    expect(first.summary.maximumDecrease).not.toBeNull();
    expect(first.summary.maximumIncrease?.delta).toBe(5);
    expect(first.summary.maximumDecrease?.delta).toBe(-10);
    expect(first.summary.topAffectedProducts.length).toBeGreaterThan(0);
    expect(first.summary.productsWithMissingIngredientArrays).toEqual(['fixture-cat-missing-data']);
    expect(first.summary.productsWithEmptyHealthTags).toEqual(['fixture-cat-missing-data']);
    expect(first.summary.rowsWhereAllQuantitativeEvidenceIsInformational).toBeGreaterThan(0);
  });

  it('uses deterministic tie-breaking and excludes blocked rows from candidate rankings', () => {
    const report = buildHealthConcernScoreShadowFixtureReport();
    const blockedRanking = report.rankings.find((ranking) => ranking.profileKey === 'caller:unknown-only');
    expect(blockedRanking?.candidateOrder).toEqual([]);
    expect(blockedRanking?.products.every((product) => product.comparison === 'not_comparable')).toBe(true);
    for (const ranking of report.rankings) {
      const comparable = ranking.products.filter((product) => product.comparison !== 'not_comparable');
      expect(comparable.every((product) => product.candidateRank != null)).toBe(true);
    }
  });

  it('reports no invariant violations and never mutates fixture inputs', () => {
    const products = structuredClone(HEALTH_CONCERN_SHADOW_FIXTURE_PRODUCTS);
    const profiles = structuredClone(HEALTH_CONCERN_SHADOW_FIXTURE_PROFILES);
    const productsBefore = structuredClone(products);
    const profilesBefore = structuredClone(profiles);
    const report = buildHealthConcernScoreShadowReport(products, profiles);
    expect(report.summary.invariantViolations).toEqual([]);
    expect(products).toEqual(productsBefore);
    expect(profiles).toEqual(profilesBefore);
    for (const matrixRow of report.matrix) {
      if (matrixRow.row.candidate.status === 'blocked_unrecognized') {
        expect(matrixRow.row.candidate.totalScore).toBeNull();
      } else {
        expect(matrixRow.row.candidate.totalScore).toBeGreaterThanOrEqual(0);
        expect(matrixRow.row.candidate.totalScore).toBeLessThanOrEqual(100);
        expect(matrixRow.row.candidate.concernFit).toBeGreaterThanOrEqual(0);
        expect(matrixRow.row.candidate.concernFit).toBeLessThanOrEqual(20);
      }
    }
  });

  it('supports a caller-provided no-concern profile without treating it as suitability evidence', () => {
    const products: Product[] = [HEALTH_CONCERN_SHADOW_FIXTURE_PRODUCTS[0]];
    const profiles: UserPetProfile[] = [{
      id: 'none-selected', name: 'Fixture', species: 'Dog', age: 4, allergies: [], healthConcerns: [],
    }];
    const report = buildHealthConcernScoreShadowReport(products, profiles);
    const row = report.matrix.find((matrixRow) => matrixRow.profileKey === 'caller:none-selected');
    expect(row?.row.candidate.status).toBe('not_selected');
    expect(row?.row.candidate.concernFit).toBe(20);
    expect(report.summary.notSelectedRows).toBe(1);
  });

  it('reports no evaluated profiles for an empty product input', () => {
    const report = buildHealthConcernScoreShadowReport([], HEALTH_CONCERN_SHADOW_FIXTURE_PROFILES);
    expect(report.summary).toMatchObject({ productsRead: 0, profilesEvaluated: 0, matrixRowCount: 0 });
    expect(report.summary.maximumIncrease).toBeNull();
    expect(report.summary.maximumDecrease).toBeNull();
  });
});
