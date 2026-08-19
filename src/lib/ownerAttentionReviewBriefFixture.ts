import {
  buildReadOnlyEvidencePacketIndexFixture,
  type ReadOnlyEvidencePacketIndex,
  type ReadOnlyEvidencePacketIndexEntry,
} from './readOnlyEvidencePacketIndexFixture';

export type OwnerAttentionKind =
  | 'approval_required'
  | 'blocked'
  | 'operational_safety_violation';

export interface OwnerAttentionReviewBriefEntry {
  packetId: string;
  attentionKind: OwnerAttentionKind;
  headline: string;
  source: ReadOnlyEvidencePacketIndexEntry['source'];
  executionState: ReadOnlyEvidencePacketIndexEntry['executionState'];
  operationallySafe: boolean;
  changedSurfaceSummary: string[];
  approvalReasons: string[];
  blockedReasons: string[];
  ownerAction: string;
}

export interface OwnerAttentionReviewBrief {
  briefKind: 'owner_attention_review_brief';
  schemaVersion: 1;
  entries: OwnerAttentionReviewBriefEntry[];
  summary: {
    ownerAttentionEntries: number;
    approvalRequiredEntries: number;
    blockedEntries: number;
    operationalSafetyViolationEntries: number;
    safeEntriesOmitted: number;
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

function changedSurfaceSummary(entry: ReadOnlyEvidencePacketIndexEntry): string[] {
  const summary: string[] = [];
  if (entry.allergyHitChangedProducts > 0) {
    summary.push(`allergy_hit:${entry.allergyHitChangedProducts}`);
  }
  if (entry.scoreChangedProducts > 0) {
    summary.push(`score:${entry.scoreChangedProducts}`);
  }
  if (entry.displayChangedProducts > 0) {
    summary.push(`display_verdict:${entry.displayChangedProducts}`);
  }
  if (entry.rankingChangedProducts > 0) {
    summary.push(`ranking:${entry.rankingChangedProducts}`);
  }
  return summary;
}

function attentionKind(entry: ReadOnlyEvidencePacketIndexEntry): OwnerAttentionKind {
  if (!entry.operationallySafe) return 'operational_safety_violation';
  if (entry.gateDecision === 'blocked') return 'blocked';
  return 'approval_required';
}

function headlineFor(kind: OwnerAttentionKind): string {
  if (kind === 'blocked') return 'Blocked semantic safety issue';
  if (kind === 'operational_safety_violation') return 'Operational safety boundary violation';
  return 'Owner approval required for visible behavior impact';
}

function ownerActionFor(kind: OwnerAttentionKind): string {
  if (kind === 'blocked') return 'Do not merge until the blocked semantic issue is resolved.';
  if (kind === 'operational_safety_violation') {
    return 'Stop and inspect the write/runtime/deploy safety boundary before proceeding.';
  }
  return 'Review the proposed user-visible behavior impact before merge.';
}

export function buildOwnerAttentionReviewBrief(
  index: ReadOnlyEvidencePacketIndex,
): OwnerAttentionReviewBrief {
  const ownerAttentionIds = new Set(index.queues.ownerAttentionPacketIds);
  const entries = index.entries
    .filter((entry) => ownerAttentionIds.has(entry.packetId))
    .map((entry) => {
      const kind = attentionKind(entry);
      return {
        packetId: entry.packetId,
        attentionKind: kind,
        headline: headlineFor(kind),
        source: entry.source,
        executionState: entry.executionState,
        operationallySafe: entry.operationallySafe,
        changedSurfaceSummary: changedSurfaceSummary(entry),
        approvalReasons: entry.requiredApproval,
        blockedReasons: entry.blockedReasons,
        ownerAction: ownerActionFor(kind),
      };
    });

  return {
    briefKind: 'owner_attention_review_brief',
    schemaVersion: 1,
    entries,
    summary: {
      ownerAttentionEntries: entries.length,
      approvalRequiredEntries: entries.filter(
        (entry) => entry.attentionKind === 'approval_required',
      ).length,
      blockedEntries: entries.filter((entry) => entry.attentionKind === 'blocked').length,
      operationalSafetyViolationEntries: entries.filter(
        (entry) => entry.attentionKind === 'operational_safety_violation',
      ).length,
      safeEntriesOmitted: index.summary.safePackets,
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

export function buildOwnerAttentionReviewBriefFixture(): OwnerAttentionReviewBrief {
  return buildOwnerAttentionReviewBrief(buildReadOnlyEvidencePacketIndexFixture());
}
