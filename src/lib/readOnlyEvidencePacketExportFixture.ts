import { buildProductionReadOnlyImpactDryRun } from './productionReadOnlyImpactDryRun';
import type { ProductionReadOnlyRows } from './productionReadOnlyRowAdapter';
import { buildProductionReadOnlySqlTemplateGuardReport } from './productionReadOnlySqlTemplateGuard';
import {
  assertReadOnlyEvidencePacketSafe,
  buildReadOnlyEvidencePacket,
  type ReadOnlyEvidencePacket,
} from './readOnlyEvidencePacketSchema';

export interface ReadOnlyEvidencePacketExportFixture {
  artifactKind: 'read_only_evidence_packet_export_fixture';
  schemaVersion: 1;
  exportedAtIso: string;
  packet: ReadOnlyEvidencePacket;
  reviewSummary: {
    packetId: string;
    source: string;
    executionState: string;
    gateDecision: string;
    requiresOwnerApproval: boolean;
    blocked: boolean;
    productsCompared: number;
    allergyHitChangedProducts: number;
    scoreChangedProducts: number;
    displayChangedProducts: number;
    rankingChangedProducts: number;
  };
  agentReadableSections: {
    templateGuardSummary: ReadOnlyEvidencePacket['templateGuard']['summary'];
    impactSummary: ReadOnlyEvidencePacket['dryRun']['summary'];
    requiredApproval: string[];
    blockedReasons: string[];
  };
  safetyChecklist: {
    safePacket: boolean;
    executesSql: false;
    usesSupabaseClient: false;
    mutatesProductionRows: false;
    changesRuntimeScoreLogic: false;
    changesUi: false;
    changesEnvOrDeploy: false;
    appRuntimeApproved: false;
    productionWriteApproved: false;
  };
}

const beforeRows: ProductionReadOnlyRows = {
  products: [
    { id: 'p1', name: 'Chicken meal export sample' },
    { id: 'p2', name: 'Unknown byproduct export sample' },
    { id: 'p3', name: 'Egg white export sample' },
  ],
  productIngredients: [
    { productId: 'p1', ingredientId: 'i1', position: 1 },
    { productId: 'p2', ingredientId: 'i2', position: 1 },
    { productId: 'p3', ingredientId: 'i3', position: 1 },
  ],
  ingredients: [
    { id: 'i1', nameKo: '계육분' },
    { id: 'i2', nameKo: '동물성부산물' },
    { id: 'i3', nameKo: '난백' },
  ],
  signals: [
    { productId: 'p1', allergyHits: [], score: 84, displayScore: 84, rankingPosition: 1 },
    { productId: 'p2', allergyHits: [], score: 72, displayScore: 72, rankingPosition: 2 },
    { productId: 'p3', allergyHits: [], score: 76, displayScore: 76, rankingPosition: 3 },
  ],
};

const afterRows: ProductionReadOnlyRows = {
  ...beforeRows,
  signals: [
    { productId: 'p1', allergyHits: ['닭'], score: 0, displayScore: 0, rankingPosition: 3 },
    { productId: 'p2', allergyHits: [], score: 72, displayScore: 72, rankingPosition: 1 },
    { productId: 'p3', allergyHits: ['계란'], score: 0, displayScore: 0, rankingPosition: 2 },
  ],
};

export function buildReadOnlyEvidencePacketExportFixture(): ReadOnlyEvidencePacketExportFixture {
  const templateGuard = buildProductionReadOnlySqlTemplateGuardReport();
  const dryRun = buildProductionReadOnlyImpactDryRun({
    hypothesisId: 'read-only-evidence-packet-export-fixture',
    hypothesisStatement:
      'Exported read-only evidence packets should preserve template, impact, gate, and safety metadata in a stable agent-readable artifact.',
    beforeRows,
    afterRows,
  });
  const packet = buildReadOnlyEvidencePacket({
    packetId: 'read-only-evidence-export-fixture',
    source: 'fixture',
    executionState: 'fixture_generated',
    generatedAtIso: '2026-08-20T00:00:00.000Z',
    templateGuard,
    dryRun,
  });

  return {
    artifactKind: 'read_only_evidence_packet_export_fixture',
    schemaVersion: 1,
    exportedAtIso: '2026-08-20T00:00:00.000Z',
    packet,
    reviewSummary: {
      packetId: packet.packetId,
      source: packet.source,
      executionState: packet.executionState,
      gateDecision: packet.summary.gateDecision,
      requiresOwnerApproval: packet.summary.requiresOwnerApproval,
      blocked: packet.summary.blocked,
      productsCompared: packet.summary.productsCompared,
      allergyHitChangedProducts: packet.summary.allergyHitChangedProducts,
      scoreChangedProducts: packet.summary.scoreChangedProducts,
      displayChangedProducts: packet.summary.displayChangedProducts,
      rankingChangedProducts: packet.summary.rankingChangedProducts,
    },
    agentReadableSections: {
      templateGuardSummary: packet.templateGuard.summary,
      impactSummary: packet.dryRun.summary,
      requiredApproval: packet.dryRun.impactDiff.harnessGate.requiredApproval,
      blockedReasons: packet.dryRun.impactDiff.harnessGate.blockedReasons,
    },
    safetyChecklist: {
      safePacket: assertReadOnlyEvidencePacketSafe(packet),
      executesSql: false,
      usesSupabaseClient: false,
      mutatesProductionRows: false,
      changesRuntimeScoreLogic: false,
      changesUi: false,
      changesEnvOrDeploy: false,
      appRuntimeApproved: false,
      productionWriteApproved: false,
    },
  };
}
