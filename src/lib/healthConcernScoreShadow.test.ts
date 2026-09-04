import { describe, expect, it } from 'vitest';
import type { Product, UserPetProfile } from '../types';
import { getRecommendationBreakdown } from '../utils/score';
import { buildHealthConcernScoreShadowRow } from './healthConcernScoreShadow';

function ingredient(
  id: string,
  nameKo: string,
  purpose = '',
  riskLevel: 'safe' | 'caution' | 'danger' = 'safe',
) {
  return { id, nameKo, nameEn: nameKo, purpose, riskLevel };
}

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: 'shadow-product',
    brand: 'Fixture',
    name: 'Shadow product',
    category: 'food',
    mainCategory: 'food',
    targetPetType: 'dog',
    imageUrl: '',
    ingredients: [],
    healthConcerns: [],
    reviewsCount: 0,
    averageRating: 0,
    ...overrides,
  };
}

function profile(overrides: Partial<UserPetProfile> = {}): UserPetProfile {
  return {
    id: 'shadow-profile',
    name: 'Shadow pet',
    species: 'Dog',
    age: 4,
    allergies: [],
    healthConcerns: [],
    ...overrides,
  };
}

describe('health-concern score shadow row', () => {
  it('uses neutral 20 only when no concern was selected', () => {
    const row = buildHealthConcernScoreShadowRow(product(), profile());
    expect(row.candidate).toMatchObject({ status: 'not_selected', concernFit: 20 });
    expect(row.differences.blockedOrIncompleteReasons).toContain(
      'neutral_no_concern_selection_not_health_suitability_evidence',
    );
    expect(row.invariantViolations).toEqual([]);
  });

  it('computes one or multiple recognized concerns with bounded canonical contributions', () => {
    const fixture = product({
      healthConcerns: ['관절', '피부'],
      ingredients: [
        ingredient('joint', '글루코사민'),
        ingredient('skin', '연어오일'),
      ],
    });
    const single = buildHealthConcernScoreShadowRow(fixture, profile({ healthConcerns: ['관절'] }));
    const multiple = buildHealthConcernScoreShadowRow(fixture, profile({ healthConcerns: ['관절', '피부·모질'] }));
    expect(single.candidate.status).toBe('computed');
    expect(single.candidate.concernFit).toBeGreaterThan(0);
    expect(multiple.identity.recognizedConcernIds).toEqual(['joint', 'skin_coat']);
    expect(multiple.candidate.concernFit).toBeGreaterThanOrEqual(0);
    expect(multiple.candidate.concernFit).toBeLessThanOrEqual(20);
    expect(multiple.invariantViolations).toEqual([]);
  });

  it('deduplicates aliases through the canonical evaluator', () => {
    const row = buildHealthConcernScoreShadowRow(
      product({ ingredients: [ingredient('joint', '글루코사민')] }),
      profile({ healthConcerns: ['관절', 'joint', '관절 건강'] }),
    );
    expect(row.identity.rawSelectedConcernLabels).toEqual(['관절', 'joint', '관절 건강']);
    expect(row.identity.recognizedConcernIds).toEqual(['joint']);
    expect(row.candidate.evaluatorResults).toHaveLength(1);
  });

  it.each([
    [['legacy-only'], []],
    [['관절', 'legacy-only'], ['joint']],
  ])('blocks selected unrecognized inputs without silently awarding points: %j', (healthConcerns, recognized) => {
    const row = buildHealthConcernScoreShadowRow(product(), profile({ healthConcerns }));
    expect(row.identity.recognizedConcernIds).toEqual(recognized);
    expect(row.identity.unrecognizedProfileInputs).toContain('legacy-only');
    expect(row.candidate).toMatchObject({
      status: 'blocked_unrecognized',
      concernFit: null,
      baseScore: null,
      totalScore: null,
      displayScore: null,
      grade: null,
    });
    expect(row.differences).toMatchObject({
      concernFitDelta: null,
      totalScoreDelta: null,
      displayScoreDelta: null,
      gradeChanged: null,
      rankingImpactEligible: false,
    });
    expect(row.invariantViolations).toEqual([]);
  });

  it('keeps missing tags and ingredients visibly insufficient instead of failed', () => {
    const row = buildHealthConcernScoreShadowRow(product(), profile({ healthConcerns: ['관절'] }));
    expect(row.candidate).toMatchObject({
      status: 'computed',
      concernFit: 0,
      concernStatuses: ['unknown'],
      evidenceLevels: ['missing'],
      confidenceLevels: ['insufficient'],
    });
    expect(row.differences.blockedOrIncompleteReasons).toContain('insufficient_evidence');
  });

  it.each([
    ['tag only', { healthConcerns: ['관절'] }, [], 'tag_only'],
    ['ingredient only', {}, [ingredient('joint', '글루코사민')], 'ingredient_only_quantity_unknown'],
    ['tag and ingredient', { healthConcerns: ['관절'] }, [ingredient('joint', '글루코사민')], 'tag_and_ingredient_quantity_unknown'],
  ])('records %s evidence without claiming quantitative support', (_label, productFields, ingredients, evidenceLevel) => {
    const row = buildHealthConcernScoreShadowRow(
      product({ ...productFields, ingredients }),
      profile({ healthConcerns: ['관절'] }),
    );
    expect(row.candidate.evidenceLevels).toEqual([evidenceLevel]);
    expect(row.candidate.concernFit).toBeGreaterThan(0);
    expect(row.candidate.evaluatorResults[0].status).not.toBe('supported');
  });

  it.each([
    ['신장·비뇨기', { phosphorus: 0.14, kcalPer100g: 350 }],
    ['심장', { taurine: 1500, kcalPer100g: 350 }],
  ])('keeps disabled %s quantitative thresholds score-neutral', (concern, guaranteedAnalysis) => {
    const row = buildHealthConcernScoreShadowRow(
      product({
        targetPetType: concern === '심장' ? 'cat' : 'dog',
        formulation: concern === '심장' ? 'dry' : undefined,
        guaranteedAnalysis,
      }),
      profile({ species: concern === '심장' ? 'Cat' : 'Dog', healthConcerns: [concern] }),
    );
    expect(row.candidate.concernFit).toBe(0);
    expect(row.candidate.evaluatorResults.flatMap((result) => result.quantitativeChecks)
      .every((check) => check.judgment === 'informational')).toBe(true);
    expect(row.invariantViolations).toEqual([]);
  });

  it('reuses baseline species, HARD allergy, poultry caution, preference, and danger signals unchanged', () => {
    const cases = [
      [product({ targetPetType: 'cat' }), profile({ healthConcerns: ['관절'] })],
      [product({ ingredients: [ingredient('chicken', '닭고기')] }), profile({ allergies: ['닭'], healthConcerns: ['관절'] })],
      [product({ ingredients: [ingredient('duck', '오리고기')] }), profile({ allergies: ['닭'], healthConcerns: ['관절'] })],
      [product(), profile({ healthConcerns: ['관절'], productPreferences: { 'shadow-product': 1 } })],
      [product({ ingredients: [ingredient('danger', '위험 원료', '', 'danger')] }), profile({ healthConcerns: ['관절'] })],
    ] as const;

    for (const [fixture, pet] of cases) {
      const baseline = getRecommendationBreakdown(fixture, pet);
      const row = buildHealthConcernScoreShadowRow(fixture, pet);
      expect(row.unchangedSafetySignals).toMatchObject({
        speciesMismatch: baseline.speciesMismatch,
        allergyHits: baseline.allergyHits,
        allergyPenalty: baseline.allergyPenalty,
        allergyCautions: baseline.allergyCautions,
        allergyCautionPenalty: baseline.allergyCautionPenalty,
        poultryCautionPenalty: baseline.allergyCautionPenalty,
        preferencePenalty: baseline.preferencePenalty,
        preferenceLevel: baseline.preferenceLevel,
        ingredientSafety: baseline.ingredientSafety,
        healthSuitability: baseline.healthSuitability,
        dangerCount: baseline.dangerCount,
        cautionCount: baseline.cautionCount,
        visibleReasons: baseline.reasons,
      });
      if (baseline.dangerCount > 0) expect(row.candidate.displayScore).toBeLessThanOrEqual(69);
      expect(row.invariantViolations).toEqual([]);
    }
  });

  it('does not mutate inputs and returns byte-equivalent output repeatedly', () => {
    const fixture = product({
      healthConcerns: ['관절'],
      ingredients: [ingredient('joint', '글루코사민')],
    });
    const pet = profile({ healthConcerns: ['관절'] });
    const beforeProduct = structuredClone(fixture);
    const beforeProfile = structuredClone(pet);
    const first = buildHealthConcernScoreShadowRow(fixture, pet);
    const second = buildHealthConcernScoreShadowRow(fixture, pet);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    expect(fixture).toEqual(beforeProduct);
    expect(pet).toEqual(beforeProfile);
  });
});
