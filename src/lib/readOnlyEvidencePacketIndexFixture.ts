import { buildReadOnlyEvidencePacketExportFixture } from './readOnlyEvidencePacketExportFixture';
import { buildProductionReadOnlyImpactDryRun } from './productionReadOnlyImpactDryRun';
import type { ProductionReadOnlyRows } from './productionReadOnlyRowAdapter';
import { buildProductionReadOnlySqlTemplateGuardReport } from './productionReadOnlySqlTemplateGuard';
import {
  assertReadOnlyEvidencePacketSafe,
  buildReadOnlyEvidencePacket,
  type ReadOnlyEvidencePacket,
  type ReadOnlyEvidencePacketGateDecision,
} from './readOnlyEvidencePacketSchema';

export interface ReadOnlyEvidencePacketIndexEntry {
  packetId: string;
  source: ReadOnlyEvidencePacket['source'];
  executionState: ReadOnlyEvidencePacket['executionState'];
  gateDecision: ReadOnlyEvidencePacketGateDecision;
  requiresOwnerApproval: boolean;
  blocked: boolean;
  operationallySafe: boolean;
  productsCompared: number;
  allergyHitChangedProducts: number;
  scoreChangedProducts: number;
  displayChangedProducts: number;
  rankingChangedProducts: number;
  requiredApproval: string[];
  blockedReasons: string[];
}

