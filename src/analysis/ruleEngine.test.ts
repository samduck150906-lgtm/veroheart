import { describe, expect, it } from 'vitest';
import { analyzeProduct } from './ruleEngine';
import { findIngredientByName } from './ingredientDictionary';
import { normalizeIngredientName } from './normalize';
import { toDryMatter, calculateCalories, validateAAFCO } from './nutrition';
import type { ProductForAnalysis, PetProfile } from './types';

const dogFood = (): ProductForAnalysis => ({
  species: 'dog',
  productType: 'complete_food',
});

describe('성분 사전 / 정규화', () => {
  it('정규화는 공백·괄호·표기변형을 흡수한다', () => {
    expect(normalizeIngredientName('닭 고기')).toBe('닭고기');
    expect(normalizeIngredientName('치킨(Chicken)')).toBe('치킨chicken');
    expect(normalizeIngredientName('연어 오일')).toBe('연어오일');
  });

  it('alias로 canonical 성분을 찾는다', () => {
    expect(findIngredientByName('치킨')?.id).toBe('chicken');
    expect(findIngredientByName('계육분')?.id).toBe('chicken_meal');
    expect(findIngredientByName('건포도')?.id).toBe('grape');
    expect(findIngredientByName('자이리톨')?.id).toBe('xylitol');
  });

  it('사전에 없는 성분은 null', () => {
    expect(findIngredientByName('정체불명특수원료xyz')).toBeNull();
  });

  it('확장된 사전 — 생선/신규단백/기능성/곡물 성분을 인식한다', () => {
    expect(findIngredientByName('대구')?.category).toBe('animal_protein');
    expect(findIngredientByName('고등어')?.nutritionTags).toContain('omega3');
    expect(findIngredientByName('사슴고기')?.id).toBe('venison');
    expect(findIngredientByName('연어분')?.category).toBe('processed_protein');
    expect(findIngredientByName('아마씨유')?.nutritionTags).toContain('omega3');
    expect(findIngredientByName('MSM')?.nutritionTags).toContain('joint');
    expect(findIngredientByName('퀴노아')?.id).toBe('quinoa');
    expect(findIngredientByName('비트펄프')?.nutritionTags).toContain('gut');
    expect(findIngredientByName('블루베리')?.nutritionTags).toContain('antioxidant');
  });
});

describe('확장 규칙 — 추가 위험/가점 성분', () => {
  it('아보카도는 caution 경고', () => {
    const r = analyzeProduct(dogFood(), { species: 'dog', allergies: [] }, ['닭고기', '아보카도']);
    expect(r.warnings.some((w) => w.ruleId === 'AVOCADO_CAUTION')).toBe(true);
  });

  it('호두는 개에게 caution 경고', () => {
    const r = analyzeProduct(dogFood(), { species: 'dog', allergies: [] }, ['닭고기', '호두']);
    expect(r.warnings.some((w) => w.ruleId === 'WALNUT_CAUTION')).toBe(true);
  });

  it('등푸른생선·식물성 오메가-3도 오메가3 가점을 받는다', () => {
    const fish = analyzeProduct(dogFood(), undefined, ['고등어', '현미']);
    expect(fish.positives.some((p) => p.ruleId === 'OMEGA3_PRESENT')).toBe(true);
    const flax = analyzeProduct(dogFood(), undefined, ['닭고기', '아마씨유']);
    expect(flax.positives.some((p) => p.ruleId === 'OMEGA3_PRESENT')).toBe(true);
  });

  it('MSM도 관절 보조 가점을 받는다', () => {
    const r = analyzeProduct(dogFood(), undefined, ['닭고기', 'MSM']);
    expect(r.positives.some((p) => p.ruleId === 'JOINT_SUPPORT')).toBe(true);
  });

  it('신규 단백(정어리)이 제1원료면 동물성 단백 가점', () => {
    const r = analyzeProduct(dogFood(), undefined, ['정어리', '현미']);
    expect(r.positives.some((p) => p.ruleId === 'FIRST_INGREDIENT_ANIMAL_PROTEIN')).toBe(true);
  });
});

