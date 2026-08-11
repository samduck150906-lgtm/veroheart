import type { Phase2AliasIngredientResolution } from './phase2AliasResolverProductAdapter';

export type Phase2AliasShadowStatus = 'matched' | 'unmatched' | 'blocked' | 'ambiguous';
export type Phase2AliasShadowReviewState = 'sidecar_only' | 'review_required';

export interface Phase2AliasResolverShadowMetadataRow {
  ingredientId: string;
  rawNameKo: string;
  status: Phase2AliasShadowStatus;
  canonicalCandidate: string | null;
  canonicalCandidateId: string | null;
  aliasId: string | null;
  reviewState: Phase2AliasShadowReviewState;
  scoreImpactAllowed: false;
  runtimeMutationAllowed: false;
  visibleLabelReplacementAllowed: false;
  reason: string;
}

export interface Phase2AliasResolverShadowMetadataSummary {
  totalRows: number;
  matchedRows: number;
  unmatchedRows: number;
  blockedRows: number;
  ambiguousRows: number;
  reviewRequiredRows: number;
  sidecarOnlyRows: number;
  scoreImpactAllowedRows: 0;
  runtimeMutationAllowedRows: 0;
  visibleLabelReplacementAllowedRows: 0;
}

function toShadowReviewState(status: Phase2AliasShadowStatus): Phase2AliasShadowReviewState {
  return status === 'matched' ? 'sidecar_only' : 'review_required';
}

function toShadowReason(status: Phase2AliasShadowStatus): string {
  switch (status) {
    case 'matched':
      return 'exact_normalized_candidate_sidecar_only';
    case 'unmatched':
      return 'no_exact_normalized_match_review_required';
    case 'blocked':
      return 'blocked_review_only_term_no_positive_score_effect';
    case 'ambiguous':
      return 'multiple_candidates_review_required';
  }
}

export function toPhase2AliasShadowMetadataRow(
  resolution: Phase2AliasIngredientResolution,
): Phase2AliasResolverShadowMetadataRow {
  const decision = resolution.decision;
  const status = decision.status as Phase2AliasShadowStatus;

  return {
    ingredientId: resolution.ingredientId,
    rawNameKo: resolution.rawNameKo,
    status,
    canonicalCandidate: decision.status === 'matched' ? decision.canonicalName : null,
    canonicalCandidateId: decision.status === 'matched' ? decision.canonicalId : null,
    aliasId: decision.status === 'matched' ? decision.aliasId ?? null : null,
    reviewState: toShadowReviewState(status),
    scoreImpactAllowed: false,
    runtimeMutationAllowed: false,
    visibleLabelReplacementAllowed: false,
    reason: toShadowReason(status),
  };
}

export function toPhase2AliasShadowMetadataRows(
  resolutions: Phase2AliasIngredientResolution[],
): Phase2AliasResolverShadowMetadataRow[] {
  return resolutions.map(toPhase2AliasShadowMetadataRow);
}

export function summarizePhase2AliasShadowMetadataRows(
  rows: Phase2AliasResolverShadowMetadataRow[],
): Phase2AliasResolverShadowMetadataSummary {
  const matchedRows = rows.filter((row) => row.status === 'matched').length;
  const unmatchedRows = rows.filter((row) => row.status === 'unmatched').length;
  const blockedRows = rows.filter((row) => row.status === 'blocked').length;
  const ambiguousRows = rows.filter((row) => row.status === 'ambiguous').length;
  const reviewRequiredRows = rows.filter((row) => row.reviewState === 'review_required').length;
  const sidecarOnlyRows = rows.filter((row) => row.reviewState === 'sidecar_only').length;

  return {
    totalRows: rows.length,
    matchedRows,
    unmatchedRows,
    blockedRows,
    ambiguousRows,
    reviewRequiredRows,
    sidecarOnlyRows,
    scoreImpactAllowedRows: 0,
    runtimeMutationAllowedRows: 0,
    visibleLabelReplacementAllowedRows: 0,
  };
}
