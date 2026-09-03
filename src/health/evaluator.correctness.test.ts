import { describe, expect, it } from 'vitest';
import type { GuaranteedAnalysis } from '../analysis/types';
import type { Product, UserPetProfile } from '../types';
import { resolveHealthConcernId } from './concerns';
import { evaluateHealthConcerns, healthRuleAppliesToSpecies } from './evaluator';

const baseProduct: Product = {
  id: 'correctness-product',
  brand: 'Test',
  name: 'Complete food',
  category: 'food',
  mainCategory: 'food',
  imageUrl: '',
  ingredients: [],
  healthConcerns: [],
  reviewsCount: 0,
  averageRating: 0,
  targetPetType: 'dog',
  targetLifeStage: ['adult'],
};

const baseProfile: UserPetProfile = {
  id: 'correctness-pet',
  name: 'Test pet',
  species: 'Dog',
  age: 4,
  healthConcerns: [],
  allergies: [],
};

function evaluate(
  concern: string,
  productOverrides: Partial<Product> = {},
  profileOverrides: Partial<UserPetProfile> = {},
) {
  return evaluateHealthConcerns(
    { ...baseProduct, ...productOverrides },
    { ...baseProfile, healthConcerns: [concern], ...profileOverrides },
  )[0];
}

function malformedAnalysis(field: keyof GuaranteedAnalysis, value: unknown): GuaranteedAnalysis {
  return { [field]: value, moisture: 10 } as GuaranteedAnalysis;
}

