import { describe, expect, it } from 'vitest';

type HarnessAgentId =
  | 'data-auditor'
  | 'nutrition-policy'
  | 'allergy-safety'
  | 'scoring-regression'
  | 'product-impact'
  | 'review-gate';

type GateDecision = 'safe' | 'approval_required' | 'blocked';

interface HarnessAgentContract {
  id: HarnessAgentId;
  requiredOutputs: string[];
}

const agents: HarnessAgentContract[] = [
  { id: 'data-auditor', requiredOutputs: ['coverage_report', 'gap_list', 'collision_list'] },
  { id: 'nutrition-policy', requiredOutputs: ['policy_verdict', 'caution_boundary'] },
  { id: 'allergy-safety', requiredOutputs: ['allergy_hit_diff', 'false_positive_guard', 'false_negative_guard'] },
  { id: 'scoring-regression', requiredOutputs: ['score_diff', 'display_diff', 'ranking_diff'] },
  { id: 'product-impact', requiredOutputs: ['affected_products', 'ingredient_rows', 'reason'] },
  { id: 'review-gate', requiredOutputs: ['decision', 'required_approval', 'blocked_reason'] },
];

const automaticSafeTrack = {
  allowsSupabaseWrite: false,
  allowsSqlMigration: false,
  allowsEnvDeployChange: false,
  allowsRuntimeFlagEnablement: false,
  allowsUiChange: false,
  allowsProductIngredientMutation: false,
  allowsSilentScoreChange: false,
  allowsSilentAllergyHitChange: false,
  requiresDiffEvidence: true,
} as const;

function reviewGate(input: {
  uiChange?: boolean;
  scoreChange?: boolean;
  allergyHitChange?: boolean;
  productionWrite?: boolean;
  envDeployChange?: boolean;
  collapsesPartsIntoOrdinaryMeat?: boolean;
  treatsUnknownAsSafe?: boolean;
}): GateDecision {
  if (input.collapsesPartsIntoOrdinaryMeat || input.treatsUnknownAsSafe) return 'blocked';
  if (input.productionWrite || input.envDeployChange) return 'approval_required';
  if (input.uiChange || input.scoreChange || input.allergyHitChange) return 'approval_required';
  return 'safe';
}

describe('multi-agent harness contract', () => {
  it('defines the expected agent roster', () => {
    expect(agents.map((agent) => agent.id)).toEqual([
      'data-auditor',
      'nutrition-policy',
      'allergy-safety',
      'scoring-regression',
      'product-impact',
      'review-gate',
    ]);
  });

  it('requires every agent to produce machine-checkable outputs', () => {
    for (const agent of agents) {
      expect(agent.requiredOutputs.length, agent.id).toBeGreaterThan(0);
    }
  });

  it('keeps automatic safe track limited to non-visible non-operational work', () => {
    expect(automaticSafeTrack.allowsSupabaseWrite).toBe(false);
    expect(automaticSafeTrack.allowsSqlMigration).toBe(false);
    expect(automaticSafeTrack.allowsEnvDeployChange).toBe(false);
    expect(automaticSafeTrack.allowsRuntimeFlagEnablement).toBe(false);
    expect(automaticSafeTrack.allowsUiChange).toBe(false);
    expect(automaticSafeTrack.allowsProductIngredientMutation).toBe(false);
    expect(automaticSafeTrack.allowsSilentScoreChange).toBe(false);
    expect(automaticSafeTrack.allowsSilentAllergyHitChange).toBe(false);
    expect(automaticSafeTrack.requiresDiffEvidence).toBe(true);
  });

  it('routes behavior-impacting changes to approval and unsafe semantic collapse to blocked', () => {
    expect(reviewGate({})).toBe('safe');
    expect(reviewGate({ allergyHitChange: true })).toBe('approval_required');
    expect(reviewGate({ scoreChange: true })).toBe('approval_required');
    expect(reviewGate({ uiChange: true })).toBe('approval_required');
    expect(reviewGate({ productionWrite: true })).toBe('approval_required');
    expect(reviewGate({ collapsesPartsIntoOrdinaryMeat: true })).toBe('blocked');
    expect(reviewGate({ treatsUnknownAsSafe: true })).toBe('blocked');
  });
});
