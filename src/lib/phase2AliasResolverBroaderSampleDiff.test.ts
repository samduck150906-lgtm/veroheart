import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Product } from '../types';
import type { Phase2AliasSeed } from './phase2AliasResolver';
import { resolveProductWithPhase2AliasAdapter } from './phase2AliasResolverProductAdapter';

type CandidateStatus = 'matched' | 'unmatched' | 'ambiguous' | 'blocked';

interface BroaderSampleRow {
  rawLabel: string;
  status: CandidateStatus;
  canonicalCandidate: string | null;
  runtimeOutputLabel: string;
  reviewRequired: boolean;
}

interface BroaderSampleSummary {
  total: number;
  matched: number;
  unmatched: number;
  ambiguous: number;
  blocked: number;
  reviewRequired: number;
  rawLabelPreserved: number;
}

function productWithLabels(labels: string[]): Product {
  return {
    id: 'broader-sample-diff-product',
    brand: 'Fixture Brand',
    name: 'Broader Sample Diff Product',
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

function buildBroaderSampleDiff(
  product: Product,
  aliases: Phase2AliasSeed[],
  blockedTerms: string[],
): BroaderSampleRow[] {
  const result = resolveProductWithPhase2AliasAdapter({
    product,
    aliases,
    blockedTerms,
    flags: { phase2AliasResolver: true },
  });

  return result.resolutions.map((resolution) => ({
    rawLabel: resolution.rawNameKo,
    status: resolution.decision.status as CandidateStatus,
    canonicalCandidate: resolution.decision.canonicalCandidate?.canonicalName ?? null,
    runtimeOutputLabel: resolution.decision.outputLabel,
    reviewRequired:
      resolution.decision.status === 'unmatched' ||
      resolution.decision.status === 'ambiguous' ||
      resolution.decision.status === 'blocked',
  }));
}

function summarize(rows: BroaderSampleRow[]): BroaderSampleSummary {
  return rows.reduce<BroaderSampleSummary>(
    (summary, row) => {
      summary.total += 1;
      summary[row.status] += 1;
      if (row.reviewRequired) summary.reviewRequired += 1;
      if (row.runtimeOutputLabel === row.rawLabel) summary.rawLabelPreserved += 1;
      return summary;
    },
    {
      total: 0,
      matched: 0,
      unmatched: 0,
      ambiguous: 0,
      blocked: 0,
      reviewRequired: 0,
      rawLabelPreserved: 0,
    },
  );
}

const scoreSource = readFileSync(join(process.cwd(), 'src/utils/score.ts'), 'utf8');

const phase2AliasFixture: Phase2AliasSeed[] = [
  { alias: '비타민 E', canonicalName: '비타민e', canonicalId: 'fixture-canonical-vitamin-e' },
  { alias: '오메가-3 지방산', canonicalName: '오메가3지방산', canonicalId: 'fixture-canonical-omega-3' },
  { alias: '오메가 6 지방산', canonicalName: '오메가6지방산', canonicalId: 'fixture-canonical-omega-6' },
  { alias: '건조 비트 펄프', canonicalName: '건조비트펄프', canonicalId: 'fixture-canonical-dried-beet-pulp' },
  { alias: '감자 전분', canonicalName: '감자전분', canonicalId: 'fixture-canonical-potato-starch' },
  { alias: '건조 맥주 효모', canonicalName: '건조맥주효모', canonicalId: 'fixture-canonical-dried-brewers-yeast' },
  { alias: '녹차 추출물', canonicalName: '녹차추출물', canonicalId: 'fixture-canonical-green-tea-extract' },
  { alias: '코코넛 오일', canonicalName: '코코넛오일', canonicalId: 'fixture-canonical-coconut-oil' },
  { alias: '타피오카 전분', canonicalName: '타피오카전분', canonicalId: 'fixture-canonical-tapioca-starch' },
  { alias: '토마토 박', canonicalName: '토마토박', canonicalId: 'fixture-canonical-tomato-pomace' },
  { alias: '프락토 올리고당', canonicalName: '프락토올리고당', canonicalId: 'fixture-canonical-fructo-oligosaccharide' },
  { alias: '혼합 토코페롤', canonicalName: '혼합토코페롤', canonicalId: 'fixture-canonical-mixed-tocopherols' },
];

const aliasesWithSyntheticAmbiguity: Phase2AliasSeed[] = [
  ...phase2AliasFixture,
  { alias: '맥주효모', canonicalName: '맥주효모', canonicalId: 'fixture-canonical-brewers-yeast' },
  { alias: '맥주효모', canonicalName: '건조맥주효모', canonicalId: 'fixture-canonical-dried-brewers-yeast-ambiguous' },
];

const blockedTerms = ['닭간', '닭지방', '동물성지방', '소르빈산칼륨', '프로필렌글리콜', '향미증진제'];

const broaderSampleLabels = [
  '비타민 E',
  '오메가-3 지방산',
  '오메가 6 지방산',
  '건조 비트 펄프',
  '감자 전분',
  '건조 맥주 효모',
  '녹차 추출물',
  '코코넛 오일',
  '타피오카 전분',
  '토마토 박',
  '프락토 올리고당',
  '혼합 토코페롤',
  '닭고기 분말',
  '로즈마리 추출물',
  '타우린',
  '현미',
  '고구마',
  '정제수',
  '닭 지방',
  '소르빈산 칼륨',
  '향미증진제',
  '프로필렌 글리콜',
  '닭간',
  '맥주효모',
];

describe('Phase 2 alias resolver broader sample-diff report', () => {
  it('keeps runtime scoring disabled while broader sample diff uses test-only flag-on adapter', () => {
    expect(scoreSource).toContain('flags: { phase2AliasResolver: false }');
    expect(scoreSource).not.toContain('phase2AliasResolver: true');
  });

  it('summarizes a broader fixture set without changing runtime labels', () => {
    const candidateProduct = productWithLabels(broaderSampleLabels);
    const diff = buildBroaderSampleDiff(candidateProduct, aliasesWithSyntheticAmbiguity, blockedTerms);
    const summary = summarize(diff);

    expect(summary).toEqual({
      total: 24,
      matched: 12,
      unmatched: 6,
      ambiguous: 1,
      blocked: 5,
      reviewRequired: 12,
      rawLabelPreserved: 24,
    });

    expect(diff.every((row) => row.runtimeOutputLabel === row.rawLabel)).toBe(true);
  });

  it('keeps matched candidates sidecar-only and sends unmatched, blocked, and ambiguous rows to review', () => {
    const candidateProduct = productWithLabels(broaderSampleLabels);
    const diff = buildBroaderSampleDiff(candidateProduct, aliasesWithSyntheticAmbiguity, blockedTerms);
    const byLabel = new Map(diff.map((row) => [row.rawLabel, row]));

    expect(byLabel.get('비타민 E')).toMatchObject({
      status: 'matched',
      canonicalCandidate: '비타민e',
      runtimeOutputLabel: '비타민 E',
      reviewRequired: false,
    });
    expect(byLabel.get('건조 맥주 효모')).toMatchObject({
      status: 'matched',
      canonicalCandidate: '건조맥주효모',
      runtimeOutputLabel: '건조 맥주 효모',
      reviewRequired: false,
    });
    expect(byLabel.get('닭고기 분말')).toMatchObject({
      status: 'unmatched',
      canonicalCandidate: null,
      runtimeOutputLabel: '닭고기 분말',
      reviewRequired: true,
    });
    expect(byLabel.get('소르빈산 칼륨')).toMatchObject({
      status: 'blocked',
      canonicalCandidate: null,
      runtimeOutputLabel: '소르빈산 칼륨',
      reviewRequired: true,
    });
    expect(byLabel.get('맥주효모')).toMatchObject({
      status: 'ambiguous',
      canonicalCandidate: null,
      runtimeOutputLabel: '맥주효모',
      reviewRequired: true,
    });
  });

  it('does not mutate product or ingredient references while producing the broader sample diff', () => {
    const candidateProduct = productWithLabels(broaderSampleLabels);
    const beforeLabels = candidateProduct.ingredients.map((ingredient) => ingredient.nameKo);
    const result = resolveProductWithPhase2AliasAdapter({
      product: candidateProduct,
      aliases: aliasesWithSyntheticAmbiguity,
      blockedTerms,
      flags: { phase2AliasResolver: true },
    });

    expect(result.enabled).toBe(true);
    expect(result.changed).toBe(false);
    expect(result.product).toBe(candidateProduct);
    expect(result.product.ingredients).toBe(candidateProduct.ingredients);
    expect(result.product.ingredients.map((ingredient) => ingredient.nameKo)).toEqual(beforeLabels);
  });
});
