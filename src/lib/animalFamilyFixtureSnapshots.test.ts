import { describe, expect, it } from 'vitest';
import {
  ANIMAL_FAMILY_FIXTURE_CASES,
  buildAnimalFamilyFixtureImpactReport,
  buildBaselineAnimalFamilySnapshotRows,
  buildCandidateAnimalFamilySnapshotRows,
} from './animalFamilyFixtureSnapshots';

describe('animal family fixture snapshots', () => {
  it('covers representative animal source families and adjacent forms', () => {
    const families = new Set(ANIMAL_FAMILY_FIXTURE_CASES.map((item) => item.family));

    expect([...families].sort()).toEqual([
      'beef',
      'chicken',
      'duck',
      'egg',
      'fish',
      'lamb',
      'pork',
      'turkey',
    ]);
    expect(ANIMAL_FAMILY_FIXTURE_CASES.some((item) => item.note === 'named organ')).toBe(true);
    expect(ANIMAL_FAMILY_FIXTURE_CASES.some((item) => item.note === 'named fat uses processing caution')).toBe(true);
    expect(ANIMAL_FAMILY_FIXTURE_CASES.some((item) => item.note === 'unknown source must not become chicken')).toBe(true);
  });

  it('builds candidate snapshots from the current runtime matcher', () => {
    const candidate = buildCandidateAnimalFamilySnapshotRows();
    const byId = new Map(candidate.map((row) => [row.productId, row]));

    expect(byId.get('chicken-meal')?.allergyHits).toEqual(['닭']);
    expect(byId.get('chicken-organ')?.allergyHits).toEqual(['닭']);
    expect(byId.get('chicken-fat')?.allergyHits).toEqual([]);
    expect(byId.get('poultry-byproduct')?.allergyHits).toEqual([]);
    expect(byId.get('unknown-animal-byproduct')?.allergyHits).toEqual([]);
    expect(byId.get('fish-oil')?.allergyHits).toEqual(['생선']);
    expect(byId.get('egg-white')?.allergyHits).toEqual(['계란']);
  });

  it('keeps baseline and candidate row ids aligned for diff reports', () => {
    const baseline = buildBaselineAnimalFamilySnapshotRows();
    const candidate = buildCandidateAnimalFamilySnapshotRows();

    expect(candidate.map((row) => row.productId)).toEqual(baseline.map((row) => row.productId));
  });

  it('produces a harness-gated impact report for behavior-changing cases', () => {
    const report = buildAnimalFamilyFixtureImpactReport();

    expect(report.summary.productsCompared).toBe(ANIMAL_FAMILY_FIXTURE_CASES.length);
    expect(report.summary.allergyHitChangedProducts).toBeGreaterThan(0);
    expect(report.summary.scoreChangedProducts).toBeGreaterThan(0);
    expect(report.summary.displayChangedProducts).toBeGreaterThan(0);
    expect(report.harnessGate.decision).toBe('approval_required');
    expect(report.harnessGate.requiredApproval).toEqual(
      expect.arrayContaining([
        'allergy_hit change requires owner approval',
        'score change requires owner approval',
        'display_verdict change requires owner approval',
      ]),
    );
  });
});