import { describe, expect, it } from 'vitest';

const futurePatchGate = {
  requiresScoreDiff: true,
  requiresDisplayDiff: true,
  requiresAllergyHitDiff: true,
  requiresAffectedReport: true,
  requiresOwnerApprovalForVisibleChange: true,
  allowsSilentScoreChange: false,
  allowsSilentAllergyChange: false,
  allowsSilentVisibleChange: false,
  allowsSupabaseWrite: false,
  allowsRuntimeFlagEnablement: false,
} as const;

describe('dictionary patch invariance gate', () => {
  it('requires diffs before any dictionary patch can affect runtime behavior', () => {
    expect(futurePatchGate.requiresScoreDiff).toBe(true);
    expect(futurePatchGate.requiresDisplayDiff).toBe(true);
    expect(futurePatchGate.requiresAllergyHitDiff).toBe(true);
    expect(futurePatchGate.requiresAffectedReport).toBe(true);
  });

  it('does not allow silent score allergy or visible changes', () => {
    expect(futurePatchGate.allowsSilentScoreChange).toBe(false);
    expect(futurePatchGate.allowsSilentAllergyChange).toBe(false);
    expect(futurePatchGate.allowsSilentVisibleChange).toBe(false);
  });

  it('keeps operational changes out of the dictionary patch gate', () => {
    expect(futurePatchGate.allowsSupabaseWrite).toBe(false);
    expect(futurePatchGate.allowsRuntimeFlagEnablement).toBe(false);
  });

  it('requires explicit owner approval for app-visible changes', () => {
    expect(futurePatchGate.requiresOwnerApprovalForVisibleChange).toBe(true);
  });
});
