import { describe, expect, it } from 'vitest';
import { buildReadOnlyEvidencePacketIndexFixture } from './readOnlyEvidencePacketIndexFixture';

describe('read-only evidence packet index fixture', () => {
  it('indexes safe approval-required and blocked packets separately', () => {
    const index = buildReadOnlyEvidencePacketIndexFixture();

    expect(index.indexKind).toBe('read_only_evidence_packet_index');
    expect(index.schemaVersion).toBe(1);
    expect(index.summary).toEqual({
      packetsIndexed: 3,
      safePackets: 1,
      approvalRequiredPackets: 1,
      blockedPackets: 1,
      ownerAttentionPackets: 2,
      operationalSafetyViolationPackets: 0,
      fixturePackets: 3,
      productionReadOnlyPackets: 0,
    });
  });

  it('surfaces only approval-required and blocked packets to owner attention', () => {
    const index = buildReadOnlyEvidencePacketIndexFixture();

    expect(index.queues.safePacketIds).toEqual(['fixture-safe-no-visible-diff']);
    expect(index.queues.approvalRequiredPacketIds).toEqual([
      'fixture-visible-allergy-score-diff',
    ]);
    expect(index.queues.blockedPacketIds).toEqual(['fixture-unsafe-semantic-collapse']);
    expect(index.queues.ownerAttentionPacketIds).toEqual([
      'fixture-visible-allergy-score-diff',
      'fixture-unsafe-semantic-collapse',
    ]);
    expect(index.queues.operationalSafetyViolationPacketIds).toEqual([]);
  });

  it('keeps the safe packet truly free of visible behavior diffs', () => {
    const index = buildReadOnlyEvidencePacketIndexFixture();
    const safe = index.entries.find((entry) => entry.packetId === 'fixture-safe-no-visible-diff');

    expect(safe).toMatchObject({
      gateDecision: 'safe',
      requiresOwnerApproval: false,
      blocked: false,
      allergyHitChangedProducts: 0,
      scoreChangedProducts: 0,
      displayChangedProducts: 0,
      rankingChangedProducts: 0,
    });
  });

  it('keeps approval and blocked reasons attached to the indexed packet', () => {
    const index = buildReadOnlyEvidencePacketIndexFixture();
    const byPacketId = new Map(index.entries.map((entry) => [entry.packetId, entry]));

    expect(byPacketId.get('fixture-visible-allergy-score-diff')?.requiredApproval).toEqual(
      expect.arrayContaining([
        'allergy_hit change requires owner approval',
        'score change requires owner approval',
        'display_verdict change requires owner approval',
        'ranking change requires owner approval',
      ]),
    );
    expect(byPacketId.get('fixture-unsafe-semantic-collapse')?.blockedReasons).toEqual([
      'generic or unknown animal byproduct must not be collapsed into a named ordinary meat source',
    ]);
  });

  it('remains operationally read-only even when a semantic packet is blocked', () => {
    const index = buildReadOnlyEvidencePacketIndexFixture();

    expect(index.entries.every((entry) => entry.operationallySafe)).toBe(true);
    expect(index.safety).toEqual({
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