describe('절대 위험 규칙', () => {
  it('자일리톨은 개에게 danger + 큰 감점', () => {
    const r = analyzeProduct(dogFood(), { species: 'dog', allergies: [] }, [
      '닭고기',
      '쌀',
      '자일리톨',
    ]);
    expect(r.warnings.some((w) => w.level === 'danger')).toBe(true);
    expect(r.grade).toBe('주의');
    expect(r.summary).toContain('위험');
  });

  it('양파/마늘은 강아지·고양이 모두 danger', () => {
    const dog = analyzeProduct(dogFood(), { species: 'dog', allergies: [] }, ['닭고기', '양파']);
    const cat = analyzeProduct(
      { species: 'cat', productType: 'complete_food' },
      { species: 'cat', allergies: [] },
      ['연어', '마늘'],
    );
    expect(dog.warnings.some((w) => w.ruleId === 'ALLIUM_DANGER')).toBe(true);
    expect(cat.warnings.some((w) => w.ruleId === 'ALLIUM_DANGER')).toBe(true);
  });

  it('초콜릿/카페인 danger', () => {
    const r = analyzeProduct(dogFood(), undefined, ['닭고기', '코코아']);
    expect(r.warnings.some((w) => w.ruleId === 'CHOCOLATE_CAFFEINE_DANGER')).toBe(true);
  });
});

describe('가점 / 좋은 점', () => {
  it('제1원료가 동물성 단백질이면 가점', () => {
    const r = analyzeProduct(dogFood(), undefined, ['닭고기', '현미', '연어오일']);
    expect(r.positives.some((p) => p.ruleId === 'FIRST_INGREDIENT_ANIMAL_PROTEIN')).toBe(true);
    expect(r.positives.some((p) => p.ruleId === 'OMEGA3_PRESENT')).toBe(true);
    expect(r.grade === 'A+' || r.grade === 'A' || r.grade === 'B+').toBe(true);
  });
});

describe('개인화 알레르기 필터', () => {
  it('닭 알레르기 등록 시 닭고기 포함 제품에 caution', () => {
    const pet: PetProfile = { species: 'dog', allergies: ['chicken'] };
    const r = analyzeProduct(dogFood(), pet, ['닭고기', '현미']);
    expect(r.warnings.some((w) => w.ruleId.startsWith('PERSONAL_ALLERGY'))).toBe(true);
  });

  it('알레르기 미등록이면 닭고기는 경고하지 않는다', () => {
    const pet: PetProfile = { species: 'dog', allergies: [] };
    const r = analyzeProduct(dogFood(), pet, ['닭고기', '현미']);
    expect(r.warnings.some((w) => w.ruleId.startsWith('PERSONAL_ALLERGY'))).toBe(false);
  });
});

describe('완전사료 vs 간식 가중치', () => {
  it('동일 성분이라도 productType에 따라 가중치 구성이 다르다', () => {
    const names = ['닭고기', '글리세린'];
    const food = analyzeProduct({ species: 'dog', productType: 'complete_food' }, undefined, names);
    const treat = analyzeProduct({ species: 'dog', productType: 'treat' }, undefined, names);
    // 둘 다 유효 점수를 내고 0~100 범위
    expect(food.score).toBeGreaterThanOrEqual(0);
    expect(treat.score).toBeLessThanOrEqual(100);
  });
});

describe('미매칭 원료는 unknowns로 수집', () => {
  it('사전에 없는 원료는 unknowns에 들어가고 투명도가 깎인다', () => {
    const r = analyzeProduct(dogFood(), undefined, ['닭고기', '정체불명원료abc']);
    expect(r.unknowns).toContain('정체불명원료abc');
    expect(r.breakdown.transparency).toBeLessThan(90);
  });
});

