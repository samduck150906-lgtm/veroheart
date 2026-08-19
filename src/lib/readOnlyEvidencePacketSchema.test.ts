import { describe, expect, it } from 'vitest';
import { buildProductionReadOnlyImpactDryRun } from './productionReadOnlyImpactDryRun';
import type { ProductionReadOnlyRows } from './productionReadOnlyRowAdapter';
import { buildProductionReadOnlySqlTemplateGuardReport } from './productionReadOnlySqlTemplateGuard';
import {
  assertReadOnlyEvidencePacketSafe,
  buildReadOnlyEvidencePacket,
} from './readOnlyEvidencePacketSchema';

const beforeRows: ProductionReadOnlyRows = {
  products: [
    { id: 'p1', name: 'Chicken meal evidence sample' },
    { id: 'p2', name: 'Unknown byproduct evidence sample' },
  ],
  productIngredients: [
    { productId: 'p1', ingredientId: 'i1', position: 1 },
    { productId: 'p2', ingredientId: 'i2', position: 1 },
  ],
  ingredients: [
    { id: 'i1', nameKo: '계육분' },
    { id: 'i2', nameKo: '동물성부산물' },
  ],
  signals: [
    { productId: 'p1', allergyHits: [], score: 80, displayScore: 80, rankingPosition: 1 },
    { productId: 'p2', allergyHits: [], score: 70, displayScore: 70, rankingPosition: 2 },
  ],
};

const afterRows: ProductionReadOnlyRows = {
  ...beforeRows,
  signals: [
    { productId: 'p1', allergyHits: ['닭'], score: 0, displayScore: 0, rankingPosition: 2 },
    { productId: 'p2', allergyHits: [], score: 70, displayScore: 70, rankingPosition: 1 },
  ],
};

function fixturePacket() {
  return buildReadOnlyEvidencePacket({
    packetId: 'fixture-evidence-packet',
    source: 'fixture',
    executionState: 'fixture_generated',
    generatedAtIso: '2026-08-20T00:00:00.000Z',
    templateGuard: buildProductionReadOnlySqlTemplateGuardReport(),
    dryRun: buildProductionReadOnlyImpactDryRun({
      hypothesisId: 'read-only-evidence-packet-schema',
      hypothesisStatement: 'Evidence packets should preserve gate decisions and operational safety metadata.',
      beforeRows,
      afterRows,
    }),
  });
}

describe('read-only evidence packet schema', () => {
  it('summarizes template guard and dry-run evidence with gate metadata', () => {
    const packet = fixturePacket();

    expect(packet.packetKind).toBe('read_only_evidence_packet');
    expect(packet.packetId).toBe('fixture-evidence-packet');
    expect(packet.summary).toEqual({
      validTemplateShapes: 4,
      invalidTemplateShapes: 0,
      productsCompared: 2,
      allergyHitChangedProducts: 1,
      scoreChangedProducts: 1,
      displayChangedProducts: 1,
      rankingChangedProducts: 2,
      missingJoinOrSignalWarnings: 0,
      gateDecision: 'approval_required',
      requiresOwnerApproval: true,
      blocked: false,
    });
  });

  it('marks fixture and production-read-only provenance without allowing writes', () => {
    const fixture = fixturePacket();
    const productionReadOnly = buildReadOnlyEvidencePacket({
      ...fixture,
      source: 'production_read_only',
      executionState: 'read_only_result_attached',
      templateGuard: fixture.templateGuard,
      dryRun: fixture.dryRun,
    });

    expect(fixture.provenance).toEqual({
      fixtureDerived: true,
      productionReadOnlyDerived: false,
      productionWriteDerived: false,
      sqlExecutionIncluded: false,
      appRuntimeIncluded: false,
    });
    expect(productionReadOnly.provenance).toEqual({
      fixtureDerived: false,
      productionReadOnlyDerived: true,
      productionWriteDerived: false,
      sqlExecutionIncluded: false,
      appRuntimeIncluded: false,
    });
  });

  it('keeps the evidence packet operationally safe', () => {
    const packet = fixturePacket();

    expect(packet.safety).toEqual({
      executesSql: false,
      usesSupabaseClient: false,
      mutatesProductionRows: false,
      changesRuntimeScoreLogic: false,
      changesUi: false,
      changesEnvOrDeploy: false,
      appRuntimeApproved: false,
      productionWriteApproved: false,
    });
    expect(assertReadOnlyEvidencePacketSafe(packet)).toBe(true);
  });
});
