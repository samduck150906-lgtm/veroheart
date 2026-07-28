import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Ingredient, Product, UserPetProfile } from '../types';
import type { Phase2AliasSeed } from './phase2AliasResolver';
import { resolveProductWithPhase2AliasAdapter } from './phase2AliasResolverProductAdapter';
import { calculateCompatibilityScore } from '../utils/score';
import { resolveProductDisplayVerdict } from '../utils/displayVerdict';

type ResolverStatus = 'matched' | 'unmatched' | 'ambiguous' | 'blocked';

interface ScoreDiffRow {
  productId: string;
  productName: string;
  rawIngredientLabel: string;
  resolverStatus: ResolverStatus;
  canonicalCandidate: string | null;
  scoreBefore: number;
  scoreAfter: number;
  scoreDelta: number;
  gradeBefore: string;
  gradeAfter: string;
  runtimeOutputLabel: string;
  reviewRequired: boolean;
  safetyNote: string;
}

interface ScoreDiffSummary {
  productsSampled: number;
  rows: number;
  matched: number;
  unmatched: number;
  blocked: number;
  ambiguous: number;
  scoreChangedRows: number;
  scoreChangedProducts: number;
  maxPositiveDelta: number;
  maxNegativeDelta: number;
  rawLabelsPreserved: number;
  reviewRequiredRows: number;
}

function ingredient(nameKo: string, riskLevel: Ingredient['riskLevel'] = 'safe'): Ingredient {
  return { id: nameKo, nameKo, nameEn: nameKo, purpose: '', riskLevel };
}

function product(id: string, name: string, labels: string[]): Product {
  return {
    id,
    brand: 'Fixture Brand',
    name,
    category: 'food',
    mainCategory: 'food',
    targetPetType: 'dog',
    imageUrl: '',
    ingredients: labels.map((label) => ingredient(label)),
    reviewsCount: 0,
    averageRating: 0,
    verificationStatus: 'verified',
  };
}

function safetyNote(status: ResolverStatus) {
  switch (status) {
    case 'matched':
      return 'sidecar candidate only; no score input change in this harness';
    case 'unmatched':
      return 'raw label preserved; review-only';
    case 'blocked':
      return 'blocked/review-only; no positive score effect';
    case 'ambiguous':
      return 'manual review required; no positive score effect';
  }
}

function reviewRequired(status: ResolverStatus) {
  return status === 'unmatched' || status === 'blocked' || status === 'ambiguous';
}

function buildScoreDiffReport(
  products: Product[],
  profile: UserPetProfile,
  aliases: Phase2AliasSeed[],
  blockedTerms: string[],
) {
  const rows: ScoreDiffRow[] = [];

  for (const input of products) {
    const scoreBefore = calculateCompatibilityScore(input, profile);
    const verdictBefore = resolveProductDisplayVerdict(input, profile);
    const result = resolveProductWithPhase2AliasAdapter({
      product: input,
      aliases,
      blockedTerms,
      flags: { phase2AliasResolver: true },
    });
    const scoreAfter = calculateCompatibilityScore(result.product, profile);
    const verdictAfter = resolveProductDisplayVerdict(result.product, profile);

    for (const resolution of result.resolutions) {
      const status = resolution.decision.status as ResolverStatus;
      rows.push({
        productId: input.id,
        productName: input.name,
        rawIngredientLabel: resolution.rawNameKo,
        resolverStatus: status,
        canonicalCandidate: resolution.decision.canonicalCandidate?.canonicalName ?? null,
        scoreBefore,
        scoreAfter,
        scoreDelta: scoreAfter - scoreBefore,
        gradeBefore: verdictBefore.grade,
        gradeAfter: verdictAfter.grade,
        runtimeOutputLabel: resolution.decision.outputLabel,
        reviewRequired: reviewRequired(status),
        safetyNote: safetyNote(status),
      });
    }
  }

  return rows;
}

function summarize(rows: ScoreDiffRow[]): ScoreDiffSummary {
  const changedProducts = new Set(rows.filter((row) => row.scoreDelta !== 0).map((row) => row.productId));
  const productIds = new Set(rows.map((row) => row.productId));

  return rows.reduce<ScoreDiffSummary>(
    (summary, row) => {
      summary.rows += 1;
      summary[row.resolverStatus] += 1;
      if (row.scoreDelta !== 0) summary.scoreChangedRows += 1;
      if (row.runtimeOutputLabel === row.rawIngredientLabel) summary.rawLabelsPreserved += 1;
      if (row.reviewRequired) summary.reviewRequiredRows += 1;
      summary.maxPositiveDelta = Math.max(summary.maxPositiveDelta, row.scoreDelta);
      summary.maxNegativeDelta = Math.min(summary.maxNegativeDelta, row.scoreDelta);
      return summary;
    },
    {
      productsSampled: productIds.size,
      rows: 0,
      matched: 0,
      unmatched: 0,
      blocked: 0,
      ambiguous: 0,
      scoreChangedRows: 0,
      scoreChangedProducts: changedProducts.size,
      maxPositiveDelta: 0,
      maxNegativeDelta: 0,
      rawLabelsPreserved: 0,
      reviewRequiredRows: 0,
    },
  );
}

