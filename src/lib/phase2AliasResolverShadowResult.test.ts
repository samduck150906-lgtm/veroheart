import { describe, expect, it } from 'vitest';
import type { Product } from '../types';
import type { Phase2AliasSeed } from './phase2AliasResolver';
import { resolveProductWithPhase2AliasAdapter } from './phase2AliasResolverProductAdapter';
import { toPhase2AliasShadowResultEnvelope } from './phase2AliasResolverShadowResult';

const aliases: Phase2AliasSeed[] = [
  { alias: '비타민 E', canonicalName: '비타민e', canonicalId: 'canonical-vitamin-e', aliasId: 'alias-vitamin-e' },
  { alias: '맥주효모', canonicalName: '맥주효모', canonicalId: 'canonical-brewers-yeast', aliasId: 'alias-brewers-yeast' },
  { alias: '맥주 효모', canonicalName: '건조맥주효모', canonicalId: 'canonical-dried-brewers-yeast', aliasId: 'alias-dried-brewers-yeast' },
];

const blockedTerms = ['소르빈산칼륨'];

function product(id: string, ingredientNames: string[]): Product {
  return {
    id,
    brand: 'Shadow Result Fixture Brand',
    name: `Shadow Result Fixture Product ${id}`,
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

describe('Phase 2 alias resolver shadow result envelope', () => {
  it('wraps disabled adapter output without rows or runtime changes', () => {
    const fixture = product('disabled', ['비타민 E']);
    const adapterResult = resolveProductWithPhase2AliasAdapter({
      product: fixture,
      aliases,
      blockedTerms,
      flags: { phase2AliasResolver: false },
    });
    const envelope = toPhase2AliasShadowResultEnvelope(adapterResult);

    expect(envelope).toMatchObject({
      productId: 'disabled',
      productName: 'Shadow Result Fixture Product disabled',
      adapterReason: 'feature_flag_disabled',
      changed: false,
      metadata: {
        runMode: 'disabled',
        resolverEnabled: false,
        source: 'phase2_alias_resolver_adapter_sidecar',
        scoreImpactAllowed: false,
        runtimeMutationAllowed: false,
        visibleLabelReplacementAllowed: false,
      },
      rows: [],
      summary: {
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
      },
    });
    expect(adapterResult.product).toBe(fixture);
  });

  it('wraps test candidate sidecar rows and keeps all safety toggles false', () => {
    const fixture = product('candidate', ['비타민 E', '닭고기 분말', '소르빈산 칼륨', '맥주효모']);
    const adapterResult = resolveProductWithPhase2AliasAdapter({
      product: fixture,
      aliases,
      blockedTerms,
      flags: { phase2AliasResolver: true },
    });
    const envelope = toPhase2AliasShadowResultEnvelope(adapterResult);

    expect(envelope.metadata.runMode).toBe('test_candidate_shadow');
    expect(envelope.metadata.resolverEnabled).toBe(true);
    expect(envelope.changed).toBe(false);
    expect(envelope.rows.map((row) => row.status)).toEqual(['matched', 'unmatched', 'blocked', 'ambiguous']);
    expect(envelope.summary).toMatchObject({
      totalRows: 4,
      matchedRows: 1,
      unmatchedRows: 1,
      blockedRows: 1,
      ambiguousRows: 1,
      reviewRequiredRows: 3,
      sidecarOnlyRows: 1,
      scoreImpactAllowedRows: 0,
      runtimeMutationAllowedRows: 0,
      visibleLabelReplacementAllowedRows: 0,
    });
    expect(envelope.rows.every((row) => row.scoreImpactAllowed === false)).toBe(true);
    expect(envelope.rows.every((row) => row.runtimeMutationAllowed === false)).toBe(true);
    expect(envelope.rows.every((row) => row.visibleLabelReplacementAllowed === false)).toBe(true);
    expect(fixture.ingredients.map((ingredient) => ingredient.nameKo)).toEqual([
      '비타민 E',
      '닭고기 분말',
      '소르빈산 칼륨',
      '맥주효모',
    ]);
  });
});
