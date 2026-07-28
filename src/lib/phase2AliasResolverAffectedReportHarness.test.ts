import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Product } from '../types';
import type { Phase2AliasSeed } from './phase2AliasResolver';
import { resolveProductWithPhase2AliasAdapter } from './phase2AliasResolverProductAdapter';

type CandidateStatus = 'matched' | 'unmatched' | 'ambiguous' | 'blocked';
type AffectedKind = 'canonical_candidate' | 'review_required';

interface AffectedIngredientRow {
  productId: string;
  productName: string;
  rawIngredientLabel: string;
  resolverStatus: CandidateStatus;
  canonicalCandidate: string | null;
  affectedKind: AffectedKind;
  reviewRequired: boolean;
  runtimeOutputLabel: string;
  scoreImpactAllowed: boolean;
}

interface AffectedProductSummary {
  productId: string;
  productName: string;
  rows: number;
  matched: number;
  unmatched: number;
  blocked: number;
  ambiguous: number;
  reviewRequired: number;
}

interface AffectedReportSummary {
  productsSampled: number;
  ingredientRows: number;
  matchedRows: number;
  unmatchedRows: number;
  blockedRows: number;
  ambiguousRows: number;
  reviewRequiredRows: number;
  productsWithMatchedCandidates: number;
  productsWithReviewRequiredRows: number;
  productsWithBlockedRows: number;
  productsWithAmbiguousRows: number;
  rawLabelsPreserved: number;
  runtimeChangedRows: number;
  scoreImpactAllowedRows: number;
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
    ingredients: labels.map((label) => ({
      id: `${id}-${label}`,
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

function affectedKindForStatus(status: CandidateStatus): AffectedKind {
  return status === 'matched' ? 'canonical_candidate' : 'review_required';
}

function buildAffectedRows(
  products: Product[],
  aliases: Phase2AliasSeed[],
  blockedTerms: string[],
): AffectedIngredientRow[] {
  return products.flatMap((candidateProduct) => {
    const result = resolveProductWithPhase2AliasAdapter({
      product: candidateProduct,
      aliases,
      blockedTerms,
      flags: { phase2AliasResolver: true },
    });

    return result.resolutions.map((resolution) => {
      const status = resolution.decision.status as CandidateStatus;
      const reviewRequired = status !== 'matched';

      return {
        productId: candidateProduct.id,
        productName: candidateProduct.name,
        rawIngredientLabel: resolution.rawNameKo,
        resolverStatus: status,
        canonicalCandidate: resolution.decision.canonicalCandidate?.canonicalName ?? null,
        affectedKind: affectedKindForStatus(status),
        reviewRequired,
        runtimeOutputLabel: resolution.decision.outputLabel,
        scoreImpactAllowed: false,
      };
    });
  });
}

function summarizeProduct(rowGroup: AffectedIngredientRow[]): AffectedProductSummary {
  const first = rowGroup[0];
  return {
    productId: first.productId,
    productName: first.productName,
    rows: rowGroup.length,
    matched: rowGroup.filter((row) => row.resolverStatus === 'matched').length,
    unmatched: rowGroup.filter((row) => row.resolverStatus === 'unmatched').length,
    blocked: rowGroup.filter((row) => row.resolverStatus === 'blocked').length,
    ambiguous: rowGroup.filter((row) => row.resolverStatus === 'ambiguous').length,
    reviewRequired: rowGroup.filter((row) => row.reviewRequired).length,
  };
}

function summarizeAffectedRows(rows: AffectedIngredientRow[]): AffectedReportSummary {
  const productIds = [...new Set(rows.map((row) => row.productId))];
  const productSummaries = productIds.map((productId) =>
    summarizeProduct(rows.filter((row) => row.productId === productId)),
  );

  return {
    productsSampled: productIds.length,
    ingredientRows: rows.length,
    matchedRows: rows.filter((row) => row.resolverStatus === 'matched').length,
    unmatchedRows: rows.filter((row) => row.resolverStatus === 'unmatched').length,
    blockedRows: rows.filter((row) => row.resolverStatus === 'blocked').length,
    ambiguousRows: rows.filter((row) => row.resolverStatus === 'ambiguous').length,
    reviewRequiredRows: rows.filter((row) => row.reviewRequired).length,
    productsWithMatchedCandidates: productSummaries.filter((summary) => summary.matched > 0).length,
    productsWithReviewRequiredRows: productSummaries.filter((summary) => summary.reviewRequired > 0).length,
    productsWithBlockedRows: productSummaries.filter((summary) => summary.blocked > 0).length,
    productsWithAmbiguousRows: productSummaries.filter((summary) => summary.ambiguous > 0).length,
    rawLabelsPreserved: rows.filter((row) => row.runtimeOutputLabel === row.rawIngredientLabel).length,
    runtimeChangedRows: rows.filter((row) => row.runtimeOutputLabel !== row.rawIngredientLabel).length,
    scoreImpactAllowedRows: rows.filter((row) => row.scoreImpactAllowed).length,
  };
}

const scoreSource = readFileSync(join(process.cwd(), 'src/utils/score.ts'), 'utf8');

const aliases: Phase2AliasSeed[] = [
  { alias: '비타민 E', canonicalName: '비타민e', canonicalId: 'fixture-canonical-vitamin-e' },
  { alias: '오메가-3 지방산', canonicalName: '오메가3지방산', canonicalId: 'fixture-canonical-omega-3' },
  { alias: '건조 비트 펄프', canonicalName: '건조비트펄프', canonicalId: 'fixture-canonical-dried-beet-pulp' },
  { alias: '감자 전분', canonicalName: '감자전분', canonicalId: 'fixture-canonical-potato-starch' },
  { alias: '혼합 토코페롤', canonicalName: '혼합토코페롤', canonicalId: 'fixture-canonical-mixed-tocopherols' },
  { alias: '녹차 추출물', canonicalName: '녹차추출물', canonicalId: 'fixture-canonical-green-tea-extract' },
  { alias: '코코넛 오일', canonicalName: '코코넛오일', canonicalId: 'fixture-canonical-coconut-oil' },
  { alias: '맥주효모', canonicalName: '맥주효모', canonicalId: 'fixture-canonical-brewers-yeast' },
  { alias: '맥주효모', canonicalName: '건조맥주효모', canonicalId: 'fixture-canonical-dried-brewers-yeast' },
];

const blockedTerms = ['소르빈산칼륨', '향미증진제', '프로필렌글리콜', '닭지방'];

const fixtureProducts = [
  product('fixture-balanced', 'Balanced Fixture Product', [
    '비타민 E',
    '오메가-3 지방산',
    '닭고기 분말',
    '소르빈산 칼륨',
  ]),
  product('fixture-fiber', 'Fiber Fixture Product', ['건조 비트 펄프', '감자 전분', '타우린', '맥주효모']),
  product('fixture-preserved', 'Preserved Fixture Product', ['혼합 토코페롤', '향미증진제', '정제수', '프로필렌 글리콜']),
  product('fixture-botanical', 'Botanical Fixture Product', ['녹차 추출물', '코코넛 오일', '닭 지방', '로즈마리 추출물']),
];

describe('Phase 2 alias resolver non-runtime affected product/ingredient report harness', () => {
  it('keeps runtime scoring disabled while the affected report uses a test-only candidate path', () => {
    expect(scoreSource).toContain('flags: { phase2AliasResolver: false }');
    expect(scoreSource).not.toContain('phase2AliasResolver: true');
  });

  it('summarizes affected product and ingredient candidates from a fixed fixture set', () => {
    const rows = buildAffectedRows(fixtureProducts, aliases, blockedTerms);
    const summary = summarizeAffectedRows(rows);

    expect(summary).toEqual({
      productsSampled: 4,
      ingredientRows: 16,
      matchedRows: 7,
      unmatchedRows: 4,
      blockedRows: 4,
      ambiguousRows: 1,
      reviewRequiredRows: 9,
      productsWithMatchedCandidates: 4,
      productsWithReviewRequiredRows: 4,
      productsWithBlockedRows: 3,
      productsWithAmbiguousRows: 1,
      rawLabelsPreserved: 16,
      runtimeChangedRows: 0,
      scoreImpactAllowedRows: 0,
    });
  });

  it('keeps matched rows sidecar-only and review-only rows blocked from positive score impact', () => {
    const rows = buildAffectedRows(fixtureProducts, aliases, blockedTerms);
    const byProductAndLabel = new Map(rows.map((row) => [`${row.productId}:${row.rawIngredientLabel}`, row]));

    expect(byProductAndLabel.get('fixture-balanced:비타민 E')).toMatchObject({
      resolverStatus: 'matched',
      canonicalCandidate: '비타민e',
      affectedKind: 'canonical_candidate',
      reviewRequired: false,
      scoreImpactAllowed: false,
    });
    expect(byProductAndLabel.get('fixture-balanced:닭고기 분말')).toMatchObject({
      resolverStatus: 'unmatched',
      canonicalCandidate: null,
      affectedKind: 'review_required',
      reviewRequired: true,
      scoreImpactAllowed: false,
    });
    expect(byProductAndLabel.get('fixture-balanced:소르빈산 칼륨')).toMatchObject({
      resolverStatus: 'blocked',
      canonicalCandidate: null,
      affectedKind: 'review_required',
      reviewRequired: true,
      scoreImpactAllowed: false,
    });
    expect(byProductAndLabel.get('fixture-fiber:맥주효모')).toMatchObject({
      resolverStatus: 'ambiguous',
      canonicalCandidate: null,
      affectedKind: 'review_required',
      reviewRequired: true,
      scoreImpactAllowed: false,
    });
  });

  it('preserves raw labels and does not mutate fixture product references', () => {
    for (const candidateProduct of fixtureProducts) {
      const beforeLabels = candidateProduct.ingredients.map((ingredient) => ingredient.nameKo);
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
      expect(result.product.ingredients.map((ingredient) => ingredient.nameKo)).toEqual(beforeLabels);
    }
  });
});
