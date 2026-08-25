/**
 * 회귀 테스트 — 분석 엔진 결정성.
 *
 * 같은 제품 + 같은 반려동물이면 몇 번을 열어도 같은 결과가 나와야 한다.
 * 사용자가 화면을 다시 열 때마다 점수나 경고 문구가 흔들리면, 결과 자체를
 * 신뢰할 수 없게 된다.
 *
 * 흔들림의 원인이 되는 것들을 함께 막는다.
 *   - Math.random / Date.now 의존
 *   - 객체 키 순회 순서 의존
 *   - toLocaleString 등 로케일 의존
 *   - 입력 배열을 제자리에서 정렬하는 부수효과(호출할수록 입력이 변형된다)
 */
import { describe, expect, it } from 'vitest';
import { analyzeFeed } from './feedAnalysis';
import { runScoringPipeline } from './scoringPipeline';
import {
  getRecommendationBreakdown,
  resolveDisplayVerdict,
  calculateCompatibilityScore,
} from '../utils/score';
import { buildProductConclusion } from '../utils/productConclusion';
import type { Product, UserPetProfile } from '../types';

const ITERATIONS = 100;

function product(): Product {
  return {
    id: 'determinism-fixture',
    brand: '베로로테스트',
    name: '연어 & 닭고기 어덜트 사료',
    category: '사료',
    mainCategory: '사료',
    targetPetType: 'dog',
    imageUrl: '',
    caloriesPer100g: 365,
    verificationStatus: 'verified',
    reviewsCount: 3,
    averageRating: 4.2,
    guaranteedAnalysis: {
      crudeProtein: 29,
      crudeFat: 16,
      crudeFiber: 3.5,
      crudeAsh: 7,
      moisture: 9,
      calcium: 1.4,
      phosphorus: 1.0,
    },
    ingredients: [
      { id: 'i1', nameKo: '연어', nameEn: 'salmon', purpose: '', riskLevel: 'safe' },
      { id: 'i2', nameKo: '닭고기 분말', nameEn: 'chicken meal', purpose: '', riskLevel: 'safe' },
      { id: 'i3', nameKo: '완두콩', nameEn: 'pea', purpose: '', riskLevel: 'safe' },
      { id: 'i4', nameKo: '옥수수', nameEn: 'corn', purpose: '', riskLevel: 'caution' },
      { id: 'i5', nameKo: 'BHA', nameEn: 'BHA', purpose: '', riskLevel: 'danger' },
      { id: 'i6', nameKo: '정제어유', nameEn: 'fish oil', purpose: '', riskLevel: 'safe' },
    ],
  } as Product;
}

function profile(): UserPetProfile {
  return {
    name: '보리',
    species: 'Dog',
    breed: '푸들',
    age: 5,
    weightKg: 6.4,
    allergies: ['닭고기'],
    healthConcerns: ['피부·모질', '관절'],
  } as UserPetProfile;
}

/** 순회 순서 의존을 드러내기 위해 키 순서를 뒤집은 사본 */
function withReversedKeys<T extends object>(obj: T): T {
  const reversed = Object.fromEntries(Object.entries(obj).reverse());
  return reversed as T;
}

describe('분석 엔진 결정성', () => {
  it(`analyzeFeed 를 ${ITERATIONS}회 호출해도 결과가 같다`, () => {
    const first = JSON.stringify(analyzeFeed(product(), profile()));
    for (let i = 0; i < ITERATIONS; i += 1) {
      expect(JSON.stringify(analyzeFeed(product(), profile()))).toBe(first);
    }
  });

  it(`적합도 점수·등급·근거가 ${ITERATIONS}회 동일하다`, () => {
    const first = JSON.stringify(getRecommendationBreakdown(product(), profile()));
    const firstVerdict = JSON.stringify(resolveDisplayVerdict(product(), profile()));
    const firstScore = calculateCompatibilityScore(product(), profile());

    for (let i = 0; i < ITERATIONS; i += 1) {
      expect(JSON.stringify(getRecommendationBreakdown(product(), profile()))).toBe(first);
      expect(JSON.stringify(resolveDisplayVerdict(product(), profile()))).toBe(firstVerdict);
      expect(calculateCompatibilityScore(product(), profile())).toBe(firstScore);
    }
  });

  it(`점수 파이프라인과 결론 문장이 ${ITERATIONS}회 동일하다`, () => {
    const p = product();
    const first = JSON.stringify(runScoringPipeline(p, profile().breed));
    const firstConclusion = JSON.stringify(buildProductConclusion(product(), profile()));

    for (let i = 0; i < ITERATIONS; i += 1) {
      expect(JSON.stringify(runScoringPipeline(product(), profile().breed))).toBe(first);
      expect(JSON.stringify(buildProductConclusion(product(), profile()))).toBe(firstConclusion);
    }
  });

  it('같은 인스턴스를 반복해서 넘겨도 결과가 변하지 않는다(입력 변형 없음)', () => {
    // 같은 객체를 계속 넘긴다. 엔진이 입력 배열을 제자리 정렬하는 등
    // 부수효과를 남기면 두 번째 호출부터 결과가 달라진다.
    const p = product();
    const pet = profile();
    const ingredientOrder = p.ingredients?.map((i) => i.id).join(',');

    const first = JSON.stringify(analyzeFeed(p, pet));
    for (let i = 0; i < ITERATIONS; i += 1) {
      expect(JSON.stringify(analyzeFeed(p, pet))).toBe(first);
    }
    expect(p.ingredients?.map((i) => i.id).join(',')).toBe(ingredientOrder);
    expect(pet.allergies).toEqual(['닭고기']);
  });

  it('보장성분·프로필의 키 순서가 달라도 결과가 같다', () => {
    const base = product();
    const shuffled: Product = {
      ...base,
      guaranteedAnalysis: withReversedKeys(base.guaranteedAnalysis ?? {}),
    };

    expect(JSON.stringify(analyzeFeed(shuffled, withReversedKeys(profile())))).toBe(
      JSON.stringify(analyzeFeed(base, profile())),
    );
  });

  it('알레르기 판정이 반복 호출에도 뒤집히지 않는다', () => {
    // 닭고기 알레르기 + "닭고기 분말" 원료 → 매번 같은 회피 판정이어야 한다.
    const first = analyzeFeed(product(), profile());
    expect(first.ingredientQuality.allergyHits.length).toBeGreaterThan(0);

    for (let i = 0; i < ITERATIONS; i += 1) {
      const again = analyzeFeed(product(), profile());
      expect(again.ingredientQuality.allergyHits).toEqual(first.ingredientQuality.allergyHits);
      expect(again.summary).toBe(first.summary);
      expect(again.grade).toBe(first.grade);
    }
  });
});
