import {
  resolvePhase2Alias,
  type Phase2AliasResolverInput,
  type Phase2AliasResolverMatch,
  type Phase2AliasResolverResult,
} from './phase2AliasResolver';

export interface Phase2AliasResolverFeatureFlags {
  /**
   * Phase 2 alias resolver wiring is intentionally disabled by default.
   * Turning this on for runtime/scoring requires a separate reviewed PR and owner approval.
   */
  phase2AliasResolver?: boolean;
}

export const DEFAULT_PHASE2_ALIAS_RESOLVER_FEATURE_FLAGS = {
  phase2AliasResolver: false,
} as const satisfies Required<Phase2AliasResolverFeatureFlags>;

export interface Phase2AliasResolverFlaggedInput extends Phase2AliasResolverInput {
  flags?: Phase2AliasResolverFeatureFlags;
}

export interface Phase2AliasResolverFlaggedDecision {
  enabled: boolean;
  input: string;
  outputLabel: string;
  changed: false;
  status: 'disabled' | Phase2AliasResolverResult['status'];
  canonicalCandidate: Phase2AliasResolverMatch | null;
  resolverResult: Phase2AliasResolverResult | null;
  reason:
    | 'feature_flag_disabled'
    | 'candidate_only_no_runtime_change'
    | 'no_candidate_no_runtime_change'
    | 'review_only_no_runtime_change';
}

function isPhase2AliasResolverEnabled(flags?: Phase2AliasResolverFeatureFlags): boolean {
  return flags?.phase2AliasResolver === true;
}

/**
 * Disabled-by-default wiring scaffold for future Phase 2 alias resolver integration.
 *
 * Safety contract:
 * - default disabled/off
 * - disabled path preserves the raw label and does not call the resolver
 * - enabled path is candidate-only and still preserves the raw output label
 * - no scoring change, no product label creation, no runtime side effects
 */
export function resolvePhase2AliasBehindFeatureFlag(
  input: Phase2AliasResolverFlaggedInput,
): Phase2AliasResolverFlaggedDecision {
  if (!isPhase2AliasResolverEnabled(input.flags)) {
    return {
      enabled: false,
      input: input.label,
      outputLabel: input.label,
      changed: false,
      status: 'disabled',
      canonicalCandidate: null,
      resolverResult: null,
      reason: 'feature_flag_disabled',
    };
  }

  const resolverResult = resolvePhase2Alias(input);
  const canonicalCandidate = resolverResult.status === 'matched' ? (resolverResult.match ?? null) : null;
  const reason: Phase2AliasResolverFlaggedDecision['reason'] =
    resolverResult.status === 'matched'
      ? 'candidate_only_no_runtime_change'
      : resolverResult.status === 'blocked' || resolverResult.status === 'ambiguous'
        ? 'review_only_no_runtime_change'
        : 'no_candidate_no_runtime_change';

  return {
    enabled: true,
    input: input.label,
    outputLabel: input.label,
    changed: false,
    status: resolverResult.status,
    canonicalCandidate,
    resolverResult,
    reason,
  };
}
