import { describe, expect, it } from 'vitest';
import {
  buildRecommendationBreakdown,
  calculateCompatibilityScore,
  getCompatibilityBreakdown,
  getProductRecommendationInsights,
  getRecommendationBreakdown,
  gradeFromScore,
  rankProductsForProfile,
  resolveDisplayVerdict,
} from './score';
import type { Ingredient, Product, UserPetProfile } from '../types';

// TODO: This is a temporary legacy score contract. Replace these tests with the unified analysis engine tests.

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
    targetLifeStage: ['adult'],
    imageUrl: '',
    ingredients: [ingredient('protein'), ingredient('grain')],
    reviewsCount: 100,
    averageRating: 4,
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

function expectCurrentBreakdownShape(result: ReturnType<typeof getRecommendationBreakdown>) {
  expect(result).toEqual({
    total: expect.any(Number),
    safety: expect.any(Number),
    concern: expect.any(Number),
    socialProof: expect.any(Number),
    value: expect.any(Number),
    petFit: expect.any(Number),
    verification: expect.any(Number),
    allergyHits: expect.any(Array),
    matchedConcerns: expect.any(Array),
    dangerCount: expect.any(Number),
    cautionCount: expect.any(Number),
    reasons: expect.any(Array),
  });
  expect(result.total).toBeGreaterThanOrEqual(0);
  expect(result.total).toBeLessThanOrEqual(100);
}

describe('legacy compatibility score public contract', () => {
  it('returns the current breakdown shape with a bounded score', () => {
    expectCurrentBreakdownShape(getRecommendationBreakdown(product(), profile));
  });

  it('calculates a bounded score consistently for identical input', () => {
    const input = product();
    const first = calculateCompatibilityScore(input, profile);
    const second = calculateCompatibilityScore(input, profile);

    expect(first).toBe(second);
    expect(first).toBe(getRecommendationBreakdown(input, profile).total);
    expect(first).toBeGreaterThanOrEqual(0);
    expect(first).toBeLessThanOrEqual(100);
  });

  it('keeps the compatibility breakdown alias consistent', () => {
    const input = product();
    const result = getCompatibilityBreakdown(input, profile);

    expectCurrentBreakdownShape(result);
    expect(result).toEqual(getRecommendationBreakdown(input, profile));
  });

  it('keeps the build breakdown alias consistent', () => {
    const input = product();
    const result = buildRecommendationBreakdown(input, profile);

    expectCurrentBreakdownShape(result);
    expect(result).toEqual(getRecommendationBreakdown(input, profile));
  });

  it('returns insights derived from the same breakdown', () => {
    const input = product();
    const result = getProductRecommendationInsights(input, profile);

    expectCurrentBreakdownShape(result.breakdown);
    expect(result.breakdown).toEqual(getRecommendationBreakdown(input, profile));
    expect(result.reasons).toEqual(result.breakdown.reasons);
  });

  it('does not change the raw ranking score when applying the display cap', () => {
    // 하드캡은 표시용일 뿐, 랭킹에 쓰는 원점수 계약은 그대로여야 한다.
    const input = product({ ingredients: [ingredient('닭고기', 'danger')] });
    const raw = calculateCompatibilityScore(input, profile);
    expect(raw).toBe(getRecommendationBreakdown(input, profile).total);
  });

  it('ranks products by their calculated score in descending order (unchanged legacy contract)', () => {
    const products = [
      product({ id: 'product-a', reviewsCount: 0, averageRating: 0, verificationStatus: 'pending' }),
      product({ id: 'product-b', reviewsCount: 20, averageRating: 3, verificationStatus: 'verified' }),
      product({ id: 'product-c', reviewsCount: 500, averageRating: 5, verificationStatus: 'verified' }),
    ];
    const ranked = rankProductsForProfile(products, profile);

    expect(ranked).toHaveLength(products.length);
    for (const entry of ranked) {
      expect(entry.score).toBe(calculateCompatibilityScore(entry.product, profile));
      expect(entry.breakdown.total).toBe(entry.score);
    }
    for (let index = 1; index < ranked.length; index += 1) {
      expect(ranked[index - 1].score).toBeGreaterThanOrEqual(ranked[index].score);
    }
  });
});

describe('resolveDisplayVerdict — 표시 등급 하드캡', () => {
  it('알레르기·위험 성분이 없으면 원점수/등급을 그대로 표시한다', () => {
    const v = resolveDisplayVerdict(88);
    expect(v.score).toBe(88);
    expect(v.grade).toBe('A');
    expect(v.capReason).toBeNull();
  });

  it('회피(알레르기) 성분이 있으면 높은 점수라도 최대 D로 하드캡한다', () => {
    const v = resolveDisplayVerdict(88, { allergyHits: 1 });
    expect(v.score).toBe(54);
    expect(v.grade).toBe('D'); // "주의가 필요해요" — 빨간 경고 배너와 일치
    expect(v.capReason).toBe('allergy');
  });

  it('위험 성분이 있으면(알레르기 없음) 최대 C로 하드캡한다', () => {
    const v = resolveDisplayVerdict(90, { dangerCount: 2 });
    expect(v.score).toBe(69);
    expect(v.grade).toBe('C'); // "보통이에요"
    expect(v.capReason).toBe('danger');
  });

  it('알레르기가 위험 성분보다 우선한다', () => {
    const v = resolveDisplayVerdict(95, { allergyHits: 1, dangerCount: 3 });
    expect(v.score).toBe(54);
    expect(v.capReason).toBe('allergy');
  });

  it('원점수가 이미 상한선보다 낮으면 점수를 올리지 않고 사유도 비운다', () => {
    const v = resolveDisplayVerdict(30, { allergyHits: 1 });
    expect(v.score).toBe(30); // 상한(54)이 실제로 끌어내리지 않음
    expect(v.grade).toBe('F');
    expect(v.capReason).toBeNull();
  });

  it('표시 등급은 항상 하드캡된 점수의 gradeFromScore와 일치한다(모순 없음)', () => {
    for (const raw of [100, 92, 71, 60, 42, 10]) {
      for (const opts of [{}, { allergyHits: 1 }, { dangerCount: 1 }]) {
        const v = resolveDisplayVerdict(raw, opts);
        expect(v.grade).toBe(gradeFromScore(v.score));
      }
    }
  });

  it('비정상 입력(NaN/음수/100 초과)을 0~100 범위로 안전 처리한다', () => {
    expect(resolveDisplayVerdict(Number.NaN).score).toBe(0);
    expect(resolveDisplayVerdict(-20).score).toBe(0);
    expect(resolveDisplayVerdict(140).score).toBe(100);
    expect(resolveDisplayVerdict(140, { allergyHits: 1 }).score).toBe(54);
  });
});
