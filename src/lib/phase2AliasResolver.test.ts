import { describe, expect, it } from 'vitest';
import { normalizePhase2AliasKey, resolvePhase2Alias, type Phase2AliasSeed } from './phase2AliasResolver';

const aliases: Phase2AliasSeed[] = [
  { alias: '비타민 E', canonicalName: '비타민e', canonicalId: 'canonical-vitamin-e' },
  { alias: '혼합 토코페롤', canonicalName: '혼합토코페롤', canonicalId: 'canonical-mixed-tocopherols' },
  { alias: '오메가-3 지방산', canonicalName: '오메가3지방산', canonicalId: 'canonical-omega-3' },
  { alias: '맥주 효모', canonicalName: '맥주효모', canonicalId: 'canonical-brewers-yeast' },
];

const canonicals = [
  { canonicalName: '비타민e', canonicalId: 'canonical-vitamin-e' },
  { canonicalName: '혼합토코페롤', canonicalId: 'canonical-mixed-tocopherols' },
  { canonicalName: '오메가3지방산', canonicalId: 'canonical-omega-3' },
  { canonicalName: '맥주효모', canonicalId: 'canonical-brewers-yeast' },
];

const blockedTerms = ['닭간', '닭지방', '동물성지방', '소르빈산칼륨', '향미증진제'];

describe('normalizePhase2AliasKey', () => {
  it('normalizes whitespace and common punctuation without semantic inference', () => {
    expect(normalizePhase2AliasKey(' 오메가-3 지방산 ')).toBe('오메가3지방산');
    expect(normalizePhase2AliasKey('Vitamin E')).toBe('vitamine');
  });
});

describe('resolvePhase2Alias', () => {
  it('matches only exact normalized alias keys', () => {
    const result = resolvePhase2Alias({ label: '오메가 3 지방산', aliases, canonicals, blockedTerms });

    expect(result.status).toBe('matched');
    expect(result.match).toMatchObject({
      canonicalName: '오메가3지방산',
      canonicalId: 'canonical-omega-3',
      matchKind: 'alias',
    });
    expect(result.reason).toBe('exact_normalized_match');
  });

  it('also matches exact normalized canonical keys', () => {
    const result = resolvePhase2Alias({ label: '혼합토코페롤', aliases, canonicals, blockedTerms });

    expect(result.status).toBe('matched');
    expect(result.match?.canonicalId).toBe('canonical-mixed-tocopherols');
  });

  it('does not use substring matching', () => {
    const result = resolvePhase2Alias({ label: '오메가', aliases, canonicals, blockedTerms });

    expect(result.status).toBe('unmatched');
    expect(result.reason).toBe('no_exact_normalized_match');
  });

  it('does not infer semantically related animal ingredients', () => {
    const result = resolvePhase2Alias({ label: '닭고기 분말', aliases, canonicals, blockedTerms });

    expect(result.status).toBe('unmatched');
  });

  it('blocks review-only dangerous or excluded terms before matching', () => {
    const result = resolvePhase2Alias({
      label: '소르빈산 칼륨',
      aliases: [...aliases, { alias: '소르빈산칼륨', canonicalName: '소르빈산칼륨', canonicalId: 'forbidden' }],
      canonicals,
      blockedTerms,
    });

    expect(result.status).toBe('blocked');
    expect(result.candidates).toEqual([]);
    expect(result.reason).toBe('blocked_review_only_term');
  });

  it('returns ambiguous when one normalized key points to multiple canonical candidates', () => {
    const result = resolvePhase2Alias({
      label: '맥주효모',
      aliases: [
        { alias: '맥주효모', canonicalName: '맥주효모', canonicalId: 'canonical-brewers-yeast' },
        { alias: '맥주효모', canonicalName: '건조맥주효모', canonicalId: 'canonical-dried-brewers-yeast' },
      ],
      blockedTerms,
    });

    expect(result.status).toBe('ambiguous');
    expect(result.candidates).toHaveLength(2);
    expect(result.reason).toBe('multiple_canonical_candidates');
  });

  it('deduplicates repeated aliases pointing to the same canonical candidate', () => {
    const result = resolvePhase2Alias({
      label: '비타민E',
      aliases: [
        { alias: '비타민 E', canonicalName: '비타민e', canonicalId: 'canonical-vitamin-e' },
        { alias: '비타민 E', canonicalName: '비타민e', canonicalId: 'canonical-vitamin-e' },
      ],
      canonicals: [{ canonicalName: '비타민e', canonicalId: 'canonical-vitamin-e' }],
      blockedTerms,
    });

    expect(result.status).toBe('matched');
    expect(result.candidates).toHaveLength(2);
    expect(new Set(result.candidates.map((candidate) => candidate.canonicalId))).toEqual(
      new Set(['canonical-vitamin-e']),
    );
  });
});
