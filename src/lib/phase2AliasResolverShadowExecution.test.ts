import { describe, expect, it } from 'vitest';
import type { Product } from '../types';
import type { Phase2AliasSeed } from './phase2AliasResolver';
import { buildPhase2AliasResolverShadowExecutionReport } from './phase2AliasResolverShadowExecution';

const aliases: Phase2AliasSeed[] = [
  { alias: '비타민 E', canonicalName: '비타민e', canonicalId: 'canonical-vitamin-e', aliasId: 'alias-vitamin-e' },
  { alias: '오메가-3 지방산', canonicalName: '오메가3지방산', canonicalId: 'canonical-omega-3', aliasId: 'alias-omega-3' },
  { alias: '맥주효모', canonicalName: '맥주효모', canonicalId: 'canonical-brewers-yeast', aliasId: 'alias-brewers-yeast' },
  { alias: '맥주 효모', canonicalName: '건조맥주효모', canonicalId: 'canonical-dried-brewers-yeast', aliasId: 'alias-dried-brewers-yeast' },
];

const blockedTerms = ['소르빈산칼륨'];

function product(id: string, ingredientNames: string[]): Product {
  return {
    id,
    brand: 'Shadow Execution Fixture Brand',
    name: `Shadow Execution Fixture Product ${id}`,
    category: 'food',
    mainCategory: 'food',
    targetPetType: 'dog',
    imageUrl: '',
    ingredients: ingredientNames.map((name, index) => ({
      id: `${id}-ingredient-${index}`,
      nameKo: name,
      nameEn: name,
      purpose: '',
      riskLevel: 'safe',
    })),
    reviewsCount: 0,
    averageRating: 0,
    verificationStatus: 'verified',
  };
}

describe('Phase 2 alias resolver shadow execution wrapper', () => {
  it('keeps omitted candidate execution disabled with no rows', () => {
    const fixture = product('disabled', ['비타민 E']);
    const report = buildPhase2AliasResolverShadowExecutionReport({
      products: [fixture],
      aliases,
      blockedTerms,
    });

    expect(report.visibility).toBe('non_visible_internal_report');
    expect(report.summary).toMatchObject({
      products: 1,
      totalRows: 0,
      changedProducts: 0,
      scoreImpactAllowedRows: 0,
      runtimeMutationAllowedRows: 0,
      visibleLabelReplacementAllowedRows: 0,
    });
    expect(fixture.ingredients.map((ingredient) => ingredient.nameKo)).toEqual(['비타민 E']);
  });

  it('builds a test-candidate shadow report without changing product labels', () => {
    const fixtures = [
      product('a', ['비타민 E', '닭고기 분말']),
      product('b', ['소르빈산 칼륨', '맥주효모']),
      product('c', ['오메가-3 지방산', '현미']),
    ];
    const beforeLabels = fixtures.map((fixture) => fixture.ingredients.map((ingredient) => ingredient.nameKo));

    const report = buildPhase2AliasResolverShadowExecutionReport({
      products: fixtures,
      aliases,
      blockedTerms,
      testCandidateEnabled: true,
    });

    expect(report.reportKind).toBe('phase2_alias_resolver_shadow_report');
    expect(report.visibility).toBe('non_visible_internal_report');
    expect(report.scoreImpactAllowed).toBe(false);
    expect(report.runtimeMutationAllowed).toBe(false);
    expect(report.visibleLabelReplacementAllowed).toBe(false);
    expect(report.summary).toEqual({
      products: 3,
      totalRows: 6,
      matchedRows: 2,
      unmatchedRows: 2,
      blockedRows: 1,
      ambiguousRows: 1,
      reviewRequiredRows: 4,
      sidecarOnlyRows: 2,
      scoreImpactAllowedRows: 0,
      runtimeMutationAllowedRows: 0,
      visibleLabelReplacementAllowedRows: 0,
      changedProducts: 0,
    });
    expect(fixtures.map((fixture) => fixture.ingredients.map((ingredient) => ingredient.nameKo))).toEqual(beforeLabels);
  });
});
