import { describe, expect, it } from 'vitest';
import { resolvePhase2Alias, type Phase2AliasSeed } from './phase2AliasResolver';
import {
  phase2CodeDryRunAliases,
  phase2CodeDryRunBlockedTerms,
  phase2CodeDryRunCanonicals,
  phase2CodeDryRunLabels,
  runPhase2AliasResolverCodeDryRun,
} from './phase2AliasResolverCodeDryRun.fixture';

describe('Phase 2 alias resolver code dry-run fixture', () => {
  it('produces the documented fixture summary', () => {
    const { summary } = runPhase2AliasResolverCodeDryRun();

    expect(summary).toEqual({
      total: 24,
      matched: 14,
      unmatched: 5,
      ambiguous: 0,
      blocked: 5,
    });
  });

  it('keeps fixture labels explicit and deterministic', () => {
    expect(phase2CodeDryRunLabels).toHaveLength(24);
    expect(new Set(phase2CodeDryRunLabels).size).toBe(24);
  });

  it('matches low-risk aliases and canonical spellings by exact normalized key only', () => {
    const { results } = runPhase2AliasResolverCodeDryRun();
    const matched = results.filter((result) => result.status === 'matched');

    expect(matched).toHaveLength(14);
    expect(matched.every((result) => result.match)).toBe(true);
    expect(matched.map((result) => result.input)).toEqual(
      expect.arrayContaining(['비타민 E', '혼합토코페롤', '오메가-3 지방산', '코코넛오일']),
    );
  });

  it('leaves unrelated legacy labels unmatched instead of inferring semantics', () => {
    const { results } = runPhase2AliasResolverCodeDryRun();
    const unmatched = results.filter((result) => result.status === 'unmatched');

    expect(unmatched.map((result) => result.input)).toEqual(
      expect.arrayContaining(['닭고기', '닭고기 분말', '로즈마리 추출물', '타우린', '현미']),
    );
    expect(unmatched.every((result) => result.reason === 'no_exact_normalized_match')).toBe(true);
  });

  it('blocks excluded dangerous/review-only terms before any match resolution', () => {
    const { results } = runPhase2AliasResolverCodeDryRun();
    const blocked = results.filter((result) => result.status === 'blocked');

    expect(blocked.map((result) => result.input)).toEqual(
      expect.arrayContaining(['닭간', '닭 지방', '동물성 지방', '소르빈산 칼륨', '향미증진제']),
    );
    expect(blocked.every((result) => result.candidates.length === 0)).toBe(true);
    expect(blocked.every((result) => result.reason === 'blocked_review_only_term')).toBe(true);
  });

  it('does not substring-match partial labels', () => {
    const result = resolvePhase2Alias({
      label: '오메가',
      aliases: phase2CodeDryRunAliases,
      canonicals: phase2CodeDryRunCanonicals,
      blockedTerms: phase2CodeDryRunBlockedTerms,
    });

    expect(result.status).toBe('unmatched');
    expect(result.reason).toBe('no_exact_normalized_match');
  });

  it('still reports ambiguity if a future fixture key maps to multiple canonicals', () => {
    const conflictingAliases: Phase2AliasSeed[] = [
      ...phase2CodeDryRunAliases,
      { alias: '맥주효모', canonicalName: '건조맥주효모', canonicalId: 'fixture-canonical-dried-brewers-yeast' },
    ];

    const result = resolvePhase2Alias({
      label: '맥주효모',
      aliases: conflictingAliases,
      canonicals: phase2CodeDryRunCanonicals,
      blockedTerms: phase2CodeDryRunBlockedTerms,
    });

    expect(result.status).toBe('ambiguous');
    expect(result.reason).toBe('multiple_canonical_candidates');
  });
});
