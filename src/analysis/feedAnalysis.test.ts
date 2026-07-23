import { describe, expect, it } from 'vitest';
import { analyzeFeed } from './feedAnalysis';
import type { Product, UserPetProfile, Ingredient } from '../types';

function ing(nameKo: string, riskLevel: Ingredient['riskLevel'] = 'safe', nameEn = ''): Ingredient {
  return { id: nameKo, nameKo, nameEn, purpose: '', riskLevel };
}

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    brand: '테스트',
    name: '테스트 사료',
    category: '건식사료',
    price: 30000,
    imageUrl: '',
    ingredients: [],
    reviewsCount: 0,
    averageRating: 0,
    ...overrides,
  };
}

const dogProfile: UserPetProfile = {
  id: 'u1', name: '초코', species: 'Dog', age: 4, healthConcerns: [], allergies: [],
};
const catProfile: UserPetProfile = {
  id: 'u2', name: '나비', species: 'Cat', age: 4, healthConcerns: [], allergies: [],
};

describe('analyzeFeed — 영양 계산', () => {
  it('보장성분이 없으면 hasNutritionData=false, 원료 기반만 평가한다', () => {
    const a = analyzeFeed(product({ ingredients: [ing('닭고기')] }), dogProfile);
    expect(a.hasNutritionData).toBe(false);
    expect(a.macros).toBeNull();
    expect(a.calories).toBeNull();
    expect(a.ingredientQuality.firstIsAnimalProtein).toBe(true);
  });

  it('as-fed 매크로에서 탄수화물(NFE)을 100-나머지로 추정한다', () => {
    const a = analyzeFeed(
      product({ guaranteedAnalysis: { crudeProtein: 30, crudeFat: 15, crudeFiber: 3, crudeAsh: 8, moisture: 10 } }),
      dogProfile,
    );
    expect(a.hasNutritionData).toBe(true);
    // 100 - 30 - 15 - 3 - 8 - 10 = 34
    expect(a.macros?.carb).toBeCloseTo(34, 1);
  });

  it('건물기준 조단백질은 as-fed보다 높다(수분 제거)', () => {
    const a = analyzeFeed(
      product({ guaranteedAnalysis: { crudeProtein: 27, crudeFat: 15, moisture: 10 } }),
      dogProfile,
    );
    // 27 / (100-10) * 100 = 30
    expect(a.macrosDMB?.protein).toBeCloseTo(30, 1);
  });

  it('실측 열량(caloriesPer100g)이 있으면 그 값을 우선한다', () => {
    const a = analyzeFeed(
      product({ guaranteedAnalysis: { crudeProtein: 30, crudeFat: 15, moisture: 10 }, caloriesPer100g: 410 }),
      dogProfile,
    );
    expect(a.calories?.measured).toBe(true);
    expect(a.calories?.per100g).toBe(410);
  });
});

describe('analyzeFeed — AAFCO 최소기준', () => {
  it('강아지 조단백 미달이면 AAFCO 불충족 + 감점', () => {
    const low = analyzeFeed(
      product({ guaranteedAnalysis: { crudeProtein: 12, crudeFat: 8, moisture: 10 } }),
      dogProfile,
    );
    expect(low.aafco.evaluated).toBe(true);
    expect(low.aafco.passed).toBe(false);
    expect(low.aafco.details.length).toBeGreaterThan(0);
  });

  it('고양이 기준이 강아지보다 높다(단백 26 vs 18)', () => {
    const ga = { crudeProtein: 22, crudeFat: 12, moisture: 10 };
    const dog = analyzeFeed(product({ guaranteedAnalysis: ga }), dogProfile);
    const cat = analyzeFeed(product({ guaranteedAnalysis: ga }), catProfile);
    expect(dog.aafco.passed).toBe(true); // 건물기준 24.4% ≥ 18
    expect(cat.aafco.passed).toBe(false); // 24.4% < 26
  });
});

describe('analyzeFeed — 원료 품질 판정', () => {
  it('부산물은 동물성 단백질(clean)로 세지 않는다', () => {
    const a = analyzeFeed(product({ ingredients: [ing('닭고기 부산물')] }), dogProfile);
    expect(a.ingredientQuality.firstIsAnimalProtein).toBe(false);
    expect(a.ingredientQuality.byProducts).toContain('닭고기 부산물');
  });

  it('충전제/합성첨가물/기능성 원료를 분류한다', () => {
    const a = analyzeFeed(
      product({ ingredients: [ing('닭고기'), ing('옥수수'), ing('BHA'), ing('유산균')] }),
      dogProfile,
    );
    expect(a.ingredientQuality.fillers).toContain('옥수수');
    expect(a.ingredientQuality.artificial).toContain('BHA');
    expect(a.ingredientQuality.functional).toContain('유산균');
  });

  it('프로필 알레르기와 매칭되는 성분을 회피 성분으로 표시한다', () => {
    const a = analyzeFeed(
      product({ ingredients: [ing('닭고기'), ing('연어')] }),
      { ...dogProfile, allergies: ['닭'] },
    );
    expect(a.ingredientQuality.allergyHits).toContain('닭고기');
    expect(a.cautions.join(' ')).toContain('회피 성분');
  });
});

