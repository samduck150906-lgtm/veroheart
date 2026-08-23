import { describe, expect, it } from 'vitest';
import { buildPoultryAllergyPolicyImpactPacket } from './poultryAllergyPolicyImpactPacket';

describe('poultry allergy policy impact packet', () => {
  const packet = buildPoultryAllergyPolicyImpactPacket();
  const byId = (id: string) => packet.rows.find((row) => row.id === id)!;

  it('documents the expected historical-to-v1 transition counts', () => {
    expect(packet.summary).toEqual({
      total: 9,
      hardUnchanged: 2,
      hardToCaution: 5,
      noneUnchanged: 2,
      candidateHard: 2,
      candidateCaution: 5,
      candidateNone: 2,
    });
  });

  it('keeps same-source and broad poultry allergies HARD', () => {
    expect(byId('same-chicken').candidateKind).toBe('hard');
    expect(byId('same-chicken').candidateHardPenalty).toBe(90);
    expect(byId('same-chicken').candidateCautionPenalty).toBe(0);

    expect(byId('broad-poultry').candidateKind).toBe('hard');
    expect(byId('broad-poultry').candidateHardPenalty).toBe(90);
  });

  it('downgrades different named poultry species from historical HARD to CROSS_CAUTION', () => {
    for (const id of ['cross-duck', 'cross-turkey']) {
      const row = byId(id);
      expect(row.historicalBaselineKind).toBe('hard');
      expect(row.candidateKind).toBe('cross_caution');
      expect(row.candidateHardPenalty).toBe(0);
      expect(row.candidateCautionPenalty).toBe(8);
      expect(row.candidateTotal).toBeGreaterThan(9);
    }
  });

  it('captures generic poultry, fat, and hydrolysis as distinct caution tiers', () => {
    expect(byId('generic-poultry').candidateKind).toBe('strong_caution');
    expect(byId('generic-poultry').candidateCautionPenalty).toBe(15);

    expect(byId('poultry-fat').candidateKind).toBe('processing_caution');
    expect(byId('poultry-fat').candidateCautionPenalty).toBe(5);

    expect(byId('hydrolyzed-chicken').candidateKind).toBe('hydrolysis_caution');
    expect(byId('hydrolyzed-chicken').candidateCautionPenalty).toBe(10);
  });

  it('keeps unknown animal byproduct and egg outside chicken allergy matching', () => {
    for (const id of ['unknown-animal', 'egg-separate']) {
      const row = byId(id);
      expect(row.historicalBaselineKind).toBe('none');
      expect(row.candidateKind).toBe('none');
      expect(row.candidateHardPenalty).toBe(0);
      expect(row.candidateCautionPenalty).toBe(0);
    }
  });
});
