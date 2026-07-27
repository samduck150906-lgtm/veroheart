import { describe, expect, it } from 'vitest';
import type { Ingredient, Product, UserPetProfile } from '../types';
import { DEFAULT_USER_PET_PROFILE } from '../types';
import { isRealPetProfile, resolveProductDisplayVerdict } from './displayVerdict';
import { getRecommendationBreakdown } from './score';

function ingredient(nameKo: string, riskLevel: Ingredient['riskLevel'] = 'safe'): Ingredient {
  return { id: nameKo, nameKo, nameEn: nameKo, purpose: '', riskLevel };
}

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: 'product-1',
    brand: 'Test Brand',
    name: 'Test Product',
    category: 'food',
    mainCategory: 'food',
    targetPetType: 'dog',
    imageUrl: '',
    ingredients: [ingredient('닭고기'), ingredient('유산균')],
    reviewsCount: 100,
    averageRating: 4.5,
    verificationStatus: 'verified',
    ...overrides,
  };
}

const profile: UserPetProfile = {
  id: 'pet-1',
  name: 'Test Pet',
  species: 'Dog',
  age: 4,
  healthConcerns: [],
  allergies: [],
};

describe('resolveProductDisplayVerdict', () => {
  it('keeps safe product card score aligned with the recommendation score', () => {
    const input = product();
    const breakdown = getRecommendationBreakdown(input, profile);
    const display = resolveProductDisplayVerdict(input, profile);

    expect(display.breakdown).toEqual(breakdown);
    expect(display.score).toBe(breakdown.total);
    expect(display.verdict.capReason).toBeNull();
  });

  it('keeps species mismatch visibly blocked at zero', () => {
    const display = resolveProductDisplayVerdict(product({ targetPetType: 'cat' }), profile);

    expect(display.breakdown.speciesMismatch).toBe(true);
    expect(display.score).toBe(0);
    expect(display.grade).toBe('F');
  });

  it('caps allergy display below ten even if a caller bypasses the detail page', () => {
    const allergicProfile: UserPetProfile = { ...profile, allergies: ['닭'] };
    const display = resolveProductDisplayVerdict(product(), allergicProfile);

    expect(display.breakdown.allergyHits).toEqual(['닭']);
    expect(display.score).toBeLessThanOrEqual(9);
    expect(display.grade).toBe('F');
  });

  it('caps danger ingredient display at C grade ceiling', () => {
    const risky = product({
      ingredients: [ingredient('고기', 'safe'), ingredient('위험원료', 'danger')],
    });
    const display = resolveProductDisplayVerdict(risky, profile);

    expect(display.breakdown.dangerCount).toBe(1);
    expect(display.score).toBeLessThanOrEqual(69);
    expect(display.grade).not.toBe('A');
    expect(display.grade).not.toBe('B');
  });
});

describe('게스트(기본 프로필) 표시 점수', () => {
  it('isRealPetProfile: 기본 프로필은 false, 실제 펫은 true', () => {
    expect(isRealPetProfile(DEFAULT_USER_PET_PROFILE)).toBe(false);
    expect(isRealPetProfile(profile)).toBe(true);
    expect(isRealPetProfile(null)).toBe(false);
  });

  it('게스트에게는 종 불일치 0점을 적용하지 않고 객관 점수를 보여준다', () => {
    // 기본 프로필은 종=Dog — 고양이 제품이 게스트에게 0점으로 보이면 안 된다
    const catProduct = product({ targetPetType: 'cat' });
    const display = resolveProductDisplayVerdict(catProduct, DEFAULT_USER_PET_PROFILE);

    expect(display.breakdown.speciesMismatch).toBe(true); // 원 breakdown은 그대로
    expect(display.score).toBe(display.breakdown.baseScore); // 표시값은 객관 점수
    expect(display.score).toBeGreaterThan(0);
    expect(display.verdict.capReason).toBeNull();
  });

  it('게스트에게도 위험 성분 상한(≤69)은 그대로 적용한다', () => {
    const risky = product({
      targetPetType: 'cat',
      ingredients: [ingredient('고기', 'safe'), ingredient('위험원료', 'danger')],
    });
    const display = resolveProductDisplayVerdict(risky, DEFAULT_USER_PET_PROFILE);

    expect(display.score).toBeLessThanOrEqual(69);
  });
});
