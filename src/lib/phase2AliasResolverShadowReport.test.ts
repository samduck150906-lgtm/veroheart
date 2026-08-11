import { describe, expect, it } from 'vitest';
import type { Product } from '../types';
import type { Phase2AliasSeed } from './phase2AliasResolver';
import { resolveProductWithPhase2AliasAdapter } from './phase2AliasResolverProductAdapter';
import { buildPhase2AliasResolverShadowReport } from './phase2AliasResolverShadowReport';
import { toPhase2AliasShadowResultEnvelope } from './phase2AliasResolverShadowResult';

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
    brand: 'Shadow Report Fixture Brand',
    name: `Shadow Report Fixture Product ${id}`,
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

function envelopeFor(fixture: Product, enabled: boolean) {
  return toPhase2AliasShadowResultEnvelope(
    resolveProductWithPhase2AliasAdapter({
      product: fixture,
      aliases,
      blockedTerms,
      flags: { phase2AliasResolver: enabled },
    }),
  );
}

describe('Phase 2 alias resolver shadow report builder', () => {
  it('builds an empty non-visible report with all safety counters at zero', () => {
    expect(buildPhase2AliasResolverShadowReport([])).toEqual({
      reportKind: 'phase2_alias_resolver_shadow_report',
      visibility: 'non_visible_internal_report',
      scoreImpactAllowed: false,
      runtimeMutationAllowed: false,
      visibleLabelReplacementAllowed: false,
      envelopes: [],
      summary: {
        products: 0,
        totalRows: 0,
        matchedRows: 0,
        unmatchedRows: 0,
        blockedRows: 0,
        ambiguousRows: 0,
        reviewRequiredRows: 0,
        sidecarOnlyRows: 0,
        scoreImpactAllowedRows: 0,
        runtimeMutationAllowedRows: 0,
        visibleLabelReplacementAllowedRows: 0,
        changedProducts: 0,
      },
    });
  });

  it('summarizes multiple envelopes without allowing score or visible output changes', () => {
    const disabled = product('disabled', ['비타민 E']);
    const candidateA = product('candidate-a', ['비타민 E', '닭고기 분말', '소르빈산 칼륨', '맥주효모']);
    const candidateB = product('candidate-b', ['오메가-3 지방산', '현미']);

    const report = buildPhase2AliasResolverShadowReport([
      envelopeFor(disabled, false),
      envelopeFor(candidateA, true),
      envelopeFor(candidateB, true),
    ]);

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
    expect(disabled.ingredients.map((ingredient) => ingredient.nameKo)).toEqual(['비타민 E']);
    expect(candidateA.ingredients.map((ingredient) => ingredient.nameKo)).toEqual([
      '비타민 E',
      '닭고기 분말',
      '소르빈산 칼륨',
      '맥주효모',
    ]);
    expect(candidateB.ingredients.map((ingredient) => ingredient.nameKo)).toEqual(['오메가-3 지방산', '현미']);
  });
});
