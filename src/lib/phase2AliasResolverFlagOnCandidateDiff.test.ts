import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Product } from '../types';
import type { Phase2AliasSeed } from './phase2AliasResolver';
import { resolveProductWithPhase2AliasAdapter } from './phase2AliasResolverProductAdapter';

interface CandidateDiffRow {
  rawLabel: string;
  status: 'matched' | 'unmatched' | 'ambiguous' | 'blocked';
  canonicalCandidate: string | null;
  runtimeOutputLabel: string;
  wouldRequireReview: boolean;
}

function productWithLabels(labels: string[]): Product {
  return {
    id: 'candidate-diff-product',
    brand: 'Fixture Brand',
    name: 'Candidate Diff Product',
    category: 'food',
    mainCategory: 'food',
    targetPetType: 'dog',
    imageUrl: '',
    ingredients: labels.map((label) => ({
      id: label,
      nameKo: label,
      nameEn: label,
      purpose: '',
      riskLevel: 'safe',
    })),
    reviewsCount: 0,
    averageRating: 0,
    verificationStatus: 'verified',
  };
}

function buildCandidateDiff(product: Product, aliases: Phase2AliasSeed[], blockedTerms: string[]): CandidateDiffRow[] {
  const result = resolveProductWithPhase2AliasAdapter({
    product,
    aliases,
    blockedTerms,
    flags: { phase2AliasResolver: true },
  });

  return result.resolutions.map((resolution) => ({
    rawLabel: resolution.rawNameKo,
    status: resolution.decision.status as CandidateDiffRow['status'],
    canonicalCandidate: resolution.decision.canonicalCandidate?.canonicalName ?? null,
    runtimeOutputLabel: resolution.decision.outputLabel,
    wouldRequireReview:
      resolution.decision.status === 'unmatched' ||
      resolution.decision.status === 'ambiguous' ||
      resolution.decision.status === 'blocked',
  }));
}

const scoreSource = readFileSync(join(process.cwd(), 'src/utils/score.ts'), 'utf8');

const aliases: Phase2AliasSeed[] = [
  { alias: '비타민 E', canonicalName: '비타민e', canonicalId: 'fixture-canonical-vitamin-e' },
  { alias: '오메가-3 지방산', canonicalName: '오메가3지방산', canonicalId: 'fixture-canonical-omega-3' },
];

const ambiguousAliases: Phase2AliasSeed[] = [
  ...aliases,
  { alias: '맥주효모', canonicalName: '맥주효모', canonicalId: 'fixture-canonical-brewers-yeast' },
  { alias: '맥주효모', canonicalName: '건조맥주효모', canonicalId: 'fixture-canonical-dried-brewers-yeast' },
];

const blockedTerms = ['소르빈산칼륨', '닭지방', '향미증진제'];

describe('Phase 2 alias resolver flag-on candidate design/sample diff', () => {
  it('keeps runtime scoring flag disabled while sample diff uses an isolated test-only flag-on adapter', () => {
    expect(scoreSource).toContain('flags: { phase2AliasResolver: false }');
    expect(scoreSource).not.toContain('phase2AliasResolver: true');
  });

  it('documents matched, unmatched, blocked, and ambiguous candidate outcomes without changing runtime labels', () => {
    const candidateProduct = productWithLabels([
      '비타민 E',
      '오메가-3 지방산',
      '닭고기 분말',
      '소르빈산 칼륨',
      '맥주효모',
    ]);

    const diff = buildCandidateDiff(candidateProduct, ambiguousAliases, blockedTerms);

    expect(diff).toEqual([
      {
        rawLabel: '비타민 E',
        status: 'matched',
        canonicalCandidate: '비타민e',
        runtimeOutputLabel: '비타민 E',
        wouldRequireReview: false,
      },
      {
        rawLabel: '오메가-3 지방산',
        status: 'matched',
        canonicalCandidate: '오메가3지방산',
        runtimeOutputLabel: '오메가-3 지방산',
        wouldRequireReview: false,
      },
      {
        rawLabel: '닭고기 분말',
        status: 'unmatched',
        canonicalCandidate: null,
        runtimeOutputLabel: '닭고기 분말',
        wouldRequireReview: true,
      },
      {
        rawLabel: '소르빈산 칼륨',
        status: 'blocked',
        canonicalCandidate: null,
        runtimeOutputLabel: '소르빈산 칼륨',
        wouldRequireReview: true,
      },
      {
        rawLabel: '맥주효모',
        status: 'ambiguous',
        canonicalCandidate: null,
        runtimeOutputLabel: '맥주효모',
        wouldRequireReview: true,
      },
    ]);
  });

  it('treats sample candidates as sidecar metadata only and never as score input', () => {
    const candidateProduct = productWithLabels(['비타민 E', '닭고기 분말', '향미증진제']);
    const result = resolveProductWithPhase2AliasAdapter({
      product: candidateProduct,
      aliases,
      blockedTerms,
      flags: { phase2AliasResolver: true },
    });

    expect(result.enabled).toBe(true);
    expect(result.changed).toBe(false);
    expect(result.product).toBe(candidateProduct);
    expect(result.product.ingredients).toBe(candidateProduct.ingredients);
    expect(result.product.ingredients.map((ingredient) => ingredient.nameKo)).toEqual([
      '비타민 E',
      '닭고기 분말',
      '향미증진제',
    ]);
    expect(result.resolutions.map((resolution) => resolution.decision.status)).toEqual([
      'matched',
      'unmatched',
      'blocked',
    ]);
  });
});