describe('analyzeFeed — 점수/등급', () => {
  it('동물성 제1원료 + 무첨가 + AAFCO 충족이면 곡물+위험성분 제품보다 높은 점수', () => {
    const good = analyzeFeed(
      product({
        guaranteedAnalysis: { crudeProtein: 32, crudeFat: 16, crudeFiber: 3, crudeAsh: 8, moisture: 10 },
        ingredients: [ing('닭고기'), ing('연어'), ing('유산균')],
      }),
      dogProfile,
    );
    const bad = analyzeFeed(
      product({
        guaranteedAnalysis: { crudeProtein: 14, crudeFat: 8, crudeFiber: 4, crudeAsh: 8, moisture: 10 },
        ingredients: [ing('옥수수'), ing('밀'), ing('BHA'), ing('색소', 'danger')],
      }),
      dogProfile,
    );
    expect(good.score).toBeGreaterThan(bad.score);
    expect(good.score).toBeGreaterThanOrEqual(82); // A 이상
    expect(['D', 'F']).toContain(bad.grade);
  });

  it('점수는 항상 0~100 범위로 클램프된다', () => {
    const a = analyzeFeed(
      product({ ingredients: [ing('색소', 'danger'), ing('향료', 'danger'), ing('BHA'), ing('BHT'), ing('옥수수'), ing('밀'), ing('대두')] }),
      dogProfile,
    );
    expect(a.score).toBeGreaterThanOrEqual(0);
    expect(a.score).toBeLessThanOrEqual(100);
  });
});

describe('analyzeFeed — 급여량', () => {
  it('체중과 열량이 있으면 1일 급여량(g)을 계산한다', () => {
    const a = analyzeFeed(
      product({ guaranteedAnalysis: { crudeProtein: 30, crudeFat: 15, moisture: 10 }, caloriesPer100g: 380 }),
      { ...dogProfile, weightKg: 10 },
    );
    // RER=70*10^0.75≈393.6, DER=×1.6≈630, g=630/380*100≈166
    expect(a.feeding).not.toBeNull();
    expect(a.feeding?.gramsPerDay).toBeGreaterThan(140);
    expect(a.feeding?.gramsPerDay).toBeLessThan(190);
    expect(a.feeding?.measured).toBe(true);
  });

  it('체중이 없으면 급여량은 null', () => {
    const a = analyzeFeed(product({ caloriesPer100g: 380 }), dogProfile);
    expect(a.feeding).toBeNull();
  });
});

describe('analyzeFeed — 연어/어류 감지 및 데이터 부족 구분 (P0 신뢰성)', () => {
  it('원재료에 "연어"가 있으면 동물성 단백질로 감지한다(없음 오판 금지)', () => {
    const a = analyzeFeed(product({ ingredients: [ing('연어'), ing('현미')] }), dogProfile);
    expect(a.ingredientQuality.firstIsAnimalProtein).toBe(true);
    expect(a.ingredientQuality.animalProteins).toContain('연어');
  });

  it('salmon / salmon meal / 연어분 alias 를 동물성 단백질로 감지한다', () => {
    const en = analyzeFeed(product({ ingredients: [ing('Salmon', 'safe', 'salmon meal')] }), dogProfile);
    expect(en.ingredientQuality.animalProteins.length).toBeGreaterThan(0);
    const ko = analyzeFeed(product({ ingredients: [ing('연어분')] }), dogProfile);
    expect(ko.ingredientQuality.animalProteins).toContain('연어분');
  });

  it('연어오일/어유/fish oil/오메가 를 기능성(오메가) 원료로 감지한다', () => {
    for (const name of ['연어오일', '어유', '오메가3']) {
      const a = analyzeFeed(product({ ingredients: [ing('닭고기'), ing(name)] }), dogProfile);
      expect(a.ingredientQuality.functional).toContain(name);
    }
    const en = analyzeFeed(product({ ingredients: [ing('닭고기'), ing('생선유', 'safe', 'fish oil')] }), dogProfile);
    expect(en.ingredientQuality.functional.length).toBeGreaterThan(0);
  });

  it('원재료·보장성분이 모두 없으면 "없음"이 아니라 정보 부족으로 요약한다', () => {
    const a = analyzeFeed(product({ ingredients: [] }), dogProfile);
    expect(a.ingredientQuality.total).toBe(0);
    // 확정적 부정("주의가 필요한 성분이 있어…")이 아니라 정보 부족을 명시해야 한다.
    expect(a.summary).toContain('정보가 부족');
    expect(a.summary).not.toContain('주의가 필요한 성분이 있어');
    // 원료 미평가 사유가 주의 목록에 남아 있어야 한다.
    expect(a.cautions.join(' ')).toContain('원재료 정보가 없어');
  });

  it('보장성분만 있고 원재료가 없으면, 영양은 평가하되 원료 정보 부족을 표시한다', () => {
    const a = analyzeFeed(
      product({ guaranteedAnalysis: { crudeProtein: 30, crudeFat: 15, moisture: 10 }, ingredients: [] }),
      dogProfile,
    );
    expect(a.hasNutritionData).toBe(true);
    expect(a.ingredientQuality.total).toBe(0);
    expect(a.cautions.join(' ')).toContain('원재료 정보가 없어');
  });
});
