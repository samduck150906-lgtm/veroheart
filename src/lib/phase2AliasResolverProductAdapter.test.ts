import { describe, expect, it } from 'vitest';
import type { Ingredient, Product } from '../types';
import type { Phase2AliasSeed } from './phase2AliasResolver';
import { resolveProductWithPhase2AliasAdapter } from './phase2AliasResolverProductAdapter';

function ingredient(nameKo: string, riskLevel: Ingredient['riskLevel'] = 'safe'): Ingredient {
  return { id: nameKo, nameKo, nameEn: nameKo, purpose: '', riskLevel };
}

const product: Product = {
  id: 'product-1',
  brand: 'Fixture Brand',
  name: 'Fixture Product',
  category: 'food',
  mainCategory: 'food',
  targetPetType: 'dog',
  imageUrl: '',
  ingredients: [ingredient('비타민 E'), ingredient('닭고기 분말'), ingredient('소르빈산 칼륨')],
  reviewsCount: 0,
  averageRating: 0,
  verificationStatus: 'verified',
};

const aliases: Phase2AliasSeed[] = [
  { alias: '비타민 E', canonicalName: '비타민e', canonicalId: 'fixture-canonical-vitamin-e' },
];

const canonicals = [{ canonicalName: '비타민e', canonicalId: 'fixture-canonical-vitamin-e' }];
const blockedTerms = ['소르빈산칼륨'];

describe('resolveProductWithPhase2AliasAdapter', () => {
  it('returns the original product unchanged when the feature flag is absent', () => {
    const result = resolveProductWithPhase2AliasAdapter({ product, aliases, canonicals, blockedTerms });

    expect(result.enabled).toBe(false);
    expect(result.product).toBe(product);
    expect(result.changed).toBe(false);
    expect(result.resolutions).toEqual([]);
    expect(result.reason).toBe('feature_flag_disabled');
  });

  it('returns the original product unchanged when the feature flag is explicitly false', () => {
    const result = resolveProductWithPhase2AliasAdapter({
      product,
      aliases,
      canonicals,
      blockedTerms,
      flags: { phase2AliasResolver: false },
    });

    expect(result.enabled).toBe(false);
    expect(result.product).toBe(product);
    expect(result.product.ingredients).toBe(product.ingredients);
    expect(result.changed).toBe(false);
    expect(result.resolutions).toHaveLength(0);
  });

  it('produces candidate sidecar resolutions only when explicitly enabled', () => {
    const result = resolveProductWithPhase2AliasAdapter({
      product,
      aliases,
      canonicals,
      blockedTerms,
      flags: { phase2AliasResolver: true },
    });

    expect(result.enabled).toBe(true);
    expect(result.product).toBe(product);
    expect(result.product.ingredients).toBe(product.ingredients);
    expect(result.changed).toBe(false);
    expect(result.reason).toBe('candidate_sidecar_only_no_runtime_change');
    expect(result.resolutions).toHaveLength(3);

    expect(result.resolutions.map((resolution) => [resolution.rawNameKo, resolution.decision.status])).toEqual([
      ['비타민 E', 'matched'],
      ['닭고기 분말', 'unmatched'],
      ['소르빈산 칼륨', 'blocked'],
    ]);
  });

  it('never changes ingredient labels while producing sidecar candidates', () => {
    const before = product.ingredients.map((item) => item.nameKo);
    const result = resolveProductWithPhase2AliasAdapter({
      product,
      aliases,
      canonicals,
      blockedTerms,
      flags: { phase2AliasResolver: true },
    });
    const after = result.product.ingredients.map((item) => item.nameKo);

    expect(after).toEqual(before);
    expect(result.resolutions[0].decision.canonicalCandidate?.canonicalName).toBe('비타민e');
    expect(result.resolutions[0].decision.outputLabel).toBe('비타민 E');
    expect(result.resolutions[2].decision.canonicalCandidate).toBeNull();
  });

  it('handles products without ingredients without mutating the product', () => {
    const emptyProduct: Product = { ...product, id: 'empty-product', ingredients: [] };
    const result = resolveProductWithPhase2AliasAdapter({
      product: emptyProduct,
      aliases,
      canonicals,
      blockedTerms,
      flags: { phase2AliasResolver: true },
    });

    expect(result.enabled).toBe(true);
    expect(result.product).toBe(emptyProduct);
    expect(result.changed).toBe(false);
    expect(result.resolutions).toEqual([]);
    expect(result.reason).toBe('no_ingredients_no_runtime_change');
  });
});
