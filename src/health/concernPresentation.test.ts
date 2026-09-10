import { describe, expect, it } from 'vitest';
import { HEALTH_CONCERN_IDS, type HealthConcernEvaluationResult, type QuantitativeConcernCheck } from './concerns';
import { buildHealthConcernPresentation } from './concernPresentation';
import { projectRuntimeConcernFit } from './runtimeConcernFit';

function check(status: QuantitativeConcernCheck['status']): QuantitativeConcernCheck {
  return {
    nutrient: 'fixture', status, valueKind: 'label_declared', concernDomain: 'general',
    judgment: 'active', inputEvidence: [], message: 'fixture',
  };
}

function result(overrides: Partial<HealthConcernEvaluationResult> = {}): HealthConcernEvaluationResult {
  return {
    concernId: 'joint', originalProfileLabel: '관절', status: 'unknown', evidenceLevel: 'missing',
    matchedProductTags: [], matchedIngredientEvidence: [], quantitativeChecks: [], missingRequiredFields: [],
    cautionReasons: [], userFacingFacts: [], confidence: 'insufficient', scoringContribution: 0,
    sourceReferences: [], evidenceDomains: [], ...overrides,
  };
}

function runtime(results: HealthConcernEvaluationResult[], labels = results.map((item) => item.originalProfileLabel)) {
  return projectRuntimeConcernFit({
    rawSelectedConcernLabels: labels,
    evaluation: { results, unrecognizedProfileInputs: [] },
    legacyConcernFit: 20,
  });
}

describe('health-concern presentation', () => {
  it('renders no item when no concern is selected', () => {
    expect(buildHealthConcernPresentation(runtime([], []))).toEqual({ status: 'not_selected', items: [] });
  });

  it.each([
    ['missing', result(), 'insufficient_neutral', '중립적으로 반영'],
    ['not applicable', result({ status: 'not_applicable', evidenceLevel: 'not_applicable' }), 'insufficient_neutral', '적합하거나 부적합하다는 뜻은 아니에요'],
    ['tag only', result({ status: 'tag_only', evidenceLevel: 'tag_only', confidence: 'partial', matchedProductTags: ['관절'] }), 'limited_evidence', '건강 태그'],
    ['ingredient only', result({ status: 'possible', evidenceLevel: 'ingredient_only_quantity_unknown', confidence: 'partial', matchedIngredientEvidence: ['글루코사민'] }), 'limited_evidence', '글루코사민'],
    ['combined', result({ status: 'possible', evidenceLevel: 'tag_and_ingredient_quantity_unknown', confidence: 'partial', matchedProductTags: ['관절'], matchedIngredientEvidence: ['글루코사민'] }), 'limited_evidence', '함량 근거'],
    ['partial quantitative', result({ status: 'possible', evidenceLevel: 'partial_quantitative', confidence: 'partial', quantitativeChecks: [check('pass'), check('unknown')] }), 'limited_evidence', '일부 비교 가능한 수치'],
    ['supported', result({ status: 'supported', evidenceLevel: 'validated_quantitative', confidence: 'sufficient', quantitativeChecks: [check('pass')] }), 'supported_evidence', '치료·예방이나 효과를 보장하지는 않아요'],
    ['contradiction', result({ status: 'not_supported', evidenceLevel: 'contradictory', confidence: 'sufficient', quantitativeChecks: [check('fail')] }), 'contradiction_caution', '점수를 반영하지 않았어요'],
  ] as const)('presents %s without overclaiming', (_name, evaluation, state, phrase) => {
    const item = buildHealthConcernPresentation(runtime([evaluation])).items[0];
    expect(item.state).toBe(state);
    expect(`${item.title} ${item.summary}`).toContain(phrase);
  });

  it('surfaces an unrecognized stored concern as a visible legacy review', () => {
    const fallback = projectRuntimeConcernFit({
      rawSelectedConcernLabels: ['예전 저장값'],
      evaluation: { results: [], unrecognizedProfileInputs: ['예전 저장값'] },
      legacyConcernFit: 20,
    });
    const presentation = buildHealthConcernPresentation(fallback);
    expect(presentation.status).toBe('legacy_review');
    expect(presentation.items[0]).toMatchObject({ state: 'legacy_review', scoreEffect: '기존 점수 유지' });
    expect(presentation.items[0].summary).toContain('표준화 규칙으로 평가하지 못해');
  });

  it('supports all nine concern labels and multiple concerns in evaluator order', () => {
    const results = HEALTH_CONCERN_IDS.map((concernId, index) => result({
      concernId,
      originalProfileLabel: `concern-${index}`,
    }));
    const presentation = buildHealthConcernPresentation(runtime(results));
    expect(presentation.items).toHaveLength(9);
    expect(presentation.items.map((item) => item.concernId)).toEqual(HEALTH_CONCERN_IDS);
    expect(new Set(presentation.items.map((item) => item.label)).size).toBe(9);
  });

  it('does not emit broad suitability, treatment, prevention, or safety claims', () => {
    const results = [result(), result({
      concernId: 'heart', originalProfileLabel: '심장', status: 'possible',
      evidenceLevel: 'ingredient_only_quantity_unknown', confidence: 'partial', matchedIngredientEvidence: ['타우린'],
    })];
    const visible = JSON.stringify(buildHealthConcernPresentation(runtime(results, ['관절', '심장'])));
    for (const forbidden of ['건강 조건이 매우 잘 맞', '대체로 잘 맞', '치료에 좋아', '예방에 좋아', '완전히 안전']) {
      expect(visible).not.toContain(forbidden);
    }
  });
});
