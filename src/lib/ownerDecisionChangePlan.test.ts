import { describe, expect, it } from 'vitest';
import { buildOwnerAttentionReviewBriefFixture } from './ownerAttentionReviewBriefFixture';
import { buildOwnerDecisionChangePlan } from './ownerDecisionChangePlan';
import { buildOwnerDecisionResponse } from './ownerDecisionResponseContract';

const decidedAtIso = '2026-08-20T00:00:00.000Z';

describe('owner decision change plan', () => {
  it('turns an accepted approval into a non-executable change preparation plan', () => {
    const brief = buildOwnerAttentionReviewBriefFixture();
    const response = buildOwnerDecisionResponse(brief, {
      packetId: 'fixture-visible-allergy-score-diff',
      decision: 'approved',
      rationale: 'Reviewed and accepted for separate implementation planning.',
      decidedAtIso,
    });

    const plan = buildOwnerDecisionChangePlan(brief, response);

    expect(plan.eligibleForPreparation).toBe(true);
    expect(plan.validationErrors).toEqual([]);
    expect(plan.expectedChangedSurfaces).toEqual([
      'allergy_hit:2',
      'score:2',
      'display_verdict:2',
      'ranking:3',
    ]);
    expect(plan.requiredTests).toEqual(
      expect.arrayContaining([
        'family-aware allergy matcher regression',
        'unknown animal byproduct negative guard',
        'score regression and cap behavior',
        'display verdict regression',
        'before/after ranking diff',
      ]),
    );
    expect(plan.requiredEvidence).toEqual(
      expect.arrayContaining([
        'before/after affected-product diff',
        'owner-approved behavior scope',
        'allergen source-family rationale',
      ]),
    );
  });

  it('does not create a preparation plan from rejected or revision decisions', () => {
    const brief = buildOwnerAttentionReviewBriefFixture();
    const rejected = buildOwnerDecisionResponse(brief, {
      packetId: 'fixture-visible-allergy-score-diff',
      decision: 'rejected',
      rationale: 'Do not proceed.',
      decidedAtIso,
    });
    const revision = buildOwnerDecisionResponse(brief, {
      packetId: 'fixture-visible-allergy-score-diff',
      decision: 'needs_revision',
      rationale: 'Need narrower evidence.',
      decidedAtIso,
    });

    const rejectedPlan = buildOwnerDecisionChangePlan(brief, rejected);
    const revisionPlan = buildOwnerDecisionChangePlan(brief, revision);

    expect(rejectedPlan.eligibleForPreparation).toBe(false);
    expect(rejectedPlan.expectedChangedSurfaces).toEqual([]);
    expect(revisionPlan.eligibleForPreparation).toBe(false);
    expect(revisionPlan.expectedChangedSurfaces).toEqual([]);
  });

  it('cannot bypass a blocked semantic safety issue with an attempted approval', () => {
    const brief = buildOwnerAttentionReviewBriefFixture();
    const blockedApproval = buildOwnerDecisionResponse(brief, {
      packetId: 'fixture-unsafe-semantic-collapse',
      decision: 'approved',
      rationale: 'Attempted bypass should fail.',
      decidedAtIso,
    });

    const plan = buildOwnerDecisionChangePlan(brief, blockedApproval);

    expect(plan.eligibleForPreparation).toBe(false);
    expect(plan.authorization.changePreparationAuthorized).toBe(false);
    expect(plan.validationErrors).toEqual(
      expect.arrayContaining([
        'owner decision response was not accepted',
        'owner decision does not authorize change preparation',
        'only approval-required entries can produce a change plan',
      ]),
    );
  });

  it('keeps all operational effects disabled even after approval', () => {
    const brief = buildOwnerAttentionReviewBriefFixture();
    const response = buildOwnerDecisionResponse(brief, {
      packetId: 'fixture-visible-allergy-score-diff',
      decision: 'approved',
      rationale: 'Reviewed and accepted.',
      decidedAtIso,
    });
    const plan = buildOwnerDecisionChangePlan(brief, response);

    expect(plan.authorization).toEqual({
      changePreparationAuthorized: true,
      runtimeApplicationAuthorized: false,
      productionWriteAuthorized: false,
      deployAuthorized: false,
      autoMergeAuthorized: false,
    });
    expect(plan.safety).toEqual({
      executesSql: false,
      usesSupabaseClient: false,
      mutatesProductionRows: false,
      changesRuntimeScoreLogic: false,
      changesUi: false,
      changesEnvOrDeploy: false,
      enablesRuntimeFlag: false,
    });
    expect(plan.forbiddenOperations).toEqual(
      expect.arrayContaining([
        'production database write',
        'deploy',
        'runtime flag enablement',
        'automatic merge of behavior-changing code',
      ]),
    );
  });
});
