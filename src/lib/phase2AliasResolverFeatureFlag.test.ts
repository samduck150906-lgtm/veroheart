import { describe, expect, it } from 'vitest';
import type { Phase2AliasSeed } from './phase2AliasResolver';
import {
  DEFAULT_PHASE2_ALIAS_RESOLVER_FEATURE_FLAGS,
  resolvePhase2AliasBehindFeatureFlag,
} from './phase2AliasResolverFeatureFlag';

const aliases: Phase2AliasSeed[] = [
  { alias: '비타민 E', canonicalName: '비타민e', canonicalId: 'fixture-canonical-vitamin-e' },
  { alias: '오메가-3 지방산', canonicalName: '오메가3지방산', canonicalId: 'fixture-canonical-omega-3' },
];

const canonicals = [
  { canonicalName: '비타민e', canonicalId: 'fixture-canonical-vitamin-e' },
  { canonicalName: '오메가3지방산', canonicalId: 'fixture-canonical-omega-3' },
];

const blockedTerms = ['닭간', '닭지방', '소르빈산칼륨'];

describe('resolvePhase2AliasBehindFeatureFlag', () => {
  it('keeps the Phase 2 alias resolver disabled by default', () => {
    expect(DEFAULT_PHASE2_ALIAS_RESOLVER_FEATURE_FLAGS.phase2AliasResolver).toBe(false);

    const decision = resolvePhase2AliasBehindFeatureFlag({
      label: '비타민 E',
      aliases,
      canonicals,
      blockedTerms,
    });

    expect(decision).toMatchObject({
      enabled: false,
      input: '비타민 E',
      outputLabel: '비타민 E',
      changed: false,
      status: 'disabled',
      canonicalCandidate: null,
      resolverResult: null,
      reason: 'feature_flag_disabled',
    });
  });

  it('does not change raw labels even when explicitly enabled for candidate-only review', () => {
    const decision = resolvePhase2AliasBehindFeatureFlag({
      label: '비타민 E',
      aliases,
      canonicals,
      blockedTerms,
      flags: { phase2AliasResolver: true },
    });

    expect(decision.enabled).toBe(true);
    expect(decision.status).toBe('matched');
    expect(decision.input).toBe('비타민 E');
    expect(decision.outputLabel).toBe('비타민 E');
    expect(decision.changed).toBe(false);
    expect(decision.canonicalCandidate?.canonicalName).toBe('비타민e');
    expect(decision.reason).toBe('candidate_only_no_runtime_change');
  });

  it('keeps unmatched labels unchanged with no candidate', () => {
    const decision = resolvePhase2AliasBehindFeatureFlag({
      label: '닭고기 분말',
      aliases,
      canonicals,
      blockedTerms,
      flags: { phase2AliasResolver: true },
    });

    expect(decision.status).toBe('unmatched');
    expect(decision.outputLabel).toBe('닭고기 분말');
    expect(decision.changed).toBe(false);
    expect(decision.canonicalCandidate).toBeNull();
    expect(decision.reason).toBe('no_candidate_no_runtime_change');
  });

  it('keeps blocked labels review-only and unchanged', () => {
    const decision = resolvePhase2AliasBehindFeatureFlag({
      label: '닭 지방',
      aliases,
      canonicals,
      blockedTerms,
      flags: { phase2AliasResolver: true },
    });

    expect(decision.status).toBe('blocked');
    expect(decision.outputLabel).toBe('닭 지방');
    expect(decision.changed).toBe(false);
    expect(decision.canonicalCandidate).toBeNull();
    expect(decision.reason).toBe('review_only_no_runtime_change');
  });

  it('keeps ambiguous labels review-only and unchanged', () => {
    const decision = resolvePhase2AliasBehindFeatureFlag({
      label: '맥주효모',
      aliases: [
        { alias: '맥주효모', canonicalName: '맥주효모', canonicalId: 'fixture-canonical-brewers-yeast' },
        { alias: '맥주효모', canonicalName: '건조맥주효모', canonicalId: 'fixture-canonical-dried-brewers-yeast' },
      ],
      blockedTerms,
      flags: { phase2AliasResolver: true },
    });

    expect(decision.status).toBe('ambiguous');
    expect(decision.outputLabel).toBe('맥주효모');
    expect(decision.changed).toBe(false);
    expect(decision.canonicalCandidate).toBeNull();
    expect(decision.reason).toBe('review_only_no_runtime_change');
  });
});
