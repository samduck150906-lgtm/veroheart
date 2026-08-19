import { describe, expect, it } from 'vitest';
import { buildSampledReportPacketFixture } from './sampledReportPacketFixture';

describe('sampled report packet fixture', () => {
  it('combines template guard and read-only impact dry-run evidence', () => {
    const packet = buildSampledReportPacketFixture();

    expect(packet.packetKind).toBe('sampled_report_packet_fixture');
    expect(packet.summary).toEqual({
      validTemplateShapes: 4,
      invalidTemplateShapes: 0,
      beforeProductsRead: 3,
      afterProductsRead: 3,
      productsCompared: 3,
      allergyHitChangedProducts: 2,
      scoreChangedProducts: 2,
      displayChangedProducts: 2,
      rankingChangedProducts: 3,
      missingJoinOrSignalWarnings: 0,
      gateDecision: 'approval_required',
    });
  });

  it('keeps unknown animal byproduct unchanged while named source rows change', () => {
    const packet = buildSampledReportPacketFixture();
    const byProductId = new Map(packet.dryRun.impactDiff.rows.map((row) => [row.productId, row]));

    expect(byProductId.get('p1')?.allergyHitsAfter).toEqual(['닭']);
    expect(byProductId.get('p1')?.scoreAfter).toBe(0);
    expect(byProductId.get('p2')?.allergyHitsAfter).toEqual([]);
    expect(byProductId.get('p2')?.scoreDelta).toBe(0);
    expect(byProductId.get('p3')?.allergyHitsAfter).toEqual(['생선']);
    expect(byProductId.get('p3')?.displayScoreAfter).toBe(0);
  });

  it('routes behavior-impacting sampled evidence through approval required gate', () => {
    const packet = buildSampledReportPacketFixture();

    expect(packet.dryRun.impactDiff.harnessGate.decision).toBe('approval_required');
    expect(packet.dryRun.impactDiff.harnessGate.requiredApproval).toEqual(
      expect.arrayContaining([
        'allergy_hit change requires owner approval',
        'score change requires owner approval',
        'display_verdict change requires owner approval',
        'ranking change requires owner approval',
      ]),
    );
  });

  it('stays non-runtime and non-operational', () => {
    const packet = buildSampledReportPacketFixture();

    expect(packet.safety).toEqual({
      executesSql: false,
      usesSupabaseClient: false,
      mutatesProductionRows: false,
      changesRuntimeScoreLogic: false,
      changesUi: false,
      changesEnvOrDeploy: false,
      appRuntimeApproved: false,
    });
    expect(packet.templateGuard.safety.executesSql).toBe(false);
    expect(packet.dryRun.safety.usesSupabaseClient).toBe(false);
  });
});
