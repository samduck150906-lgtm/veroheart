import { describe, expect, it } from 'vitest';
import type { Product } from '../types';
import type { Phase2AliasSeed } from './phase2AliasResolver';
import { resolveProductWithPhase2AliasAdapter } from './phase2AliasResolverProductAdapter';
import {
  summarizePhase2AliasShadowMetadataRows,
  toPhase2AliasShadowMetadataRows,
} from './phase2AliasResolverShadowMetadata';

const aliases: Phase2AliasSeed[] = [
  { alias: '비타민 E', canonicalName: '비타민e', canonicalId: 'canonical-vitamin-e', aliasId: 'alias-vitamin-e' },
  { alias: '맥주효모', canonicalName: '맥주효모', canonicalId: 'canonical-brewers-yeast', aliasId: 'alias-brewers-yeast' },
  { alias: '맥주 효모', canonicalName: '건조맥주효모', canonicalId: 'canonical-dried-brewers-yeast', aliasId: 'alias-dried-brewers-yeast' },
];

const blockedTerms = ['소르빈산칼륨'];

function product(id: string, ingredientNames: string[]): Product {
  return {
    id,
    brand: 'Shadow Metadata Fixture Brand',
    name: `Shadow Metadata Fixture Product ${id}`,
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

describe('Phase 2 alias resolver shadow metadata shape', () => {
  it('maps adapter sidecar decisions to stable shadow metadata rows', () => {
    const fixture = product('metadata', ['비타민 E', '닭고기 분말', '소르빈산 칼륨', '맥주효모']);
    const adapterResult = resolveProductWithPhase2AliasAdapter({
      product: fixture,
      aliases,
      blockedTerms,
      flags: { phase2AliasResolver: true },
    });
    const rows = toPhase2AliasShadowMetadataRows(adapterResult.resolutions);

    expect(adapterResult.changed).toBe(false);
    expect(adapterResult.product).toBe(fixture);
    expect(rows).toHaveLength(4);

    expect(rows[0]).toMatchObject({
      rawNameKo: '비타민 E',
      status: 'matched',
      canonicalCandidate: '비타민e',
      canonicalCandidateId: 'canonical-vitamin-e',
      aliasId: 'alias-vitamin-e',
      reviewState: 'sidecar_only',
      reason: 'exact_normalized_candidate_sidecar_only',
    });
    expect(rows[1]).toMatchObject({
      rawNameKo: '닭고기 분말',
      status: 'unmatched',
      canonicalCandidate: null,
      reviewState: 'review_required',
      reason: 'no_exact_normalized_match_review_required',
    });
    expect(rows[2]).toMatchObject({
      rawNameKo: '소르빈산 칼륨',
      status: 'blocked',
      canonicalCandidate: null,
      reviewState: 'review_required',
      reason: 'blocked_review_only_term_no_positive_score_effect',
    });
    expect(rows[3]).toMatchObject({
      rawNameKo: '맥주효모',
      status: 'ambiguous',
      canonicalCandidate: null,
      reviewState: 'review_required',
      reason: 'multiple_candidates_review_required',
    });
  });

  it('keeps all shadow metadata rows non-mutating and score-neutral', () => {
    const fixture = product('metadata-neutral', ['비타민 E', '닭고기 분말', '소르빈산 칼륨', '맥주효모']);
    const rows = toPhase2AliasShadowMetadataRows(
      resolveProductWithPhase2AliasAdapter({
        product: fixture,
        aliases,
        blockedTerms,
        flags: { phase2AliasResolver: true },
      }).resolutions,
    );

    for (const row of rows) {
      expect(row.scoreImpactAllowed).toBe(false);
      expect(row.runtimeMutationAllowed).toBe(false);
      expect(row.visibleLabelReplacementAllowed).toBe(false);
    }
    expect(fixture.ingredients.map((ingredient) => ingredient.nameKo)).toEqual([
      '비타민 E',
      '닭고기 분말',
      '소르빈산 칼륨',
      '맥주효모',
    ]);
  });

  it('summarizes shadow metadata rows for future report packets', () => {
    const fixture = product('metadata-summary', ['비타민 E', '닭고기 분말', '소르빈산 칼륨', '맥주효모']);
    const rows = toPhase2AliasShadowMetadataRows(
      resolveProductWithPhase2AliasAdapter({
        product: fixture,
        aliases,
        blockedTerms,
        flags: { phase2AliasResolver: true },
      }).resolutions,
    );

    expect(summarizePhase2AliasShadowMetadataRows(rows)).toEqual({
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
  });
});
