import { describe, expect, it } from 'vitest';
import type { Product, UserPetProfile } from '../types';
import {
  calculateCompatibilityScore,
  getRecommendationBreakdown,
  rankProductsForProfile,
  resolveDisplayVerdict,
} from '../utils/score';
import { captureLegacyHealthConcernShadowBaseline } from './healthConcernScoreShadow';

const profile: UserPetProfile = {
  id: 'shadow-profile',
  name: 'Shadow pet',
  species: 'Dog',
  age: 4,
  allergies: ['닭'],
  healthConcerns: ['관절'],
  productPreferences: { 'shadow-product': 1 },
};

const product: Product = {
  id: 'shadow-product',
  brand: 'Fixture',
  name: 'Shadow product',
  category: 'food',
  mainCategory: 'food',
  targetPetType: 'dog',
  imageUrl: '',
  ingredients: [
    { id: 'chicken', nameKo: '닭고기', nameEn: 'chicken', purpose: '', riskLevel: 'safe' },
    { id: 'duck', nameKo: '오리고기', nameEn: 'duck', purpose: '', riskLevel: 'caution' },
    { id: 'joint', nameKo: '글루코사민', nameEn: 'glucosamine', purpose: '관절', riskLevel: 'safe' },
  ],
  healthConcerns: ['관절'],
  reviewsCount: 0,
  averageRating: 0,
};

function verdictFor(breakdown: ReturnType<typeof getRecommendationBreakdown>) {
  return resolveDisplayVerdict(breakdown.total, {
    speciesMismatch: breakdown.speciesMismatch,
    allergyHits: breakdown.allergyHits.length,
    dangerCount: breakdown.dangerCount,
  });
}

describe('health-concern score shadow invariance', () => {
  it('does not mutate runtime score, display, inputs, or safety signals when executed', () => {
    const productBefore = structuredClone(product);
    const profileBefore = structuredClone(profile);
    const breakdownBefore = getRecommendationBreakdown(product, profile);
    const scoreBefore = calculateCompatibilityScore(product, profile);
    const verdictBefore = verdictFor(breakdownBefore);

    const observation = captureLegacyHealthConcernShadowBaseline(product, profile);
    const breakdownAfter = getRecommendationBreakdown(product, profile);

    expect(observation).toEqual({
      breakdown: breakdownBefore,
      compatibilityScore: scoreBefore,
      displayVerdict: verdictBefore,
    });
    expect(calculateCompatibilityScore(product, profile)).toBe(scoreBefore);
    expect(breakdownAfter).toEqual(breakdownBefore);
    expect(verdictFor(breakdownAfter)).toEqual(verdictBefore);
    expect(product).toEqual(productBefore);
    expect(profile).toEqual(profileBefore);
    expect(breakdownAfter.allergyHits).toEqual(breakdownBefore.allergyHits);
    expect(breakdownAfter.allergyCautions).toEqual(breakdownBefore.allergyCautions);
    expect(breakdownAfter.allergyPenalty).toBe(breakdownBefore.allergyPenalty);
    expect(breakdownAfter.allergyCautionPenalty).toBe(breakdownBefore.allergyCautionPenalty);
    expect(breakdownAfter.reasons).toEqual(breakdownBefore.reasons);
  });

  it('does not alter deterministic runtime ranking', () => {
    const alternatives = [
      product,
      { ...product, id: 'safe-product', name: 'Safe product', ingredients: product.ingredients.slice(2) },
      { ...product, id: 'danger-product', name: 'Danger product', ingredients: [
        { id: 'danger', nameKo: '위험 원료', nameEn: 'danger', purpose: '', riskLevel: 'danger' as const },
      ] },
    ];
    const before = rankProductsForProfile(alternatives, profile).map((row) => ({ id: row.product.id, score: row.score }));

    for (const fixture of alternatives) captureLegacyHealthConcernShadowBaseline(fixture, profile);

    const after = rankProductsForProfile(alternatives, profile).map((row) => ({ id: row.product.id, score: row.score }));
    expect(after).toEqual(before);
  });
});
