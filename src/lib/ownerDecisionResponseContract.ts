import type {
  OwnerAttentionKind,
  OwnerAttentionReviewBrief,
  OwnerAttentionReviewBriefEntry,
} from './ownerAttentionReviewBriefFixture';

export type OwnerDecision = 'approved' | 'rejected' | 'needs_revision';
export type OwnerDecisionNextAction =
  | 'prepare_separate_change_pr'
  | 'stop_proposal'
  | 'revise_evidence_and_resubmit';

export interface OwnerDecisionRequest {
  packetId: string;
  decision: OwnerDecision;
  rationale: string;
  decidedAtIso: string;
}

export interface OwnerDecisionResponse {
  responseKind: 'owner_decision_response';
  accepted: boolean;
  packetId: string;
  decision: OwnerDecision;
  attentionKind?: OwnerAttentionKind;
  rationale: string;
  decidedAtIso: string;
  validationErrors: string[];
  nextAction?: OwnerDecisionNextAction;
  effectPolicy: {
    appliesRuntimeChange: false;
    appliesUiChange: false;
    appliesScoreChange: false;
    writesProductionData: false;
    executesSql: false;
    changesEnvOrDeploy: false;
    enablesRuntimeFlag: false;
    autoMergesBehaviorChange: false;
  };
}

function nextActionFor(decision: OwnerDecision): OwnerDecisionNextAction {
  if (decision === 'approved') return 'prepare_separate_change_pr';
  if (decision === 'rejected') return 'stop_proposal';
  return 'revise_evidence_and_resubmit';
}

function validateDecisionForEntry(
  entry: OwnerAttentionReviewBriefEntry,
  decision: OwnerDecision,
): string[] {
  const errors: string[] = [];

  if (decision === 'approved' && entry.attentionKind === 'blocked') {
    errors.push('blocked semantic safety issues cannot be approved');
  }
  if (decision === 'approved' && entry.attentionKind === 'operational_safety_violation') {
    errors.push('operational safety violations cannot be approved');
  }

  return errors;
}

export function buildOwnerDecisionResponse(
  brief: OwnerAttentionReviewBrief,
  request: OwnerDecisionRequest,
): OwnerDecisionResponse {
  const entry = brief.entries.find((candidate) => candidate.packetId === request.packetId);
  const validationErrors = entry
    ? validateDecisionForEntry(entry, request.decision)
    : ['packet is not present in owner attention brief'];
  const accepted = validationErrors.length === 0;

  return {
    responseKind: 'owner_decision_response',
    accepted,
    packetId: request.packetId,
    decision: request.decision,
    attentionKind: entry?.attentionKind,
    rationale: request.rationale,
    decidedAtIso: request.decidedAtIso,
    validationErrors,
    nextAction: accepted ? nextActionFor(request.decision) : undefined,
    effectPolicy: {
      appliesRuntimeChange: false,
      appliesUiChange: false,
      appliesScoreChange: false,
      writesProductionData: false,
      executesSql: false,
      changesEnvOrDeploy: false,
      enablesRuntimeFlag: false,
      autoMergesBehaviorChange: false,
    },
  };
}
