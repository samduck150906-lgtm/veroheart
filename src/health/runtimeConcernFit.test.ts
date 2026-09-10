import { describe, expect, it } from 'vitest';
import type {
  HealthConcernEvaluationReport,
  HealthConcernEvaluationResult,
  QuantitativeConcernCheck,
} from './concerns';
import { evaluateRuntimeConcernFit, projectRuntimeConcernFit } from './runtimeConcernFit';
import type { Product, UserPetProfile } from '../types';

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: 'runtime-policy-product',
    brand: 'Fixture',
    name: 'Runtime policy fixture',
    category: 'food',
    targetPetType: 'dog',
    imageUrl: '',
    ingredients: [],
    reviewsCount: 0,
    averageRating: 0,
    ...overrides,
  };
}

function profile(healthConcerns: string[]): UserPetProfile {
  return {
    id: 'runtime-policy-pet',
    name: 'Fixture pet',
    species: 'Dog',
    age: 4,
    allergies: [],
    healthConcerns,
  };
}

function check(status: QuantitativeConcernCheck['status']): QuantitativeConcernCheck {
  return {
    nutrient: 'fixture',
    status,
    valueKind: 'label_declared',
    concernDomain: 'general',
    judgment: 'active',
    inputEvidence: [],
    message: 'fixture',
  };
}

function result(overrides: Partial<HealthConcernEvaluationResult> = {}): HealthConcernEvaluationResult {
  return {
    concernId: 'joint',
    originalProfileLabel: '관절',
    status: 'unknown',
    evidenceLevel: 'missing',
    matchedProductTags: [],
    matchedIngredientEvidence: [],
    quantitativeChecks: [],
    missingRequiredFields: [],
    cautionReasons: [],
    userFacingFacts: [],
    confidence: 'insufficient',
    scoringContribution: 0,
    sourceReferences: [],
    evidenceDomains: [],
    ...overrides,
  };
}

function projected(
  evaluation: HealthConcernEvaluationReport,
  labels: string[] = ['관절'],
  legacyConcernFit = 20,
) {
  return projectRuntimeConcernFit({
    rawSelectedConcernLabels: labels,
    evaluation,
    legacyConcernFit,
  });
}

describe('runtime health-concern fit', () => {
  it('preserves the full neutral component when no concern is selected', () => {
    const runtime = evaluateRuntimeConcernFit(product(), profile([]), 20);
    expect(runtime).toMatchObject({ status: 'not_selected', concernFit: 20 });
    expect(runtime.fallback.active).toBe(false);
  });

  it.each([
    ['missing', product(), 'neutral_missing_evidence'],
    ['tag only', product({ healthConcerns: ['관절'] }), 'neutral_tag_only'],
    ['ingredient only', product({ ingredients: [{ id: 'i1', nameKo: '글루코사민', nameEn: 'glucosamine', purpose: '', riskLevel: 'safe' }] }), 'neutral_ingredient_only'],
  ] as const)('uses one-quarter of the selected share for %s evidence', (_label, item, disposition) => {
    const runtime = evaluateRuntimeConcernFit(item, profile(['관절']), 20);
    expect(runtime).toMatchObject({ status: 'computed', concernFit: 5 });
    expect(runtime.projection.results[0]).toMatchObject({ factor: 0.25, disposition });
  });

  it('uses half of the selected share for combined tag and ingredient evidence', () => {
    const runtime = evaluateRuntimeConcernFit(product({
      healthConcerns: ['관절'],
      ingredients: [{ id: 'i1', nameKo: '콘드로이틴', nameEn: 'chondroitin', purpose: '', riskLevel: 'safe' }],
    }), profile(['관절']), 20);
    expect(runtime.concernFit).toBe(10);
    expect(runtime.projection.results[0]).toMatchObject({
      factor: 0.5,
      disposition: 'limited_combined_evidence',
    });
  });

  it.each([
    ['supported quantitative', result({ status: 'supported', evidenceLevel: 'validated_quantitative', confidence: 'sufficient', quantitativeChecks: [check('pass')] }), 20, 'supported_quantitative'],
    ['sufficient contradiction', result({ status: 'not_supported', evidenceLevel: 'contradictory', confidence: 'sufficient', quantitativeChecks: [check('fail')] }), 0, 'contradictory_quantitative'],
    ['partial quantitative', result({ status: 'possible', evidenceLevel: 'partial_quantitative', confidence: 'partial', quantitativeChecks: [check('pass'), check('unknown')] }), 5, 'neutral_partial_quantitative'],
    ['not applicable', result({ status: 'not_applicable', evidenceLevel: 'not_applicable' }), 5, 'neutral_not_applicable'],
  ] as const)('projects %s through the conservative merged policy', (_label, evaluationResult, concernFit, disposition) => {
    const runtime = projected({ results: [evaluationResult], unrecognizedProfileInputs: [] });
    expect(runtime.concernFit).toBe(concernFit);
    expect(runtime.projection.results[0].disposition).toBe(disposition);
  });

  it('allocates multiple selected concerns exactly and deterministically', () => {
    const results = (['joint', 'digestive', 'heart'] as const).map((concernId) => result({ concernId }));
    const evaluation = { results, unrecognizedProfileInputs: [] };
    const first = projected(evaluation, ['관절', '소화기', '심장']);
    const second = projected(evaluation, ['관절', '소화기', '심장']);
    expect(first.concernFit).toBe(5);
    expect(first.projection.results.map((item) => item.contribution)).toEqual([1.67, 1.67, 1.66]);
    expect(second).toEqual(first);
  });

  it('preserves the legacy score through an observable fallback for unrecognized values', () => {
    const runtime = evaluateRuntimeConcernFit(product({ healthConcerns: ['legacy-value'] }), profile(['legacy-value']), 20);
    expect(runtime).toMatchObject({
      status: 'legacy_fallback',
      concernFit: 20,
      fallback: { active: true, reason: 'unrecognized_profile_inputs' },
    });
    expect(runtime.evaluation.unrecognizedProfileInputs).toEqual(['legacy-value']);
  });

  it('keeps output finite and does not mutate product, profile, or evaluation inputs', () => {
    const item = product({ healthConcerns: ['관절'] });
    const pet = profile(['관절']);
    const itemBefore = structuredClone(item);
    const petBefore = structuredClone(pet);
    const evaluation = { results: [result()], unrecognizedProfileInputs: ['legacy-value'] };
    const evaluationBefore = structuredClone(evaluation);
    const fallback = projected(evaluation, ['legacy-value'], Number.POSITIVE_INFINITY);

    expect(Number.isFinite(evaluateRuntimeConcernFit(item, pet, 20).concernFit)).toBe(true);
    expect(fallback.concernFit).toBe(0);
    expect(item).toEqual(itemBefore);
    expect(pet).toEqual(petBefore);
    expect(evaluation).toEqual(evaluationBefore);
  });
});
