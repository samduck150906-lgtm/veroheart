import { describe, expect, it } from 'vitest';
import type { Product, UserPetProfile } from '../types';
import { evaluateHealthConcerns } from './evaluator';
import type { HealthConcernId } from './concerns';

const baseProfile: UserPetProfile = {
  id: 'pet-1',
  name: '로니',
  species: 'Dog',
  age: 4,
  healthConcerns: [],
  allergies: [],
};

const product = (overrides: Partial<Product> = {}): Product => ({
  id: 'product-1',
  brand: '브랜드',
  name: '테스트 사료',
  category: '사료',
  imageUrl: '',
  ingredients: [],
  healthConcerns: [],
  reviewsCount: 0,
  averageRating: 0,
  targetPetType: 'dog',
  ...overrides,
});

const profile = (healthConcerns: string[]): UserPetProfile => ({ ...baseProfile, healthConcerns });

function resultFor(healthConcerns: string[], overrides: Partial<Product> = {}) {
  return evaluateHealthConcerns(product(overrides), profile(healthConcerns));
}

describe('evaluateHealthConcerns', () => {
  it.each([
    ['피부·모질', 'skin_coat'],
    ['관절', 'joint'],
    ['소화기', 'digestive'],
    ['비만·다이어트', 'weight'],
    ['신장·비뇨기', 'renal_urinary'],
    ['심장', 'heart'],
    ['면역', 'immune'],
    ['눈', 'eye'],
    ['구강', 'oral'],
  ] as const)('evaluates canonical profile concern %s as %s', (label, expectedId) => {
    const [result] = resultFor([label]);
    expect(result.concernId).toBe(expectedId);
    expect(result.status).toBe('unknown');
    expect(result.confidence).toBe('insufficient');
    expect(result.scoringContribution).toBe(0);
  });

  it.each([
    ['피부', 'skin_coat'],
    ['장 건강', 'digestive'],
    ['체중 관리', 'weight'],
    ['요로', 'renal_urinary'],
    ['cardiac', 'heart'],
    ['immunity', 'immune'],
    ['치아', 'oral'],
  ] as const)('evaluates alias %s through canonical id %s', (alias, expectedId) => {
    const [result] = resultFor([alias]);
    expect(result.concernId).toBe(expectedId);
  });

  it('dedupes multiple simultaneous concerns before dividing the 20 point component', () => {
    const results = resultFor(['관절', 'joint', '피부'], {
      healthConcerns: ['관절', '피부'],
      ingredients: [
        { id: 'i1', nameKo: '글루코사민', nameEn: 'glucosamine', purpose: '', riskLevel: 'safe' },
        { id: 'i2', nameKo: '연어오일', nameEn: 'salmon oil', purpose: '', riskLevel: 'safe' },
      ],
    });
    expect(results.map((r) => r.concernId)).toEqual(['joint', 'skin_coat']);
    expect(results.map((r) => r.scoringContribution)).toEqual([5, 5]);
  });

  it('returns no result for unknown concern input', () => {
    expect(resultFor(['알 수 없는 고민'])).toEqual([]);
  });

  it('treats product tag only as tag_only evidence worth 25 percent of the concern share', () => {
    const [result] = resultFor(['피부·모질'], { healthConcerns: ['피부'] });
    expect(result.status).toBe('tag_only');
    expect(result.evidenceLevel).toBe('tag_only');
    expect(result.scoringContribution).toBe(5);
  });

  it('treats ingredient only with unknown quantity as weak possible evidence, not a numeric pass', () => {
    const [result] = resultFor(['관절'], {
      ingredients: [{ id: 'i1', nameKo: '글루코사민', nameEn: 'glucosamine', purpose: '', riskLevel: 'safe' }],
    });
    expect(result.status).toBe('possible');
    expect(result.evidenceLevel).toBe('ingredient_only_quantity_unknown');
    expect(result.quantitativeChecks).toEqual([]);
    expect(result.userFacingFacts).toContain('관련 성분이 표시되어 있지만 함량은 확인되지 않아요.');
    expect(result.scoringContribution).toBe(5);
  });

  it('treats ingredient plus tag with unknown quantity as possible evidence worth half the concern share', () => {
    const [result] = resultFor(['관절'], {
      healthConcerns: ['관절'],
      ingredients: [{ id: 'i1', nameKo: '콘드로이틴', nameEn: 'chondroitin', purpose: '', riskLevel: 'safe' }],
    });
    expect(result.status).toBe('possible');
    expect(result.evidenceLevel).toBe('tag_and_ingredient_quantity_unknown');
    expect(result.scoringContribution).toBe(10);
  });

  it('keeps the internal digestive fiber range informational only', () => {
    const [result] = resultFor(['소화'], {
      guaranteedAnalysis: { crudeFiber: 4, moisture: 10 },
    });
    expect(result.status).toBe('unknown');
    expect(result.evidenceLevel).toBe('missing');
    expect(result.quantitativeChecks[0]).toMatchObject({
      nutrient: '조섬유',
      status: 'pass',
      valueKind: 'calculated',
      judgment: 'informational',
    });
    expect(result.scoringContribution).toBe(0);
  });

  it('does not turn an internal digestive heuristic into not_supported or a penalty', () => {
    const [result] = resultFor(['소화'], {
      guaranteedAnalysis: { crudeFiber: 10, moisture: 10 },
    });
    expect(result.status).toBe('unknown');
    expect(result.quantitativeChecks[0]).toMatchObject({ status: 'fail', judgment: 'informational' });
    expect(result.cautionReasons).toHaveLength(0);
    expect(result.scoringContribution).toBe(0);
  });

  it('does not award supported renal/urinary status from cranberry or urinary tags alone', () => {
    const [result] = resultFor(['신장·비뇨기'], {
      healthConcerns: ['요로'],
      ingredients: [{ id: 'i1', nameKo: '크랜베리', nameEn: 'cranberry', purpose: '', riskLevel: 'safe' }],
    });
    expect(result.status).toBe('possible');
    expect(result.evidenceLevel).toBe('tag_and_ingredient_quantity_unknown');
    expect(result.missingRequiredFields).not.toContain('인');
    expect(result.scoringContribution).toBe(10);
  });

  it('keeps the unverified renal phosphorus cutoff informational only', () => {
    const [result] = resultFor(['신장'], {
      guaranteedAnalysis: { phosphorus: 0.14, kcalPer100g: 350 },
    });
    expect(result.status).toBe('unknown');
    expect(result.quantitativeChecks[0].actualValue).toBe(400);
    expect(result.quantitativeChecks[0].judgment).toBe('informational');
    expect(result.scoringContribution).toBe(0);
    expect(result.sourceReferences[0].scope).toBe('diagnosed_disease');
  });

  it('does not award supported heart status from taurine ingredient presence without an amount', () => {
    const [result] = resultFor(['심장'], {
      healthConcerns: ['심장'],
      ingredients: [{ id: 'i1', nameKo: '타우린', nameEn: 'taurine', purpose: '', riskLevel: 'safe' }],
    });
    expect(result.status).toBe('possible');
    expect(result.quantitativeChecks[0].status).toBe('not_applicable');
    expect(result.missingRequiredFields).not.toContain('타우린');
  });

  it('supports immune consistently without inventing a fake disease category', () => {
    const [result] = resultFor(['면역'], {
      healthConcerns: ['면역'],
      ingredients: [{ id: 'i1', nameKo: '셀레늄', nameEn: 'selenium', purpose: '', riskLevel: 'safe' }],
    });
    expect(result.concernId).toBe<HealthConcernId>('immune');
    expect(result.status).toBe('possible');
    expect(result.userFacingFacts[0]).toBe('관련 성분이 표시되어 있지만 함량은 확인되지 않아요.');
  });

  it('keeps all data missing as unknown and insufficient', () => {
    const [result] = resultFor(['눈']);
    expect(result.status).toBe('unknown');
    expect(result.evidenceLevel).toBe('missing');
    expect(result.confidence).toBe('insufficient');
    expect(result.userFacingFacts).toContain('현재 공개된 정보만으로 적합 여부를 판단할 수 없어요.');
  });
});
