import { describe, expect, it } from 'vitest';
import { analyzeFeed } from './feedAnalysis';
import { getNutritionPresentation, getNutritionReadiness, NUTRITION_INSUFFICIENT_NOTICE } from './nutritionReadiness';
import type { GuaranteedAnalysis } from './types';
import type { Product, UserPetProfile } from '../types';

const profile: UserPetProfile = { id: 'synthetic-pet', name: '합성 프로필', species: 'Dog', age: 4, allergies: [], healthConcerns: [] };
const ingredients: Product['ingredients'] = ['닭고기', '연어', '타우린', '유산균', '글루코사민'].map((nameKo) => ({
  id: nameKo, nameKo, nameEn: '', purpose: '', riskLevel: 'safe',
}));
const product = (patch: Partial<Product> = {}): Product => ({ id: 'synthetic-product', name: '합성 사료', brand: '합성',
  category: 'food', imageUrl: '', ingredients, reviewsCount: 0, averageRating: 0, ...patch });
const complete = { crudeProtein: 30, crudeFat: 15, crudeFiber: 3, crudeAsh: 8, moisture: 10 };

describe('nutrition evidence matches calculator inputs, not a field-count threshold', () => {
  it.each([
    [undefined, false, false], [{}, false, false], [{ crudeProtein: 30 }, false, false],
    [{ crudeProtein: 30, crudeFat: 15 }, false, false],
    [{ crudeProtein: 30, crudeFat: 15, moisture: 10 }, true, false],
    [complete, true, true],
    [{ crudeProtein: 0, crudeFat: 0, crudeFiber: 0, crudeAsh: 0, moisture: 0 }, true, true],
    [{ ...complete, crudeFat: null }, false, false], [{ ...complete, crudeFat: '' }, false, false],
    [{ ...complete, crudeFat: -1 }, false, false], [{ ...complete, moisture: 101 }, false, false],
    [{ crudeProtein: 0, crudeFat: 0, crudeFiber: 0, crudeAsh: 0, moisture: 100 }, false, true],
    [{ ...complete, crudeFiber: 50, crudeAsh: 50 }, true, false],
  ])('classifies %j', (ga, proteinFat, energy) => {
    const result = getNutritionReadiness(ga as GuaranteedAnalysis | undefined);
    expect(result.canEvaluateProteinFat).toBe(proteinFat);
    expect(result.canEstimateEnergy).toBe(energy);
    expect(getNutritionPresentation(ga as GuaranteedAnalysis | undefined).limited).toBe(!proteinFat || !energy);
  });

  it.each([undefined, { crudeProtein: 30 }, { crudeProtein: 30, crudeFat: 15, moisture: 10 }])('qualifies incomplete panels without changing the score for %j', ga => {
    const p = product({ guaranteedAnalysis: ga });
    const before = structuredClone(p);
    const result = analyzeFeed(p, profile);
    expect(result.score).toBe(ga?.moisture === 10 ? 98 : 82);
    expect(result.summary).toContain(NUTRITION_INSUFFICIENT_NOTICE);
    expect(result.summary).not.toMatch(/균형 잡힌|무난하게 급여/);
    expect(p).toEqual(before);
  });

  it('keeps normal nutrition results, zero measurements and real deficits distinct', () => {
    const normal = analyzeFeed(product({ guaranteedAnalysis: complete }), profile);
    expect(normal.score).toBe(98);
    expect(normal.aafco.passed).toBe(true);
    expect(normal.summary).not.toContain(NUTRITION_INSUFFICIENT_NOTICE);
    const zero = analyzeFeed(product({ guaranteedAnalysis: { crudeProtein: 0, crudeFat: 0, crudeFiber: 0, crudeAsh: 0, moisture: 0 } }), profile);
    expect(zero.hasNutritionData).toBe(true);
    expect(zero.aafco.evaluated).toBe(true);
    expect(zero.aafco.passed).toBe(false);
    expect(zero.cautions.join(' ')).toContain('기준 미달');
    expect(zero.summary).not.toContain(NUTRITION_INSUFFICIENT_NOTICE);
  });

  it('retains allergy and danger warnings ahead of the nutrition notice', () => {
    const allergy = analyzeFeed(product(), { ...profile, allergies: ['닭'] });
    expect(allergy.summary).toMatch(/피해야 할 성분.*영양정보 부족/);
    expect(allergy.cautions.join(' ')).toContain('회피 성분');
    const danger = analyzeFeed(product({ ingredients: [...ingredients, { id: 'synthetic-risk', nameKo: '합성 위험 원료', nameEn: '', purpose: '', riskLevel: 'danger' }] }), profile);
    expect(danger.summary).toMatch(/위험 등급 성분.*영양정보 부족/);
    expect(danger.cautions.join(' ')).toContain('위험 등급 성분');
  });

  it('does not treat measured calories as a complete nutrition panel', () => {
    expect(analyzeFeed(product({ caloriesPer100g: 350 }), profile).summary).toContain(NUTRITION_INSUFFICIENT_NOTICE);
  });
  it.each([
    ['g/100mL','as_fed','부피 기준'],
    ['g/100g','as_sold','분말 제품 그대로 기준'],
    ['g/100g','dry_matter','건물 기준'],
  ] as const)('explains existing %s/%s evidence without inventing a mass profile or hiding allergy warnings', (unit,basis,label) => {
    const evidence: NonNullable<Product['nutrientEvidence']> = ['protein','fat'].map(code=>({nutrientCode:code,name:code,value:5,unit,basis,qualifier:'unspecified',sourceUrl:'https://example.org/official',sourceVersion:'fixture',sourceLocator:'fixture'}));
    const p=product({nutrientEvidence:evidence});
    const presentation=getNutritionPresentation(p.guaranteedAnalysis,p.nutrientEvidence);
    expect(presentation.notice).toContain(label);
    expect(presentation.limited).toBe(true);
    const result=analyzeFeed(p,{...profile,allergies:['닭']});
    expect(result.summary).toContain('피해야 할 성분');
    expect(result.summary).toContain(label);
    expect(result.summary).not.toContain(NUTRITION_INSUFFICIENT_NOTICE);
    expect(result.macros).toBeNull();
    expect(result.macrosDMB).toBeNull();
    expect(result.feeding).toBeNull();
    expect(result.aafco.evaluated).toBe(false);
    expect(p.guaranteedAnalysis).toBeUndefined();
  });
});