const profile: UserPetProfile = {
  id: 'pet-1',
  name: 'Test Pet',
  species: 'Dog',
  age: 4,
  healthConcerns: ['면역'],
  allergies: ['닭'],
};

const aliasesWithSyntheticAmbiguity: Phase2AliasSeed[] = [
  { alias: '비타민 E', canonicalName: '비타민e', canonicalId: 'fixture-canonical-vitamin-e' },
  { alias: '오메가-3 지방산', canonicalName: '오메가3지방산', canonicalId: 'fixture-canonical-omega-3' },
  { alias: '혼합 토코페롤', canonicalName: '혼합토코페롤', canonicalId: 'fixture-canonical-mixed-tocopherols' },
  { alias: '맥주효모', canonicalName: '맥주효모', canonicalId: 'fixture-canonical-brewers-yeast' },
  { alias: '맥주효모', canonicalName: '건조맥주효모', canonicalId: 'fixture-canonical-dried-brewers-yeast' },
];

const blockedTerms = ['소르빈산칼륨', '향미증진제', '닭지방'];

const fixtureProducts = [
  product('fixture-balanced', 'Balanced Fixture Product', [
    '비타민 E',
    '오메가-3 지방산',
    '닭고기 분말',
    '소르빈산 칼륨',
    '맥주효모',
  ]),
  product('fixture-secondary', 'Secondary Fixture Product', ['혼합 토코페롤', '정제수', '향미증진제']),
];

const scoreSource = readFileSync(join(process.cwd(), 'src/utils/score.ts'), 'utf8');

describe('Phase 2 alias resolver non-runtime score diff harness', () => {
  it('keeps runtime scoring disabled while the harness uses a test-only candidate path', () => {
    expect(scoreSource).toContain('flags: { phase2AliasResolver: false }');
    expect(scoreSource).not.toContain('phase2AliasResolver: true');
  });

  it('builds the mandatory before/after score diff shape from fixed fixtures', () => {
    const rows = buildScoreDiffReport(fixtureProducts, profile, aliasesWithSyntheticAmbiguity, blockedTerms);
    const summary = summarize(rows);

    expect(summary).toEqual({
      productsSampled: 2,
      rows: 8,
      matched: 3,
      unmatched: 2,
      blocked: 2,
      ambiguous: 1,
      scoreChangedRows: 0,
      scoreChangedProducts: 0,
      maxPositiveDelta: 0,
      maxNegativeDelta: 0,
      rawLabelsPreserved: 8,
      reviewRequiredRows: 5,
    });
  });

  it('keeps the current sidecar-only candidate path from changing scores or labels', () => {
    const rows = buildScoreDiffReport(fixtureProducts, profile, aliasesWithSyntheticAmbiguity, blockedTerms);

    expect(rows.every((row) => row.scoreAfter === row.scoreBefore)).toBe(true);
    expect(rows.every((row) => row.scoreDelta === 0)).toBe(true);
    expect(rows.every((row) => row.gradeAfter === row.gradeBefore)).toBe(true);
    expect(rows.every((row) => row.runtimeOutputLabel === row.rawIngredientLabel)).toBe(true);
  });

  it('reports matched, unmatched, blocked, and ambiguous examples with review and safety notes', () => {
    const rows = buildScoreDiffReport(fixtureProducts, profile, aliasesWithSyntheticAmbiguity, blockedTerms);
    const byLabel = new Map(rows.map((row) => [row.rawIngredientLabel, row]));

    expect(byLabel.get('비타민 E')).toMatchObject({
      resolverStatus: 'matched',
      canonicalCandidate: '비타민e',
      reviewRequired: false,
      safetyNote: 'sidecar candidate only; no score input change in this harness',
    });
    expect(byLabel.get('닭고기 분말')).toMatchObject({
      resolverStatus: 'unmatched',
      canonicalCandidate: null,
      reviewRequired: true,
      safetyNote: 'raw label preserved; review-only',
    });
    expect(byLabel.get('소르빈산 칼륨')).toMatchObject({
      resolverStatus: 'blocked',
      canonicalCandidate: null,
      reviewRequired: true,
      safetyNote: 'blocked/review-only; no positive score effect',
    });
    expect(byLabel.get('맥주효모')).toMatchObject({
      resolverStatus: 'ambiguous',
      canonicalCandidate: null,
      reviewRequired: true,
      safetyNote: 'manual review required; no positive score effect',
    });
  });
});
