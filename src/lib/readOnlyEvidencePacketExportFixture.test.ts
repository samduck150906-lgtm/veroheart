import { describe, expect, it } from 'vitest';
import { buildReadOnlyEvidencePacketExportFixture } from './readOnlyEvidencePacketExportFixture';

describe('read-only evidence packet export fixture', () => {
  it('exports a stable agent-readable review artifact', () => {
    const artifact = buildReadOnlyEvidencePacketExportFixture();

    expect(artifact.artifactKind).toBe('read_only_evidence_packet_export_fixture');
    expect(artifact.schemaVersion).toBe(1);
    expect(artifact.exportedAtIso).toBe('2026-08-20T00:00:00.000Z');
    expect(artifact.reviewSummary).toEqual({
      packetId: 'read-only-evidence-export-fixture',
      source: 'fixture',
      executionState: 'fixture_generated',
      gateDecision: 'approval_required',
      requiresOwnerApproval: true,
      blocked: false,
      productsCompared: 3,
      allergyHitChangedProducts: 2,
      scoreChangedProducts: 2,
      displayChangedProducts: 2,
      rankingChangedProducts: 3,
    });
  });

  it('preserves named-source allergy changes and unknown-source non-match in exported rows', () => {
    const artifact = buildReadOnlyEvidencePacketExportFixture();
    const byProductId = new Map(
      artifact.packet.dryRun.impactDiff.rows.map((row) => [row.productId, row]),
    );

    expect(byProductId.get('p1')?.allergyHitsAfter).toEqual(['닭']);
    expect(byProductId.get('p1')?.displayScoreAfter).toBe(0);
    expect(byProductId.get('p2')?.allergyHitsAfter).toEqual([]);
    expect(byProductId.get('p2')?.scoreDelta).toBe(0);
    expect(byProductId.get('p3')?.allergyHitsAfter).toEqual(['계란']);
    expect(byProductId.get('p3')?.displayScoreAfter).toBe(0);
  });

  it('keeps approval and blocked metadata available for other agents', () => {
    const artifact = buildReadOnlyEvidencePacketExportFixture();

    expect(artifact.agentReadableSections.templateGuardSummary.validTemplates).toBe(4);
    expect(artifact.agentReadableSections.impactSummary.productsCompared).toBe(3);
    expect(artifact.agentReadableSections.requiredApproval).toEqual(
      expect.arrayContaining([
        'allergy_hit change requires owner approval',
        'score change requires owner approval',
        'display_verdict change requires owner approval',
        'ranking change requires owner approval',
      ]),
    );
    expect(artifact.agentReadableSections.blockedReasons).toEqual([]);
  });

  it('stays non-operational and safe to generate in tests', () => {
    const artifact = buildReadOnlyEvidencePacketExportFixture();

    expect(artifact.safetyChecklist).toEqual({
      safePacket: true,
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
