export type Phase2AliasResolverStatus = 'matched' | 'unmatched' | 'ambiguous' | 'blocked';

export type Phase2AliasMatchKind = 'alias' | 'canonical';

export interface Phase2CanonicalSeed {
  canonicalName: string;
  canonicalId?: string;
}

export interface Phase2AliasSeed {
  alias: string;
  canonicalName: string;
  canonicalId?: string;
}

export interface Phase2AliasResolverInput {
  label: string;
  aliases: Phase2AliasSeed[];
  canonicals?: Phase2CanonicalSeed[];
  /**
   * Review-only excluded/dangerous terms. These terms must never silently resolve
   * into the low-risk alias seed, even when the normalized key is exact.
   */
  blockedTerms?: string[];
}

export interface Phase2AliasResolverMatch {
  canonicalName: string;
  canonicalId?: string;
  matchedValue: string;
  matchKind: Phase2AliasMatchKind;
}

export interface Phase2AliasResolverResult {
  status: Phase2AliasResolverStatus;
  input: string;
  normalizedInput: string;
  match?: Phase2AliasResolverMatch;
  candidates: Phase2AliasResolverMatch[];
  reason: string;
}

const NORMALIZATION_PATTERN = /[\s()[\]{}·,./_\-:;|+"'`~!@#$%^&*=<>?\\]/g;

export function normalizePhase2AliasKey(value: string): string {
  return value.normalize('NFKC').trim().toLowerCase().replace(NORMALIZATION_PATTERN, '');
}

function uniqueMatches(matches: Phase2AliasResolverMatch[]): Phase2AliasResolverMatch[] {
  const seen = new Set<string>();
  const unique: Phase2AliasResolverMatch[] = [];

  for (const match of matches) {
    const key = [match.canonicalId ?? '', match.canonicalName, match.matchedValue, match.matchKind].join('\u0000');
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(match);
  }

  return unique;
}

function hasAmbiguousCanonical(matches: Phase2AliasResolverMatch[]): boolean {
  const canonicalKeys = new Set(matches.map((match) => match.canonicalId || match.canonicalName));
  return canonicalKeys.size > 1;
}

/**
 * Resolve one raw ingredient label against the Phase 2 low-risk alias seed.
 *
 * Safety contract:
 * - exact normalized key equality only
 * - no substring matching
 * - no fuzzy matching
 * - no semantic inference
 * - blocked/dangerous review terms win over otherwise possible matches
 *
 * This helper is intentionally pure and is not imported by runtime scoring yet.
 */
export function resolvePhase2Alias(input: Phase2AliasResolverInput): Phase2AliasResolverResult {
  const normalizedInput = normalizePhase2AliasKey(input.label);

  if (!normalizedInput) {
    return {
      status: 'unmatched',
      input: input.label,
      normalizedInput,
      candidates: [],
      reason: 'empty_normalized_input',
    };
  }

  const blockedKeys = new Set((input.blockedTerms ?? []).map(normalizePhase2AliasKey).filter(Boolean));
  if (blockedKeys.has(normalizedInput)) {
    return {
      status: 'blocked',
      input: input.label,
      normalizedInput,
      candidates: [],
      reason: 'blocked_review_only_term',
    };
  }

  const aliasMatches = input.aliases
    .filter((aliasSeed) => normalizePhase2AliasKey(aliasSeed.alias) === normalizedInput)
    .map<Phase2AliasResolverMatch>((aliasSeed) => ({
      canonicalName: aliasSeed.canonicalName,
      canonicalId: aliasSeed.canonicalId,
      matchedValue: aliasSeed.alias,
      matchKind: 'alias',
    }));

  const canonicalMatches = (input.canonicals ?? [])
    .filter((canonicalSeed) => normalizePhase2AliasKey(canonicalSeed.canonicalName) === normalizedInput)
    .map<Phase2AliasResolverMatch>((canonicalSeed) => ({
      canonicalName: canonicalSeed.canonicalName,
      canonicalId: canonicalSeed.canonicalId,
      matchedValue: canonicalSeed.canonicalName,
      matchKind: 'canonical',
    }));

  const candidates = uniqueMatches([...aliasMatches, ...canonicalMatches]);

  if (candidates.length === 0) {
    return {
      status: 'unmatched',
      input: input.label,
      normalizedInput,
      candidates,
      reason: 'no_exact_normalized_match',
    };
  }

  if (hasAmbiguousCanonical(candidates)) {
    return {
      status: 'ambiguous',
      input: input.label,
      normalizedInput,
      candidates,
      reason: 'multiple_canonical_candidates',
    };
  }

  return {
    status: 'matched',
    input: input.label,
    normalizedInput,
    match: candidates[0],
    candidates,
    reason: 'exact_normalized_match',
  };
}
