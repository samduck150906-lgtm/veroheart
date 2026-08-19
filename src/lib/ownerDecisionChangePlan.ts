import type {
  OwnerAttentionReviewBrief,
  OwnerAttentionReviewBriefEntry,
} from './ownerAttentionReviewBriefFixture';
import type { OwnerDecisionResponse } from './ownerDecisionResponseContract';

export interface OwnerDecisionChangePlan {
  planKind: 'owner_decision_change_plan';
  packetId: string;
  eligibleForPreparation: boolean;
  validationErrors: string[];
  expectedChangedSurfaces: string[];
  requiredEvidence: string[];
  requiredTests: string[];
  forbiddenOperations: string[];
  authorization: {
    changePreparationAuthorized: boolean;
    runtimeApplicationAuthorized: false;
    productionWriteAuthorized: false;
    deployAuthorized: false;
    autoMergeAuthorized: false;
  };
  safety: {
    executesSql: false;
    usesSupabaseClient: false;
    mutatesProductionRows: false;
    changesRuntimeScoreLogic: false;
    changesUi: false;
    changesEnvOrDeploy: false;
    enablesRuntimeFlag: false;
  };
}

function testsFor(entry: OwnerAttentionReviewBriefEntry): string[] {
  const tests = new Set<string>();

  for (const surface of entry.changedSurfaceSummary) {
    if (surface.startsWith('allergy_hit:')) {
      tests.add('family-aware allergy matcher regression');
      tests.add('unknown animal byproduct negative guard');
    }
    if (surface.startsWith('score:')) {
      tests.add('score regression and cap behavior');
    }
    if (surface.startsWith('display_verdict:')) {
      tests.add('display verdict regression');
    }
    if (surface.startsWith('ranking:')) {
      tests.add('before/after ranking diff');
    }
  }

  return [...tests];
}

function evidenceFor(entry: OwnerAttentionReviewBriefEntry): string[] {
  const evidence = [
    'before/after affected-product diff',
    'owner-approved behavior scope',
    'semantic guard: unknown or generic animal source must not become named ordinary meat',
  ];

  if (entry.changedSurfaceSummary.some((surface) => surface.startsWith('allergy_hit:'))) {
    evidence.push('allergen source-family rationale');
  }

  return evidence;
}

export function buildOwnerDecisionChangePlan(
  brief: OwnerAttentionReviewBrief,
  response: OwnerDecisionResponse,
): OwnerDecisionChangePlan {
  const entry = brief.entries.find((candidate) => candidate.packetId === response.packetId);
  const validationErrors: string[] = [];

  if (!response.accepted) validationErrors.push('owner decision response was not accepted');
  if (response.decision !== 'approved') validationErrors.push('owner decision is not approved');
  if (response.nextAction !== 'prepare_separate_change_pr') {
    validationErrors.push('owner decision does not authorize change preparation');
  }
  if (!entry) validationErrors.push('packet is not present in owner attention brief');
  if (entry && entry.attentionKind !== 'approval_required') {
    validationErrors.push('only approval-required entries can produce a change plan');
  }

  const eligibleForPreparation = validationErrors.length === 0;

  return {
    planKind: 'owner_decision_change_plan',
    packetId: response.packetId,
    eligibleForPreparation,
    validationErrors,
    expectedChangedSurfaces: eligibleForPreparation && entry ? entry.changedSurfaceSummary : [],
    requiredEvidence: eligibleForPreparation && entry ? evidenceFor(entry) : [],
    requiredTests: eligibleForPreparation && entry ? testsFor(entry) : [],
    forbiddenOperations: [
      'production database write',
      'migration or rollback execution',
      'env secret url or token change',
      'deploy',
      'runtime flag enablement',
      'automatic merge of behavior-changing code',
    ],
    authorization: {
      changePreparationAuthorized: eligibleForPreparation,
      runtimeApplicationAuthorized: false,
      productionWriteAuthorized: false,
      deployAuthorized: false,
      autoMergeAuthorized: false,
    },
    safety: {
      executesSql: false,
      usesSupabaseClient: false,
      mutatesProductionRows: false,
      changesRuntimeScoreLogic: false,
      changesUi: false,
      changesEnvOrDeploy: false,
      enablesRuntimeFlag: false,
    },
  };
}