export interface ReadOnlyEvidencePacketIndex {
  indexKind: 'read_only_evidence_packet_index';
  schemaVersion: 1;
  entries: ReadOnlyEvidencePacketIndexEntry[];
  summary: {
    packetsIndexed: number;
    safePackets: number;
    approvalRequiredPackets: number;
    blockedPackets: number;
    ownerAttentionPackets: number;
    operationalSafetyViolationPackets: number;
    fixturePackets: number;
    productionReadOnlyPackets: number;
  };
  queues: {
    safePacketIds: string[];
    approvalRequiredPacketIds: string[];
    blockedPacketIds: string[];
    ownerAttentionPacketIds: string[];
    operationalSafetyViolationPacketIds: string[];
  };
  safety: {
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

function toEntry(packet: ReadOnlyEvidencePacket): ReadOnlyEvidencePacketIndexEntry {
  const harnessGate = packet.dryRun.impactDiff.harnessGate;

  return {
    packetId: packet.packetId,
    source: packet.source,
    executionState: packet.executionState,
    gateDecision: packet.summary.gateDecision,
    requiresOwnerApproval: packet.summary.requiresOwnerApproval,
    blocked: packet.summary.blocked,
    operationallySafe: assertReadOnlyEvidencePacketSafe(packet),
    productsCompared: packet.summary.productsCompared,
    allergyHitChangedProducts: packet.summary.allergyHitChangedProducts,
    scoreChangedProducts: packet.summary.scoreChangedProducts,
    displayChangedProducts: packet.summary.displayChangedProducts,
    rankingChangedProducts: packet.summary.rankingChangedProducts,
    requiredApproval: harnessGate.requiredApproval,
    blockedReasons: harnessGate.blockedReasons,
  };
}

export function buildReadOnlyEvidencePacketIndex(
  packets: ReadOnlyEvidencePacket[],
): ReadOnlyEvidencePacketIndex {
  const entries = packets.map(toEntry);
  const safePacketIds = entries
    .filter((entry) => entry.gateDecision === 'safe')
    .map((entry) => entry.packetId);
  const approvalRequiredPacketIds = entries
    .filter((entry) => entry.gateDecision === 'approval_required')
    .map((entry) => entry.packetId);
  const blockedPacketIds = entries
    .filter((entry) => entry.gateDecision === 'blocked')
    .map((entry) => entry.packetId);
  const operationalSafetyViolationPacketIds = entries
    .filter((entry) => !entry.operationallySafe)
    .map((entry) => entry.packetId);
  const ownerAttentionPacketIds = entries
    .filter(
      (entry) =>
        entry.gateDecision === 'approval_required' ||
        entry.gateDecision === 'blocked' ||
        !entry.operationallySafe,
    )
    .map((entry) => entry.packetId);

  return {
    indexKind: 'read_only_evidence_packet_index',
    schemaVersion: 1,
    entries,
    summary: {
      packetsIndexed: entries.length,
      safePackets: safePacketIds.length,
      approvalRequiredPackets: approvalRequiredPacketIds.length,
      blockedPackets: blockedPacketIds.length,
      ownerAttentionPackets: ownerAttentionPacketIds.length,
      operationalSafetyViolationPackets: operationalSafetyViolationPacketIds.length,
      fixturePackets: entries.filter((entry) => entry.source === 'fixture').length,
      productionReadOnlyPackets: entries.filter((entry) => entry.source === 'production_read_only').length,
    },
    queues: {
      safePacketIds,
      approvalRequiredPacketIds,
      blockedPacketIds,
      ownerAttentionPacketIds,
      operationalSafetyViolationPacketIds,
    },
    safety: {
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

function withGate(
  packet: ReadOnlyEvidencePacket,
  input: {
    packetId: string;
    decision: ReadOnlyEvidencePacketGateDecision;
    requiredApproval?: string[];
    blockedReasons?: string[];
  },
): ReadOnlyEvidencePacket {
  const requiredApproval = input.requiredApproval ?? [];
  const blockedReasons = input.blockedReasons ?? [];

  return {
    ...packet,
    packetId: input.packetId,
    summary: {
      ...packet.summary,
      gateDecision: input.decision,
      requiresOwnerApproval: input.decision === 'approval_required',
      blocked: input.decision === 'blocked',
    },
    dryRun: {
      ...packet.dryRun,
      impactDiff: {
        ...packet.dryRun.impactDiff,
        harnessGate: {
          ...packet.dryRun.impactDiff.harnessGate,
          decision: input.decision,
          requiredApproval,
          blockedReasons,
        },
      },
    },
  };
}

function buildNoVisibleDiffPacket(): ReadOnlyEvidencePacket {
  const noDiffRows: ProductionReadOnlyRows = {
    products: [{ id: 'p-safe', name: 'No visible diff sample' }],
    productIngredients: [{ productId: 'p-safe', ingredientId: 'i-safe', position: 1 }],
    ingredients: [{ id: 'i-safe', nameKo: '동물성부산물' }],
    signals: [
      {
        productId: 'p-safe',
        allergyHits: [],
        score: 72,
        displayScore: 72,
        rankingPosition: 1,
      },
    ],
  };
  const dryRun = buildProductionReadOnlyImpactDryRun({
    hypothesisId: 'fixture-safe-no-visible-diff',
    hypothesisStatement: 'Identical before and after rows should remain safe and stay out of owner attention.',
    beforeRows: noDiffRows,
    afterRows: noDiffRows,
  });

  return buildReadOnlyEvidencePacket({
    packetId: 'fixture-safe-no-visible-diff',
    source: 'fixture',
    executionState: 'fixture_generated',
    generatedAtIso: '2026-08-20T00:00:00.000Z',
    templateGuard: buildProductionReadOnlySqlTemplateGuardReport(),
    dryRun,
  });
}

export function buildReadOnlyEvidencePacketIndexFixture(): ReadOnlyEvidencePacketIndex {
  const safe = buildNoVisibleDiffPacket();
  const base = buildReadOnlyEvidencePacketExportFixture().packet;
  const approvalRequired = withGate(base, {
    packetId: 'fixture-visible-allergy-score-diff',
    decision: 'approval_required',
    requiredApproval: [
      'allergy_hit change requires owner approval',
      'score change requires owner approval',
      'display_verdict change requires owner approval',
      'ranking change requires owner approval',
    ],
  });
  const blocked = withGate(base, {
    packetId: 'fixture-unsafe-semantic-collapse',
    decision: 'blocked',
    blockedReasons: [
      'generic or unknown animal byproduct must not be collapsed into a named ordinary meat source',
    ],
  });

  return buildReadOnlyEvidencePacketIndex([safe, approvalRequired, blocked]);
}
