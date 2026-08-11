import { describe, expect, it } from 'vitest';
import type { Product } from '../types';
import type { Phase2AliasSeed } from './phase2AliasResolver';
import { resolveProductWithPhase2AliasAdapter } from './phase2AliasResolverProductAdapter';

const aliases: Phase2AliasSeed[] = [
  { alias: '비타민 E', canonicalName: '비타민e', canonicalId: 'canonical-vitamin-e', aliasId: 'alias-vitamin-e' },
  { alias: '오메가-3 지방산', canonicalName: '오메가3지방산', canonicalId: 'canonical-omega-3', aliasId: 'alias-omega-3' },
  { alias: '맥주효모', canonicalName: '맥주효모', canonicalId: 'canonical-brewers-yeast', aliasId: 'alias-brewers-yeast' },
  { alias: '맥주 효모', canonicalName: '건조맥주효모', canonicalId: 'canonical-dried-brewers-yeast', aliasId: 'alias-dried-brewers-yeast' },
];

const blockedTerms = ['소르빈산칼륨', '향미증진제'];

function product(id: string, ingredientNames: string[]): Product {
  return {
    id,
    brand: 'Adapter Fixture Brand',
    name: `Adapter Fixture Product ${id}`,
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

describe('Phase 2 alias resolver product adapter branch coverage', () => {
  it('returns the original product without resolutions when the feature flag is off', () => {
    const fixture = product('flag-off', ['비타민 E', '소르빈산 칼륨']);
    const result = resolveProductWithPhase2AliasAdapter({
      product: fixture,
      aliases,
      blockedTerms,
      flags: { phase2AliasResolver: false },
    });

    expect(result.enabled).toBe(false);
    expect(result.changed).toBe(false);
    expect(result.reason).toBe('feature_flag_disabled');
    expect(result.resolutions).toEqual([]);
    expect(result.product).toBe(fixture);
    expect(result.product.ingredients).toBe(fixture.ingredients);
    expect(result.product.ingredients.map((ingredient) => ingredient.nameKo)).toEqual(['비타민 E', '소르빈산 칼륨']);
  });

  it('returns the original product without resolutions when no flag object is supplied', () => {
    const fixture = product('flag-omitted', ['오메가-3 지방산']);
    const result = resolveProductWithPhase2AliasAdapter({ product: fixture, aliases, blockedTerms });

    expect(result.enabled).toBe(false);
    expect(result.changed).toBe(false);
    expect(result.reason).toBe('feature_flag_disabled');
    expect(result.resolutions).toEqual([]);
    expect(result.product).toBe(fixture);
  });

  it('keeps empty products unchanged even in the test-only flag-on candidate path', () => {
    const fixture = product('empty', []);
    const result = resolveProductWithPhase2AliasAdapter({
      product: fixture,
      aliases,
      blockedTerms,
      flags: { phase2AliasResolver: true },
    });

    expect(result.enabled).toBe(true);
    expect(result.changed).toBe(false);
    expect(result.reason).toBe('no_ingredients_no_runtime_change');
    expect(result.resolutions).toEqual([]);
    expect(result.product).toBe(fixture);
    expect(result.product.ingredients).toBe(fixture.ingredients);
  });

  it('records matched, unmatched, blocked, and ambiguous sidecar decisions without mutating labels', () => {
    const fixture = product('candidate-branches', ['비타민 E', '닭고기 분말', '소르빈산 칼륨', '맥주효모']);
    const result = resolveProductWithPhase2AliasAdapter({
      product: fixture,
      aliases,
      blockedTerms,
      flags: { phase2AliasResolver: true },
    });

    expect(result.enabled).toBe(true);
    expect(result.changed).toBe(false);
    expect(result.reason).toBe('candidate_sidecar_only_no_runtime_change');
    expect(result.product).toBe(fixture);
    expect(result.product.ingredients).toBe(fixture.ingredients);
    expect(result.product.ingredients.map((ingredient) => ingredient.nameKo)).toEqual([
      '비타민 E',
      '닭고기 분말',
      '소르빈산 칼륨',
      '맥주효모',
    ]);

    const byLabel = new Map(result.resolutions.map((resolution) => [resolution.rawNameKo, resolution.decision]));
    expect(byLabel.get('비타민 E')).toMatchObject({ status: 'matched', canonicalName: '비타민e' });
    expect(byLabel.get('닭고기 분말')).toMatchObject({ status: 'unmatched' });
    expect(byLabel.get('소르빈산 칼륨')).toMatchObject({ status: 'blocked' });
    expect(byLabel.get('맥주효모')).toMatchObject({ status: 'ambiguous' });
  });
});
