import { describe, expect, it } from 'vitest';
import type { Ingredient, Product, UserPetProfile } from '../types';
import { classifyAllergyRelationship } from '../analysis/allergyFamilyMatcher';
import { generateAnalysisReport } from '../utils/analysis';
import { buildProductConclusion } from '../utils/productConclusion';
import { getRecommendationBreakdown, resolveDisplayVerdict } from '../utils/score';

function ingredient(nameKo: string): Ingredient {
  return {
    id: nameKo,
    nameKo,
    nameEn: '',
    purpose: '원료',
    riskLevel: 'safe',
  };
}

function product(names: string[]): Product {
  return {
    id: `policy-${names.join('-')}`,
    brand: 'Policy Fixture',
    name: 'Policy Fixture Food',
    category: '사료',
    targetPetType: 'dog',
    imageUrl: '',
    ingredients: names.map(ingredient),
    reviewsCount: 0,
    averageRating: 0,
  };
}

function profile(allergy: string): UserPetProfile {
  return {
    id: `pet-${allergy}`,
    name: '보리',
    species: 'Dog',
    age: 4,
    healthConcerns: [],
    allergies: [allergy],
  };
}

describe('Poultry Allergy Policy v1.0', () => {
  it('keeps the explicitly named poultry protein as a hard allergy', () => {
    const p = product(['계육분']);
    const pet = profile('닭');
    const breakdown = getRecommendationBreakdown(p, pet);

    expect(classifyAllergyRelationship(p.ingredients[0], '닭').kind).toBe('hard');
    expect(breakdown.allergyHits).toEqual(['닭']);
    expect(breakdown.allergyPenalty).toBe(90);
    expect(breakdown.allergyCautionPenalty).toBe(0);
  });

  it('turns other named poultry into visible cross caution with an 8 point penalty and no hard cap', () => {
    const p = product(['오리고기']);
    const pet = profile('닭');
    const breakdown = getRecommendationBreakdown(p, pet);
    const display = resolveDisplayVerdict(breakdown.total, {
      speciesMismatch: breakdown.speciesMismatch,
      allergyHits: breakdown.allergyHits.length,
      dangerCount: breakdown.dangerCount,
    });
    const report = generateAnalysisReport(p, pet);
    const conclusion = buildProductConclusion(p, pet, report, { personalized: true });

    expect(classifyAllergyRelationship(p.ingredients[0], '닭').kind).toBe('cross_caution');
    expect(breakdown.allergyHits).toEqual([]);
    expect(breakdown.allergyPenalty).toBe(0);
    expect(breakdown.allergyCautionPenalty).toBe(8);
    expect(display.score).toBe(breakdown.total);
    expect(display.score).toBeGreaterThan(9);
    expect(report.summary).toContain('교차반응');
    expect(report.highlights.some((item) => item.type === 'caution' && item.text.includes('교차반응'))).toBe(true);
    expect(conclusion.tone).toBe('caution');
    expect(conclusion.headline).toContain('관련 가금류');
    expect(conclusion.subline).toContain('교차반응');
  });

  it('uses 12 points at most for two different related poultry species', () => {
    const breakdown = getRecommendationBreakdown(
      product(['오리고기', '칠면조고기']),
      profile('닭'),
    );

    expect(breakdown.allergyHits).toEqual([]);
    expect(breakdown.allergyCautionPenalty).toBe(12);
  });

  it('keeps explicit broad poultry allergy as a hard avoidance signal', () => {
    for (const name of ['닭고기', '오리고기', '칠면조고기']) {
      const p = product([name]);
      const breakdown = getRecommendationBreakdown(p, profile('가금류'));
      expect(breakdown.allergyHits, name).toEqual(['가금류']);
      expect(breakdown.allergyPenalty, name).toBe(90);
    }
  });

  it('uses strong caution for generic poultry source instead of pretending it is confirmed chicken', () => {
    const p = product(['가금류부산물']);
    const pet = profile('닭');
    const breakdown = getRecommendationBreakdown(p, pet);
    const conclusion = buildProductConclusion(p, pet, generateAnalysisReport(p, pet), {
      personalized: true,
    });

    expect(classifyAllergyRelationship(p.ingredients[0], '닭').kind).toBe('strong_caution');
    expect(breakdown.allergyHits).toEqual([]);
    expect(breakdown.allergyCautionPenalty).toBe(15);
    expect(conclusion.tone).toBe('caution');
    expect(conclusion.headline).toContain('포함 가능성');
  });

  it('treats source-specific poultry fat as processing caution and hydrolyzed poultry separately', () => {
    const fat = product(['닭지방']);
    const hydrolyzed = product(['가수분해 닭 단백질']);
    const pet = profile('닭');
    const fatBreakdown = getRecommendationBreakdown(fat, pet);
    const hydroBreakdown = getRecommendationBreakdown(hydrolyzed, pet);

    expect(classifyAllergyRelationship(fat.ingredients[0], '닭').kind).toBe('processing_caution');
    expect(fatBreakdown.allergyHits).toEqual([]);
    expect(fatBreakdown.allergyCautionPenalty).toBe(5);
    expect(classifyAllergyRelationship(hydrolyzed.ingredients[0], '닭').kind).toBe('hydrolysis_caution');
    expect(hydroBreakdown.allergyHits).toEqual([]);
    expect(hydroBreakdown.allergyCautionPenalty).toBe(10);
  });

  it('does not infer chicken from egg or unknown animal byproduct', () => {
    expect(classifyAllergyRelationship(ingredient('난백'), '닭').kind).toBe('none');
    expect(classifyAllergyRelationship(ingredient('동물성부산물'), '닭').kind).toBe('none');
  });

  it('does not stack caution penalties on top of a hard allergy hit', () => {
    const breakdown = getRecommendationBreakdown(
      product(['계육분', '오리고기', '가금류부산물']),
      profile('닭'),
    );

    expect(breakdown.allergyHits).toEqual(['닭']);
    expect(breakdown.allergyPenalty).toBe(90);
    expect(breakdown.allergyCautionPenalty).toBe(0);
  });
});