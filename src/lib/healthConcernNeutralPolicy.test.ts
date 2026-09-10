import { describe, expect, it } from 'vitest';
import type {
  ConcernEvidenceLevel,
  ConcernStatus,
  DataConfidence,
  HealthConcernEvaluationReport,
  HealthConcernEvaluationResult,
  QuantitativeConcernCheck,
} from '../health/concerns';
import {
  buildHealthConcernNeutralPolicyProjection,
  type HealthConcernNeutralPolicyVariant,
} from './healthConcernNeutralPolicy';

const variants: HealthConcernNeutralPolicyVariant[] = [
  'conservative_partial_quantitative',
  'limited_partial_quantitative_credit',
];

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

function report(results: HealthConcernEvaluationResult[], unrecognizedProfileInputs: string[] = []): HealthConcernEvaluationReport {
  return { results, unrecognizedProfileInputs };
}

function project(
  evaluation: HealthConcernEvaluationReport,
  variant: HealthConcernNeutralPolicyVariant = 'conservative_partial_quantitative',
) {
  return buildHealthConcernNeutralPolicyProjection({
    rawSelectedConcernLabels: ['관절'],
    evaluation,
    variant,
  });
}

describe('health-concern missing-evidence neutral policy', () => {
  it.each(variants)('keeps missing and not-applicable evidence neutral under %s', (variant) => {
    const missing = project(report([result()]), variant);
    const notApplicable = project(report([result({
      status: 'not_applicable',
      evidenceLevel: 'not_applicable',
    })]), variant);
    expect(missing).toMatchObject({ status: 'computed', concernFit: 5 });
    expect(missing.results[0]).toMatchObject({ factor: 0.25, disposition: 'neutral_missing_evidence' });
    expect(notApplicable).toMatchObject({ status: 'computed', concernFit: 5 });
    expect(notApplicable.results[0]).toMatchObject({ factor: 0.25, disposition: 'neutral_not_applicable' });
  });

  it.each([
    ['tag only', { status: 'tag_only', evidenceLevel: 'tag_only', confidence: 'partial', matchedProductTags: ['관절'] }, 0.25],
    ['ingredient only', { status: 'possible', evidenceLevel: 'ingredient_only_quantity_unknown', confidence: 'partial', matchedIngredientEvidence: ['글루코사민'] }, 0.25],
    ['tag plus ingredient', { status: 'possible', evidenceLevel: 'tag_and_ingredient_quantity_unknown', confidence: 'partial', matchedProductTags: ['관절'], matchedIngredientEvidence: ['글루코사민'] }, 0.5],
  ] as Array<[string, Partial<HealthConcernEvaluationResult>, number]>)('maps %s without claiming quantitative support', (_label, overrides, factor) => {
    const projection = project(report([result(overrides)]));
    expect(projection.results[0].factor).toBe(factor);
    expect(projection.concernFit).toBe(20 * factor);
  });

  it('compares conservative and limited-credit treatment of partial quantitative evidence', () => {
    const evaluation = report([result({
      status: 'possible',
      evidenceLevel: 'partial_quantitative',
      confidence: 'partial',
      quantitativeChecks: [check('pass'), check('unknown')],
    })]);
    expect(project(evaluation, 'conservative_partial_quantitative')).toMatchObject({ concernFit: 5 });
    expect(project(evaluation, 'limited_partial_quantitative_credit')).toMatchObject({ concernFit: 10 });
  });

  it('allows a penalty below neutral only for sufficient active contradictory evidence', () => {
    const contradictory = project(report([result({
      status: 'not_supported',
      evidenceLevel: 'contradictory',
      confidence: 'sufficient',
      quantitativeChecks: [check('fail')],
    })]));
    expect(contradictory).toMatchObject({ status: 'computed', concernFit: 0 });
    expect(contradictory.results[0].disposition).toBe('contradictory_quantitative');

    const unsupported = project(report([result({
      status: 'not_supported',
      evidenceLevel: 'contradictory',
      confidence: 'sufficient',
      quantitativeChecks: [{ ...check('fail'), judgment: 'informational' }],
    })]));
    expect(unsupported).toMatchObject({ status: 'blocked_contract_mismatch', concernFit: null });
  });

  it('requires sufficient all-pass active evidence for the maximum contribution', () => {
    const supported = project(report([result({
      status: 'supported',
      evidenceLevel: 'validated_quantitative',
      confidence: 'sufficient',
      quantitativeChecks: [check('pass')],
    })]));
    expect(supported).toMatchObject({ status: 'computed', concernFit: 20 });
    expect(supported.results[0].disposition).toBe('supported_quantitative');
  });

  it('keeps an exact five-point neutral total across multiple concerns', () => {
    const results = (['joint', 'digestive', 'heart'] as const).map((concernId) => result({ concernId }));
    const projection = buildHealthConcernNeutralPolicyProjection({
      rawSelectedConcernLabels: ['관절', '소화기', '심장'],
      evaluation: report(results),
      variant: 'conservative_partial_quantitative',
    });
    expect(projection.concernFit).toBe(5);
    expect(projection.results.map((item) => item.contribution)).toEqual([1.67, 1.67, 1.66]);
  });

  it('preserves the no-selection score without describing it as evidence', () => {
    const projection = buildHealthConcernNeutralPolicyProjection({
      rawSelectedConcernLabels: [],
      evaluation: report([]),
      variant: 'conservative_partial_quantitative',
    });
    expect(projection).toMatchObject({ status: 'not_selected', concernFit: 20, results: [] });
    expect(projection.semantics.authorizesRuntimeActivation).toBe(false);
  });

  it('blocks unrecognized input and malformed evaluator combinations', () => {
    expect(project(report([], ['legacy-only']))).toMatchObject({
      status: 'blocked_unrecognized',
      concernFit: null,
    });
    const invalid = result({
      status: 'supported' as ConcernStatus,
      evidenceLevel: 'missing' as ConcernEvidenceLevel,
      confidence: 'insufficient' as DataConfidence,
    });
    expect(project(report([invalid]))).toMatchObject({
      status: 'blocked_contract_mismatch',
      concernFit: null,
      blockingReasons: ['unsupported_evaluator_result:0'],
    });
  });

  it('is deterministic and does not mutate evaluator input', () => {
    const evaluation = report([result()]);
    const before = structuredClone(evaluation);
    const first = project(evaluation);
    const second = project(evaluation);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    expect(evaluation).toEqual(before);
  });
});