describe('health concern evaluator correctness characterization', () => {
  it('keeps null, blank, whitespace, and malformed nutrient values unavailable', () => {
    for (const value of [null, undefined, '', '   ', 'not-a-number']) {
      const result = evaluate('소화기', {
        guaranteedAnalysis: malformedAnalysis('crudeFiber', value),
      });
      expect(result.quantitativeChecks[0]).toMatchObject({ status: 'unknown', valueKind: 'unknown' });
      expect(result.status).toBe('unknown');
    }
  });

  it('does not confirm a dry-matter result when moisture is missing', () => {
    const result = evaluate('소화기', { guaranteedAnalysis: { crudeFiber: 4 } });
    expect(result.status).not.toBe('supported');
    expect(result.quantitativeChecks[0].valueKind).not.toBe('calculated');
  });

  it('distinguishes declared inputs from calculated and unavailable values', () => {
    const calculated = evaluate('소화기', {
      guaranteedAnalysis: { crudeFiber: 4, moisture: 10 },
    });
    expect(calculated.quantitativeChecks[0]).toMatchObject({
      status: 'pass',
      valueKind: 'calculated',
      inputEvidence: [
        { field: 'guaranteedAnalysis.crudeFiber', rawValue: 4, parsedValue: 4, qualifier: 'exact', valueKind: 'label_declared' },
        { field: 'guaranteedAnalysis.moisture', rawValue: 10, parsedValue: 10, qualifier: 'exact', valueKind: 'label_declared' },
      ],
    });

    const unavailable = evaluate('소화기', {
      guaranteedAnalysis: { crudeFiber: Number.POSITIVE_INFINITY, moisture: 10 },
    });
    expect(unavailable.quantitativeChecks[0]).toMatchObject({
      status: 'unknown',
      valueKind: 'unknown',
    });
  });

  it('preserves inequality-qualified declarations without treating them as exact', () => {
    for (const rawValue of ['<4', '>4', '≤4', '≥4']) {
      const result = evaluate('소화기', {
        guaranteedAnalysis: malformedAnalysis('crudeFiber', rawValue),
      });
      expect(result.quantitativeChecks[0].status).toBe('unknown');
      expect(result.quantitativeChecks[0].inputEvidence[0]).toMatchObject({
        rawValue,
        valueKind: 'label_declared',
      });
      expect(result.quantitativeChecks[0].inputEvidence[0].qualifier).not.toBe('exact');
    }
  });

  it('marks a cat-only taurine rule not applicable to a dog', () => {
    const result = evaluate('심장', {
      guaranteedAnalysis: { taurine: 1_000, kcalPer100g: 350 },
    });
    expect(result.quantitativeChecks[0]).toMatchObject({ status: 'not_applicable' });
    expect(result.status).not.toBe('supported');
  });

  it('applies species restrictions symmetrically for dog-only and cat-only rules', () => {
    expect(healthRuleAppliesToSpecies('dog', 'cat')).toBe(false);
    expect(healthRuleAppliesToSpecies('cat', 'dog')).toBe(false);
    expect(healthRuleAppliesToSpecies('dog', 'dog')).toBe(true);
    expect(healthRuleAppliesToSpecies('cat', 'cat')).toBe(true);
    expect(healthRuleAppliesToSpecies('all', 'dog')).toBe(true);
    expect(healthRuleAppliesToSpecies('all', 'cat')).toBe(true);
  });

  it('does not apply complete-food nutrient rules to treats or supplements', () => {
    for (const category of ['treat', 'supplement']) {
      const result = evaluate('소화기', {
        category,
        mainCategory: category,
        guaranteedAnalysis: { crudeFiber: 4, moisture: 10 },
      });
      expect(result.quantitativeChecks[0].status).toBe('not_applicable');
      expect(result.status).toBe('not_applicable');
    }
  });

  it('does not aggregate one passing and one unknown required rule as supported', () => {
    const result = evaluate('비만·다이어트', {
      guaranteedAnalysis: { crudeFat: 10, moisture: 10 },
    });
    expect(result.quantitativeChecks.map((check) => check.status)).toEqual(['pass', 'unknown']);
    expect(result.status).toBe('possible');
    expect(result.confidence).toBe('partial');
    expect(result.scoringContribution).toBeLessThan(20);
  });

  it('does not apply adult-only rules to growth or senior profiles', () => {
    for (const age of [0.5, 9]) {
      const result = evaluate(
        '소화기',
        { guaranteedAnalysis: { crudeFiber: 4, moisture: 10 } },
        { age },
      );
      expect(result.quantitativeChecks[0].status).toBe('not_applicable');
      expect(result.status).toBe('not_applicable');
    }
  });

  it('does not apply a nutrient rule across a pet/product species mismatch', () => {
    const result = evaluate(
      '심장',
      {
        targetPetType: 'dog',
        guaranteedAnalysis: { taurine: 1_000, kcalPer100g: 350 },
      },
      { species: 'Cat' },
    );
    expect(result.quantitativeChecks[0].status).toBe('not_applicable');
    expect(result.status).toBe('not_applicable');
  });

  it('keeps certainty monotonic when required data becomes missing', () => {
    const complete = evaluate('비만·다이어트', {
      guaranteedAnalysis: { crudeFat: 10, crudeProtein: 30, moisture: 10 },
    });
    const partial = evaluate('비만·다이어트', {
      guaranteedAnalysis: { crudeFat: 10, moisture: 10 },
    });
    expect(complete).toMatchObject({ status: 'supported', confidence: 'sufficient', scoringContribution: 20 });
    expect(partial).toMatchObject({ status: 'possible', confidence: 'partial', scoringContribution: 0 });
  });

  it('is deterministic and keeps concern contribution bounded', () => {
    const input = {
      guaranteedAnalysis: { crudeFat: 10, crudeProtein: 30, moisture: 10 },
    } satisfies Partial<Product>;
    const first = evaluate('비만·다이어트', input);
    expect(evaluate('비만·다이어트', input)).toEqual(first);
    expect(first.scoringContribution).toBeGreaterThanOrEqual(0);
    expect(first.scoringContribution).toBeLessThanOrEqual(20);
  });

  it('keeps a confirmed failure distinguishable from missing required evidence', () => {
    const result = evaluate('비만·다이어트', {
      guaranteedAnalysis: { crudeFat: 20, moisture: 10 },
    });
    expect(result.status).toBe('not_supported');
    expect(result.quantitativeChecks.map((check) => check.status)).toEqual(['fail', 'unknown']);
    expect(result.missingRequiredFields).toContain('조단백질');
    expect(result.scoringContribution).toBe(0);
  });

  it('does not reward an unknown concern label', () => {
    const results = evaluateHealthConcerns(baseProduct, {
      ...baseProfile,
      healthConcerns: ['unknown concern'],
    });
    expect(results).toEqual([]);
    expect(results.reduce((sum, result) => sum + result.scoringContribution, 0)).toBe(0);
  });

  it.fails('preserves the exact original profile label in the result', () => {
    expect(evaluate('장 건강').originalProfileLabel).toBe('장 건강');
  });

  it.fails('keeps evidence ingredient keywords out of concern-name aliases', () => {
    expect(resolveHealthConcernId('glucosamine')).toBeNull();
    expect(resolveHealthConcernId('chondroitin')).toBeNull();
  });

  it.fails('does not create a tag match from an unrelated substring', () => {
    const result = evaluate('심장', { healthConcerns: ['심장사상충 예방'] });
    expect(result.matchedProductTags).toEqual([]);
    expect(result.status).toBe('unknown');
  });

  it.fails('uses form-specific taurine evidence instead of one dry/wet assumption', () => {
    const dry = evaluate(
      '심장',
      {
        targetPetType: 'cat',
        formulation: 'dry',
        guaranteedAnalysis: { taurine: 1_500, kcalPer100g: 350 },
      },
      { species: 'Cat' },
    );
    const wet = evaluate(
      '심장',
      {
        targetPetType: 'cat',
        formulation: 'wet',
        guaranteedAnalysis: { taurine: 1_500, kcalPer100g: 350 },
      },
      { species: 'Cat' },
    );

    expect(dry.sourceReferences[0].thresholdOrRange).not.toBe(
      wet.sourceReferences[0].thresholdOrRange,
    );
  });
});
