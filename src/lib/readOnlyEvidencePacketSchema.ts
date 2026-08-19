import type { ProductionReadOnlyImpactDryRunReport } from './productionReadOnlyImpactDryRun';
import type { ProductionReadOnlySqlTemplateGuardReport } from './productionReadOnlySqlTemplateGuard';

export type ReadOnlyEvidencePacketSource = 'fixture' | 'production_read_only';
export type ReadOnlyEvidencePacketExecutionState = 'not_executed' | 'fixture_generated' | 'read_only_result_attached';
export type ReadOnlyEvidencePacketGateDecision = 'safe' | 'approval_required' | 'blocked';

export interface ReadOnlyEvidencePacketInput {
  packetId: string;
  source: ReadOnlyEvidencePacketSource;
  executionState: ReadOnlyEvidencePacketExecutionState;
  templateGuard: ProductionReadOnlySqlTemplateGuardReport;
  dryRun: ProductionReadOnlyImpactDryRunReport;
  generatedAtIso: string;
}

export interface ReadOnlyEvidencePacket {
  packetKind: 'read_only_evidence_packet';
  packetId: string;
  source: ReadOnlyEvidencePacketSource;
  executionState: ReadOnlyEvidencePacketExecutionState;
  generatedAtIso: string;
  templateGuard: ProductionReadOnlySqlTemplateGuardReport;
  dryRun: ProductionReadOnlyImpactDryRunReport;
  summary: {
    validTemplateShapes: number;
    invalidTemplateShapes: number;
    productsCompared: number;
    allergyHitChangedProducts: number;
    scoreChangedProducts: number;
    displayChangedProducts: number;
    rankingChangedProducts: number;
    missingJoinOrSignalWarnings: number;
    gateDecision: ReadOnlyEvidencePacketGateDecision;
    requiresOwnerApproval: boolean;
    blocked: boolean;
  };
  provenance: {
    fixtureDerived: boolean;
    productionReadOnlyDerived: boolean;
    productionWriteDerived: false;
    sqlExecutionIncluded: false;
    appRuntimeIncluded: false;
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

function toGateDecision(decision: string): ReadOnlyEvidencePacketGateDecision {
  if (decision === 'blocked') return 'blocked';
  if (decision === 'approval_required') return 'approval_required';
  return 'safe';
}

export function buildReadOnlyEvidencePacket(input: ReadOnlyEvidencePacketInput): ReadOnlyEvidencePacket {
  const gateDecision = toGateDecision(input.dryRun.impactDiff.harnessGate.decision);

  return {
    packetKind: 'read_only_evidence_packet',
    packetId: input.packetId,
    source: input.source,
    executionState: input.executionState,
    generatedAtIso: input.generatedAtIso,
    templateGuard: input.templateGuard,
    dryRun: input.dryRun,
    summary: {
      validTemplateShapes: input.templateGuard.summary.validTemplates,
      invalidTemplateShapes: input.templateGuard.summary.invalidTemplates,
      productsCompared: input.dryRun.summary.productsCompared,
      allergyHitChangedProducts: input.dryRun.summary.allergyHitChangedProducts,
      scoreChangedProducts: input.dryRun.summary.scoreChangedProducts,
      displayChangedProducts: input.dryRun.summary.displayChangedProducts,
      rankingChangedProducts: input.dryRun.summary.rankingChangedProducts,
      missingJoinOrSignalWarnings: input.dryRun.summary.missingJoinOrSignalWarnings,
      gateDecision,
      requiresOwnerApproval: gateDecision === 'approval_required',
      blocked: gateDecision === 'blocked',
    },
    provenance: {
      fixtureDerived: input.source === 'fixture',
      productionReadOnlyDerived: input.source === 'production_read_only',
      productionWriteDerived: false,
      sqlExecutionIncluded: false,
      appRuntimeIncluded: false,
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

export function assertReadOnlyEvidencePacketSafe(packet: ReadOnlyEvidencePacket): boolean {
  return (
    !packet.safety.executesSql &&
    !packet.safety.usesSupabaseClient &&
    !packet.safety.mutatesProductionRows &&
    !packet.safety.changesRuntimeScoreLogic &&
    !packet.safety.changesUi &&
    !packet.safety.changesEnvOrDeploy &&
    !packet.safety.appRuntimeApproved &&
    !packet.safety.productionWriteApproved &&
    !packet.provenance.productionWriteDerived &&
    !packet.provenance.sqlExecutionIncluded &&
    !packet.provenance.appRuntimeIncluded
  );
}
