import { describe, it, expect } from 'vitest';
import {
  getRecommendationBreakdown,
  gradeFromScore,
  ALLERGEN_SCORE_CAP,
  DANGER_SCORE_CAP,
} from './score';
import type { Product, UserPetProfile, Ingredient } from '../types';

function ing(nameKo: string, riskLevel: Ingredient['riskLevel'] = 'safe'): Ingredient {
  return { id: nameKo, nameKo, nameEn: nameKo, purpose: '', riskLevel };
}

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    brand: '테스트',
    name: '테스트 사료',
    category: '사료',
    mainCategory: '사료',
    targetPetType: 'dog',
    targetLifeStage: ['어덜트'],
    price: 30000,
    imageUrl: '',
    ingredients: [ing('오리고기'), ing('현미'), ing('글루코사민')],
    reviewsCount: 1000,
    averageRating: 4.8,
    verificationStatus: 'verified',
    ...overrides,
  };
}

const profile: UserPetProfile = {
  id: 'pet',
  name: '베로',
  species: 'Dog',
  age: 4,
  healthConcerns: [],
  allergies: [],
};

describe('gradeFromScore', () => {
  it('maps score ranges to grades', () => {
    expect(gradeFromScore(90)).toBe('A');
    expect(gradeFromScore(75)).toBe('B');
    expect(gradeFromScore(60)).toBe('C');
    expect(gradeFromScore(40)).toBe('D');
  });
});

describe('compatibility hard caps', () => {
  it('clean premium product scores high (A/B) for a matching pet', () => {
    const b = getRecommendationBreakdown(makeProduct(), profile);
    expect(b.total).toBeGreaterThanOrEqual(70);
    expect(b.capped).toBe(false);
    expect(['A', 'B']).toContain(b.grade);
  });

  it('caps score when product contains the pet allergen (never recommended)', () => {
    const allergicPet: UserPetProfile = { ...profile, allergies: ['닭고기'] };
    const product = makeProduct({ ingredients: [ing('닭고기'), ing('현미'), ing('글루코사민')] });
    const b = getRecommendationBreakdown(product, allergicPet);
    expect(b.allergyHits).toContain('닭고기');
    expect(b.total).toBeLessThanOrEqual(ALLERGEN_SCORE_CAP);
    expect(b.capped).toBe(true);
    expect(['C', 'D']).toContain(b.grade);
  });

  it('caps score below A when a danger ingredient is present', () => {
    const product = makeProduct({ ingredients: [ing('오리고기'), ing('BHA', 'danger')] });
    const b = getRecommendationBreakdown(product, profile);
    expect(b.dangerCount).toBeGreaterThan(0);
    expect(b.total).toBeLessThanOrEqual(DANGER_SCORE_CAP);
    expect(b.grade).not.toBe('A');
  });
});
