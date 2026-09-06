import { describe, expect, it } from 'vitest';
import type { Ingredient, Product, UserPetProfile } from '../types';
import { getRecommendationBreakdown, resolveDisplayVerdict } from './score';

function ingredient(nameKo: string, nameEn = '', purpose = ''): Ingredient {
  return { id: `${nameKo}:${nameEn}:${purpose}`, nameKo, nameEn, purpose, riskLevel: 'safe' };
}

function product(ingredients: Ingredient[], overrides: Partial<Product> = {}): Product {
  return {
    id: 'heart-anatomy-fixture',
    brand: 'Fixture',
    name: 'Heart anatomy fixture',
    category: 'food',
    mainCategory: 'food',
    targetPetType: 'dog',
    imageUrl: '',
    ingredients,
    reviewsCount: 0,
    averageRating: 0,
    ...overrides,
  };
}

function profile(overrides: Partial<UserPetProfile> = {}): UserPetProfile {
  return {
    id: 'pet-1',
    name: 'Fixture pet',
    species: 'Dog',
    age: 4,
    healthConcerns: ['심장'],
    allergies: [],
    ...overrides,
  };
}

describe('legacy concern fit anatomical-heart boundary', () => {
  it.each([
    [ingredient('닭고기 심장', 'Chicken Heart'), '심장'],
    [ingredient('원료', 'Rabbit Hearts'), 'heart'],
  ])('treats an anatomical heart ingredient alone as no direct concern match', (source, concern) => {
    const item = product([source]);
    const sourceProfile = profile({ healthConcerns: [concern] });
    const itemBefore = structuredClone(item);
    const profileBefore = structuredClone(sourceProfile);
    const breakdown = getRecommendationBreakdown(item, sourceProfile);

    expect(breakdown.concernFit).toBe(5);
    expect(breakdown.matchedConcerns).toEqual([]);
    expect(breakdown.reasons).toContain('등록한 건강 고민과 직접 매칭되는 정보가 적음');
    expect(breakdown.reasons.some((reason) => reason.includes('고민과 연관'))).toBe(false);
    expect(item).toEqual(itemBefore);
    expect(sourceProfile).toEqual(profileBefore);
  });

  it('retains a genuine matching product health tag', () => {
    const breakdown = getRecommendationBreakdown(
      product([ingredient('닭고기 심장', 'Chicken Heart')], { healthConcerns: ['심장 건강'] }),
      profile(),
    );
    expect(breakdown.concernFit).toBe(20);
    expect(breakdown.matchedConcerns).toEqual(['심장']);
    expect(breakdown.reasons).toContain('심장 고민과 연관');
  });

  it('retains explicit purpose evidence on an anatomical ingredient', () => {
    const breakdown = getRecommendationBreakdown(
      product([ingredient('토끼 심장', 'Rabbit Heart', '심장 건강 지원')]),
      profile(),
    );
    expect(breakdown.concernFit).toBe(20);
    expect(breakdown.matchedConcerns).toEqual(['심장']);
  });

  it('retains independent legitimate name or purpose evidence in another ingredient', () => {
    const item = product([
      ingredient('닭고기 심장', 'Chicken Heart'),
      ingredient('심장 건강 배합 성분'),
    ]);
    expect(getRecommendationBreakdown(item, profile())).toMatchObject({
      concernFit: 20,
      matchedConcerns: ['심장'],
    });
  });

  it('leaves non-heart concern matching unchanged', () => {
    const breakdown = getRecommendationBreakdown(
      product([ingredient('관절 건강 원료', 'joint support ingredient')]),
      profile({ healthConcerns: ['관절'] }),
    );
    expect(breakdown.concernFit).toBe(20);
    expect(breakdown.matchedConcerns).toEqual(['관절']);
  });

  it('isolates the change from allergy, poultry, preference, species, and safety components', () => {
    const item = product(
      [ingredient('오리 심장', 'Duck Heart')],
      { id: 'isolated', targetPetType: 'cat' },
    );
    const sharedProfile = {
      species: 'Dog' as const,
      allergies: ['닭'],
      productPreferences: { isolated: 1 },
    };
    const heart = getRecommendationBreakdown(item, profile({ ...sharedProfile, healthConcerns: ['심장'] }));
    const unrelated = getRecommendationBreakdown(item, profile({ ...sharedProfile, healthConcerns: ['관절'] }));

    expect(heart).toEqual(unrelated);
    expect(heart).toMatchObject({
      concernFit: 5,
      speciesMismatch: true,
      preferencePenalty: 30,
      dangerCount: 0,
      cautionCount: 0,
    });
    expect(heart.allergyHits).toEqual([]);
    expect(heart.allergyCautions).toEqual(unrelated.allergyCautions);
    expect(heart.allergyCautionPenalty).toBe(unrelated.allergyCautionPenalty);
    expect(heart.ingredientSafety).toBe(unrelated.ingredientSafety);
    expect(heart.healthSuitability).toBe(unrelated.healthSuitability);
  });

  it('keeps display verdict derivation on the existing path', () => {
    const item = product([ingredient('닭고기 심장', 'Chicken Heart')]);
    const breakdown = getRecommendationBreakdown(item, profile());
    const verdict = resolveDisplayVerdict(breakdown.total, {
      speciesMismatch: breakdown.speciesMismatch,
      allergyHits: breakdown.allergyHits.length,
      dangerCount: breakdown.dangerCount,
    });

    expect(verdict.score).toBe(breakdown.total);
    expect(verdict.capReason).toBeNull();
    expect(breakdown.baseScore).toBe(
      breakdown.ingredientSafety + breakdown.healthSuitability + breakdown.concernFit,
    );
  });
});