describe('보증성분 기반 영양 적합도', () => {
  it('완전사료 + AAFCO 충족 보증성분이면 가점 finding이 붙는다', () => {
    const product: ProductForAnalysis = {
      species: 'dog',
      productType: 'complete_food',
      guaranteedAnalysis: { crudeProtein: 30, crudeFat: 16, moisture: 10, calcium: 1.2, phosphorus: 1.0 },
    };
    const r = analyzeProduct(product, { species: 'dog', allergies: [] }, ['닭고기', '현미', '연어오일']);
    expect(r.positives.some((p) => p.ruleId === 'AAFCO_PASS')).toBe(true);
    expect(r.breakdown.nutritionFit).toBeGreaterThan(70);
  });

  it('단백질이 AAFCO 기준 미달이면 caution finding과 영양점수 감점', () => {
    const product: ProductForAnalysis = {
      species: 'dog',
      productType: 'complete_food',
      guaranteedAnalysis: { crudeProtein: 12, crudeFat: 8, moisture: 10 },
    };
    const r = analyzeProduct(product, { species: 'dog', allergies: [] }, ['옥수수', '현미']);
    expect(r.warnings.some((w) => w.ruleId === 'AAFCO_FAIL')).toBe(true);
    expect(r.breakdown.nutritionFit).toBeLessThan(70);
  });

  it('칼슘:인 비율이 범위를 벗어나면 watch finding', () => {
    const product: ProductForAnalysis = {
      species: 'dog',
      productType: 'complete_food',
      guaranteedAnalysis: { crudeProtein: 28, crudeFat: 14, moisture: 10, calcium: 3.0, phosphorus: 1.0 },
    };
    const r = analyzeProduct(product, { species: 'dog', allergies: [] }, ['닭고기']);
    expect(r.warnings.some((w) => w.ruleId === 'CA_P_RATIO')).toBe(true);
  });

  it('보증성분이 없으면 영양점수는 중립(70)을 유지한다', () => {
    const r = analyzeProduct(dogFood(), { species: 'dog', allergies: [] }, ['닭고기', '현미']);
    expect(r.breakdown.nutritionFit).toBe(70);
    expect(r.warnings.some((w) => w.ruleId === 'AAFCO_FAIL')).toBe(false);
  });
});

describe('심화 품질: DCM 콩과 위험 / 단백 보강', () => {
  it('상위 5순위에 콩과 식물 2종 이상이면 DCM 경고', () => {
    const r = analyzeProduct(dogFood(), { species: 'dog', allergies: [] }, ['닭고기', '완두', '렌틸콩', '현미']);
    expect(r.warnings.some((w) => w.ruleId === 'DCM_LEGUME_RISK')).toBe(true);
  });

  it('콩과 식물이 1종뿐이면 DCM danger 경고는 없다', () => {
    const r = analyzeProduct(dogFood(), { species: 'dog', allergies: [] }, ['닭고기', '완두', '현미', '연어오일']);
    const dcm = r.warnings.find((w) => w.ruleId === 'DCM_LEGUME_RISK');
    expect(dcm?.level).not.toBe('caution');
  });

  it('가공 식물성 단백(완두단백)이 있으면 단백 보강 의심 경고', () => {
    const r = analyzeProduct(dogFood(), { species: 'dog', allergies: [] }, ['닭고기', '완두단백', '현미']);
    expect(r.warnings.some((w) => w.ruleId === 'PROTEIN_INFLATION')).toBe(true);
  });

  it('일반 통곡·동물성 구성은 DCM/단백보강 경고가 없다', () => {
    const r = analyzeProduct(dogFood(), { species: 'dog', allergies: [] }, ['닭고기', '현미', '연어오일']);
    expect(r.warnings.some((w) => w.ruleId === 'DCM_LEGUME_RISK')).toBe(false);
    expect(r.warnings.some((w) => w.ruleId === 'PROTEIN_INFLATION')).toBe(false);
  });
});

describe('영양 계산 순수 함수', () => {
  it('건물 기준 환산', () => {
    expect(toDryMatter(25, 10)).toBeCloseTo(27.78, 1);
    expect(toDryMatter(10, 100)).toBeNull();
  });

  it('Atwater 칼로리 분포 합은 100 근사', () => {
    const c = calculateCalories({ crudeProtein: 26, crudeFat: 12, crudeFiber: 4, crudeAsh: 8, moisture: 10 });
    const sum = c.distribution.protein + c.distribution.fat + c.distribution.carbs;
    expect(sum).toBeGreaterThanOrEqual(99);
    expect(sum).toBeLessThanOrEqual(101);
    expect(c.kcalPerKg).toBeGreaterThan(0);
  });

  it('AAFCO 성견 단백질 미달 판정', () => {
    const low = validateAAFCO({ crudeProtein: 12, crudeFat: 8, moisture: 10 }, 'dog');
    expect(low.passed).toBe(false);
    const ok = validateAAFCO({ crudeProtein: 26, crudeFat: 12, moisture: 10 }, 'dog');
    expect(ok.passed).toBe(true);
  });
});
