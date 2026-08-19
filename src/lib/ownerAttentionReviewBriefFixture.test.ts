import { describe, expect, it } from 'vitest';
import {
  buildReadOnlyEvidencePacketIndexFixture,
  type ReadOnlyEvidencePacketIndex,
} from './readOnlyEvidencePacketIndexFixture';
import {
  buildOwnerAttentionReviewBrief,
  buildOwnerAttentionReviewBriefFixture,
} from './ownerAttentionReviewBriefFixture';

describe('owner attention review brief fixture', () => {
  it('omits safe packets and keeps only approval-required and blocked entries', () => {
    const brief = buildOwnerAttentionReviewBriefFixture();

    expect(brief.briefKind).toBe('owner_attention_review_brief');
    expect(brief.schemaVersion).toBe(1);
    expect(brief.summary).toEqual({
      ownerAttentionEntries: 2,
      approvalRequiredEntries: 1,
      blockedEntries: 1,
      operationalSafetyViolationEntries: 0,
      safeEntriesOmitted: 1,
    });
    expect(brief.entries.map((entry) => entry.packetId)).toEqual([
      'fixture-visible-allergy-score-diff',
      'fixture-unsafe-semantic-collapse',
    ]);
    expect(brief.entries.map((entry) => entry.packetId)).not.toContain(
      'fixture-safe-no-visible-diff',
    );
  });

  it('compresses visible impact into a short changed-surface summary', () => {
    const brief = buildOwnerAttentionReviewBriefFixture();
    const approval = brief.entries.find(
      (entry) => entry.packetId === 'fixture-visible-allergy-score-diff',
    );

    expect(approval?.attentionKind).toBe('approval_required');
    expect(approval?.headline).toBe('Owner approval required for visible behavior impact');
    expect(approval?.changedSurfaceSummary).toEqual([
      'allergy_hit:2',
      'score:2',
      'display_verdict:2',
      'ranking:3',
    ]);
    expect(approval?.approvalReasons).toEqual(
      expect.arrayContaining([
        'allergy_hit change requires owner approval',
        'score change requires owner approval',
        'display_verdict change requires owner approval',
        'ranking change requires owner approval',
      ]),
    );
  });

  it('keeps blocked semantic reasons explicit and marks them do-not-merge', () => {
    const brief = buildOwnerAttentionReviewBriefFixture();
    const blocked = brief.entries.find(
      (entry) => entry.packetId === 'fixture-unsafe-semantic-collapse',
    );

    expect(blocked?.attentionKind).toBe('blocked');
    expect(blocked?.headline).toBe('Blocked semantic safety issue');
    expect(blocked?.blockedReasons).toEqual([
      'generic or unknown animal byproduct must not be collapsed into a named ordinary meat source',
    ]);
    expect(blocked?.ownerAction).toBe(
      'Do not merge until the blocked semantic issue is resolved.',
    );
  });

  it('surfaces an operationally unsafe packet even when its semantic gate is safe', () => {
    const fixtureIndex = buildReadOnlyEvidencePacketIndexFixture();
    const safeEntry = fixtureIndex.entries.find(
      (entry) => entry.packetId === 'fixture-safe-no-visible-diff',
    );
    if (!safeEntry) throw new Error('safe fixture entry missing');

    const operationallyUnsafe = { ...safeEntry, operationallySafe: false };
    const operationalIndex: ReadOnlyEvidencePacketIndex = {
      ...fixtureIndex,
      entries: [operationallyUnsafe],
      summary: {
        packetsIndexed: 1,
        safePackets: 0,
        approvalRequiredPackets: 0,
        blockedPackets: 0,
        ownerAttentionPackets: 1,
        operationalSafetyViolationPackets: 1,
        fixturePackets: 1,
        productionReadOnlyPackets: 0,
      },
      queues: {
        safePacketIds: [],
        approvalRequiredPacketIds: [],
        blockedPacketIds: [],
        ownerAttentionPacketIds: [operationallyUnsafe.packetId],
        operationalSafetyViolationPacketIds: [operationallyUnsafe.packetId],
      },
    };

    const brief = buildOwnerAttentionReviewBrief(operationalIndex);

    expect(brief.summary.operationalSafetyViolationEntries).toBe(1);
    expect(brief.entries[0]).toMatchObject({
      packetId: 'fixture-safe-no-visible-diff',
      attentionKind: 'operational_safety_violation',
      headline: 'Operational safety boundary violation',
      operationallySafe: false,
      ownerAction: 'Stop and inspect the write/runtime/deploy safety boundary before proceeding.',
    });
  });

  it('remains non-operational and app-invisible', () => {
    const brief = buildOwnerAttentionReviewBriefFixture();

    expect(brief.safety).toEqual({
      executesSql: false,
      usesSupabaseClient: false,
      mutatesProductionRows: false,
      changesRuntimeScoreLogic: false,
      changesUi: false,
      changesEnvOrDeploy: false,
      appRuntimeApproved: false,
      productionWriteApproved: false,
    });
  });
});
