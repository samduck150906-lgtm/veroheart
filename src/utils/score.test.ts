import { describe, it, expect } from 'vitest';
import {
  getRecommendationBreakdown,
  getProductBadges,
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

describe('심화 품질 신호 (DCM / 단백 보강)', () => {
  it('상위 원료에 콩과 식물 2종 이상이면 legumeRisk=danger이고 점수가 낮아진다', () => {
    const clean = getRecommendationBreakdown(makeProduct(), profile);
    const dcm = getRecommendationBreakdown(
      makeProduct({ ingredients: [ing('오리고기'), ing('완두'), ing('렌틸콩'), ing('현미')] }),
      profile,
    );
    expect(dcm.legumeRisk).toBe('danger');
    expect(dcm.total).toBeLessThan(clean.total);
    expect(dcm.reasons.some(r => r.includes('DCM'))).toBe(true);
  });

  it('가공 식물성 단백이 있으면 proteinInflated=true', () => {
    const b = getRecommendationBreakdown(
      makeProduct({ ingredients: [ing('오리고기'), ing('완두단백'), ing('현미')] }),
      profile,
    );
    expect(b.proteinInflated).toBe(true);
    expect(b.reasons.some(r => r.includes('단백 보강'))).toBe(true);
  });

  it('통곡·동물성 위주 구성은 신호가 없다', () => {
    const b = getRecommendationBreakdown(makeProduct(), profile);
    expect(b.legumeRisk).toBe('none');
    expect(b.proteinInflated).toBe(false);
  });
});

describe('견종 호발 질환 반영 (breedRiskFails)', () => {
  const renalRiskGA = { crudeProtein: 30, crudeFat: 14, moisture: 10, crudeFiber: 3, crudeAsh: 7, calcium: 1.8, phosphorus: 1.5 };

  it('견종 미설정이면 breedRiskFails=0이고 점수에 영향 없다', () => {
    const product = makeProduct({ guaranteedAnalysis: renalRiskGA });
    const b = getRecommendationBreakdown(product, profile);
    expect(b.breedRiskFails).toBe(0);
    expect(b.breedMatched).toBeNull();
  });

  it('신장 호발 견종(뉴펀들랜드) + 고인 사료는 견종 위반을 잡아내고 감점한다', () => {
    const product = makeProduct({ guaranteedAnalysis: renalRiskGA });
    const breedPet: UserPetProfile = { ...profile, breed: '뉴펀들랜드' };
    const withBreed = getRecommendationBreakdown(product, breedPet);
    const without = getRecommendationBreakdown(product, profile);
    expect(withBreed.breedMatched).toBeTruthy();
    expect(withBreed.breedRiskFails).toBeGreaterThan(0);
    expect(withBreed.safety).toBeLessThan(without.safety);
    expect(withBreed.reasons.some(r => r.includes('호발 질환'))).toBe(true);
  });

  it('견종 위반 시 견종 주의 배지가 노출된다', () => {
    const product = makeProduct({ guaranteedAnalysis: renalRiskGA });
    const breedPet: UserPetProfile = { ...profile, breed: '뉴펀들랜드' };
    const badges = getProductBadges(getRecommendationBreakdown(product, breedPet));
    expect(badges.some(b => b.label === '견종 주의')).toBe(true);
  });
});

describe('getProductBadges (목록 분석 배지)', () => {
  it('알러지 포함 제품은 danger 배지를 최우선 노출한다', () => {
    const allergicPet: UserPetProfile = { ...profile, allergies: ['닭고기'] };
    const product = makeProduct({ ingredients: [ing('닭고기'), ing('현미')] });
    const badges = getProductBadges(getRecommendationBreakdown(product, allergicPet));
    expect(badges[0]).toEqual({ label: '알러지 포함', tone: 'danger' });
  });

  it('콩과 과다 제품은 DCM 주의 배지를 노출한다', () => {
    const product = makeProduct({ ingredients: [ing('오리고기'), ing('완두'), ing('렌틸콩'), ing('현미')] });
    const badges = getProductBadges(getRecommendationBreakdown(product, profile));
    expect(badges.some(b => b.label === 'DCM 주의')).toBe(true);
  });

  it('AAFCO 충족 시 good 배지를 노출한다', () => {
    const product = makeProduct({
      guaranteedAnalysis: { crudeProtein: 28, crudeFat: 14, moisture: 10, calcium: 1.2, phosphorus: 0.8 },
    });
    const badges = getProductBadges(getRecommendationBreakdown(product, profile));
    expect(badges.some(b => b.label === 'AAFCO 충족' && b.tone === 'good')).toBe(true);
  });

  it('기본 최대 2개까지만 반환한다', () => {
    const allergicPet: UserPetProfile = { ...profile, allergies: ['오리고기'] };
    const product = makeProduct({ ingredients: [ing('오리고기'), ing('완두'), ing('렌틸콩'), ing('BHA', 'danger')] });
    const badges = getProductBadges(getRecommendationBreakdown(product, allergicPet));
    expect(badges.length).toBeLessThanOrEqual(2);
  });
});

describe('nutrition bucket (AAFCO DMB)', () => {
  it('returns nutrition=0 when guaranteedAnalysis is absent', () => {
    const b = getRecommendationBreakdown(makeProduct(), profile);
    expect(b.nutrition).toBe(0);
  });

  it('gives high nutrition score when AAFCO minimums are met (dog: protein≥18%, fat≥5.5% DMB)', () => {
    const product = makeProduct({
      guaranteedAnalysis: { crudeProtein: 28, crudeFat: 14, moisture: 10, crudeFiber: 3, crudeAsh: 7, calcium: 1.2, phosphorus: 0.8 },
    });
    const b = getRecommendationBreakdown(product, profile);
    expect(b.nutrition).toBeGreaterThanOrEqual(8);
    expect(b.reasons.some(r => r.includes('AAFCO'))).toBe(true);
  });

  it('penalises nutrition when protein is below AAFCO minimum', () => {
    const product = makeProduct({
      guaranteedAnalysis: { crudeProtein: 14, crudeFat: 12, moisture: 10 },
    });
    const b = getRecommendationBreakdown(product, profile);
    // 14% as-fed → 14/0.9 ≈ 15.6% DMB < 18% dog minimum → penalty
    expect(b.nutrition).toBeLessThan(7);
    expect(b.reasons.some(r => r.includes('AAFCO'))).toBe(true);
  });
});
