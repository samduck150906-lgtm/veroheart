import { describe, expect, it } from 'vitest';
import {
  buildOwnerAttentionReviewBriefFixture,
  type OwnerAttentionReviewBrief,
} from './ownerAttentionReviewBriefFixture';
import { buildOwnerDecisionResponse } from './ownerDecisionResponseContract';

const decidedAtIso = '2026-08-20T00:00:00.000Z';

describe('owner decision response contract', () => {
  it('records approval for an approval-required packet without applying the change', () => {
    const brief = buildOwnerAttentionReviewBriefFixture();
    const response = buildOwnerDecisionResponse(brief, {
      packetId: 'fixture-visible-allergy-score-diff',
      decision: 'approved',
      rationale: 'Visible behavior impact reviewed and accepted.',
      decidedAtIso,
    });

    expect(response).toMatchObject({
      responseKind: 'owner_decision_response',
      accepted: true,
      packetId: 'fixture-visible-allergy-score-diff',
      decision: 'approved',
      attentionKind: 'approval_required',
      validationErrors: [],
      nextAction: 'prepare_separate_change_pr',
    });
    expect(response.effectPolicy).toEqual({
      appliesRuntimeChange: false,
      appliesUiChange: false,
      appliesScoreChange: false,
      writesProductionData: false,
      executesSql: false,
      changesEnvOrDeploy: false,
      enablesRuntimeFlag: false,
      autoMergesBehaviorChange: false,
    });
  });

  it('records reject and revision decisions as non-operational outcomes', () => {
    const brief = buildOwnerAttentionReviewBriefFixture();

    const rejected = buildOwnerDecisionResponse(brief, {
      packetId: 'fixture-visible-allergy-score-diff',
      decision: 'rejected',
      rationale: 'Do not change the visible behavior.',
      decidedAtIso,
    });
    const revision = buildOwnerDecisionResponse(brief, {
      packetId: 'fixture-visible-allergy-score-diff',
      decision: 'needs_revision',
      rationale: 'Need a narrower diff before deciding.',
      decidedAtIso,
    });

    expect(rejected.accepted).toBe(true);
    expect(rejected.nextAction).toBe('stop_proposal');
    expect(revision.accepted).toBe(true);
    expect(revision.nextAction).toBe('revise_evidence_and_resubmit');
  });

  it('does not allow a blocked semantic safety issue to be approved', () => {
    const brief = buildOwnerAttentionReviewBriefFixture();
    const response = buildOwnerDecisionResponse(brief, {
      packetId: 'fixture-unsafe-semantic-collapse',
      decision: 'approved',
      rationale: 'Attempted approval should be rejected by contract.',
      decidedAtIso,
    });

    expect(response.accepted).toBe(false);
    expect(response.nextAction).toBeUndefined();
    expect(response.validationErrors).toEqual([
      'blocked semantic safety issues cannot be approved',
    ]);
  });

  it('does not allow an operational safety violation to be approved', () => {
    const base = buildOwnerAttentionReviewBriefFixture();
    const operationalBrief: OwnerAttentionReviewBrief = {
      ...base,
      entries: [
        {
          ...base.entries[0],
          packetId: 'fixture-operational-safety-violation',
          attentionKind: 'operational_safety_violation',
          headline: 'Operational safety boundary violation',
          operationallySafe: false,
          approvalReasons: [],
          blockedReasons: [],
          ownerAction: 'Stop and inspect the write/runtime/deploy safety boundary before proceeding.',
        },
      ],
      summary: {
        ownerAttentionEntries: 1,
        approvalRequiredEntries: 0,
        blockedEntries: 0,
        operationalSafetyViolationEntries: 1,
        safeEntriesOmitted: 0,
      },
    };

    const response = buildOwnerDecisionResponse(operationalBrief, {
      packetId: 'fixture-operational-safety-violation',
      decision: 'approved',
      rationale: 'Attempted approval should be rejected by contract.',
      decidedAtIso,
    });

    expect(response.accepted).toBe(false);
    expect(response.validationErrors).toEqual([
      'operational safety violations cannot be approved',
    ]);
  });

  it('rejects decisions for packets that were not surfaced to owner attention', () => {
    const brief = buildOwnerAttentionReviewBriefFixture();
    const response = buildOwnerDecisionResponse(brief, {
      packetId: 'fixture-safe-no-visible-diff',
      decision: 'approved',
      rationale: 'Safe packet should never require an owner decision.',
      decidedAtIso,
    });

    expect(response.accepted).toBe(false);
    expect(response.validationErrors).toEqual([
      'packet is not present in owner attention brief',
    ]);
  });
});
