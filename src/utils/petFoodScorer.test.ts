import { describe, expect, it } from 'vitest';
import { PetFoodScorer } from './petFoodScorer';
import type { GuaranteedAnalysis, PetProfile } from './petFoodScorer';

describe('PetFoodScorer - 전성분 채점 및 수의학 검증 테스트', () => {
  
  // 기본 보증 분석 값
  const standardGA: GuaranteedAnalysis = {
    crudeProtein: 22,
    crudeFat: 10,
    crudeFiber: 4,
    crudeAsh: 8,
    moisture: 10, // DMB 환산: 단백질 = 22 / 90 * 100 = 24.4%
    calcium: 1.2,
    phosphorus: 0.9
  };

  it('기본 우수 제품 채점 및 보너스 적용 검증 (제1생육 + 오메가-3)', () => {
    const ingredients = ['닭고기', '현미', '연어 오일', '글루코사민', '혼합 토코페롤'];
    const scorer = new PetFoodScorer(ingredients, standardGA);
    const result = scorer.execute();

    expect(result.score).toBeGreaterThanOrEqual(100); // 100 + 보너스 상한선 100
    expect(result.grade).toBe('A+');
    expect(result.aafco_passed).toBe(true);
    expect(result.bonuses.length).toBeGreaterThanOrEqual(2);
    expect(result.bonuses.some(b => b.reason.includes('제1원료'))).toBe(true);
  });

  it('유해 보존제 감점 검증 (BHA, BHT 검출 시 -10점씩)', () => {
    const ingredients = ['닭고기', '현미', 'BHA', 'BHT'];
    const scorer = new PetFoodScorer(ingredients, standardGA);
    const result = scorer.execute();

    // 기본 점수 100 + 보너스(제1생육 5점) - 유해성분(BHA 10점, BHT 10점) = 85
    expect(result.score).toBe(85);
    expect(result.grade).toBe('B');
    expect(result.penalties.some(p => p.reason.includes('BHA'))).toBe(true);
    expect(result.penalties.some(p => p.reason.includes('BHT'))).toBe(true);
  });

  it('출처 불분명 고기 및 부산물 감점 검증 (가금류 부산물, 동물성 지방)', () => {
    const ingredients = ['가금류 부산물', '동물성 지방', '쌀'];
    const scorer = new PetFoodScorer(ingredients, standardGA);
    const result = scorer.execute();

    // 가금류 부산물(-10점), 동물성 지방(-10점) = 총 -20점
    expect(result.score).toBe(80);
    expect(result.penalties.some(p => p.reason.includes('출처 불분명'))).toBe(true);
  });

  it('곡물 분할(Ingredient Splitting) 감점 검증 (상위 5개 내 동일 계열 쪼개기)', () => {
    const ingredients = ['쌀', '현미', '싸라기', '닭고기', '보리'];
    const scorer = new PetFoodScorer(ingredients, standardGA);
    const result = scorer.execute();

    // 쌀, 현미, 싸라기 상위 5개 중 3개 쌀계열 검출로 곡물분할 감점(-5) 적용
    expect(result.penalties.some(p => p.reason.includes('곡물 분할'))).toBe(true);
  });

  it('Atwater 칼로리 계산 및 DMB 계산기 무결성 검증', () => {
    const scorer = new PetFoodScorer(['닭고기'], standardGA);
    const calResult = scorer.calculateCalories();
    
    // NFE = 100 - 22(단백) - 10(지방) - 4(섬유) - 8(회분) - 10(수분) = 46
    // kcal/100g = 22 * 3.5 + 10 * 8.5 + 46 * 3.5 = 77 + 85 + 161 = 323 kcal/100g
    // kcal/kg = 3230
    expect(calResult.kcalKg).toBe(3230);
    expect(calResult.distribution.protein).toBe(Math.round((77 / 323) * 100)); // 24%
    expect(calResult.distribution.fat).toBe(Math.round((85 / 323) * 100));     // 26%
    expect(calResult.distribution.carbs).toBe(Math.round((161 / 323) * 100));   // 50%
  });

  it('AAFCO 기준 미달 검증 (조단백 부족 케이스)', () => {
    const lowProteinGA: GuaranteedAnalysis = {
      crudeProtein: 12, // DMB = 12 / 0.9 = 13.3% (< 18%)
      crudeFat: 8,
      crudeFiber: 4,
      crudeAsh: 8,
      moisture: 10
    };
    const scorer = new PetFoodScorer(['닭고기'], lowProteinGA);
    const result = scorer.execute();

    expect(result.aafco_passed).toBe(false);
    expect(result.fediaf_warnings.some(w => w.includes('조단백질 기준 미달'))).toBe(true);
  });

  it('FEDIAF Ca:P 비율 부적절 경고 검증', () => {
    const badRatioGA: GuaranteedAnalysis = {
      crudeProtein: 25,
      crudeFat: 12,
      crudeFiber: 3,
      crudeAsh: 7,
      moisture: 10,
      calcium: 2.2,
      phosphorus: 0.8 // Ca:P = 2.75:1 (> 2:1 상한선)
    };
    const scorer = new PetFoodScorer(['닭고기'], badRatioGA);
    const result = scorer.execute();

    expect(result.fediaf_warnings.some(w => w.includes('Ca:P'))).toBe(true);
  });

  it('개인화 알레르기 성분 차단 검증', () => {
    const profile: PetProfile = {
      species: 'dog',
      allergies: ['닭', '밀']
    };
    const ingredients = ['닭가슴살', '현미', '밀가루'];
    const scorer = new PetFoodScorer(ingredients, standardGA, profile);
    const result = scorer.execute();

    expect(result.allergy_warning).toBe(true);
    expect(result.allergy_ingredients).toContain('닭가슴살');
    expect(result.allergy_ingredients).toContain('밀가루');
  });
});
