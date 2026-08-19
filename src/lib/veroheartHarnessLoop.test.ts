import { describe, expect, it } from 'vitest';
import {
  VEROHEART_HARNESS_REQUIRED_AGENTS,
  buildVeroheartHarnessRunReport,
  type HarnessAgentReview,
  type HarnessHypothesis,
} from './veroheartHarnessLoop';

const hypothesis: HarnessHypothesis = {
  id: 'animal-allergy-family-check',
  statement: 'Animal source family allergy matching should catch related forms without collapsing canonical identity.',
  targetLayer: 'allergy',
  expectedPositiveCases: ['chicken meal should match chicken allergy'],
  expectedNegativeCases: ['unknown animal byproduct should not become named chicken'],
  expectedUnchangedSurfaces: ['ui_copy', 'product_ingredient_data', 'runtime_flag'],
};

function passingReview(agent: HarnessAgentReview['agent']): HarnessAgentReview {
  return {
    agent,
    status: 'pass',
    evidence: [`${agent} evidence`],
    changedSurfaces: [],
  };
}

const fullPassingReviews = VEROHEART_HARNESS_REQUIRED_AGENTS.map(passingReview);

describe('Veroheart hypothesis validation runner', () => {
  it('returns safe when all required agents pass and no approval surfaces changed', () => {
    const report = buildVeroheartHarnessRunReport({
      hypothesis,
      reviews: fullPassingReviews,
      semanticSafety: {},
    });

    expect(report.decision).toBe('safe');
    expect(report.missingAgents).toEqual([]);
    expect(report.requiredApproval).toEqual([]);
    expect(report.blockedReasons).toEqual([]);
  });

  it('requires approval when score display allergy or operational surfaces change', () => {
    const report = buildVeroheartHarnessRunReport({
      hypothesis,
      reviews: [
        ...fullPassingReviews.filter((review) => review.agent !== 'scoring-regression'),
        {
          agent: 'scoring-regression',
          status: 'pass',
          evidence: ['score diff generated'],
          changedSurfaces: ['score', 'display_verdict', 'allergy_hit'],
        },
      ],
      semanticSafety: {},
    });

    expect(report.decision).toBe('approval_required');
    expect(report.requiredApproval).toEqual([
      'score change requires owner approval',
      'display_verdict change requires owner approval',
      'allergy_hit change requires owner approval',
    ]);
  });

  it('blocks unsafe semantic shortcuts even when agent reviews are present', () => {
    const report = buildVeroheartHarnessRunReport({
      hypothesis,
      reviews: fullPassingReviews,
      semanticSafety: {
        collapsesPartsIntoOrdinaryMeat: true,
        treatsUnknownAnimalByproductAsNamedSource: true,
      },
    });

    expect(report.decision).toBe('blocked');
    expect(report.blockedReasons).toEqual([
      'semantic safety: part/form collapsed into ordinary meat',
      'semantic safety: unknown animal byproduct treated as named source',
    ]);
  });

  it('requires approval instead of safe when an agent review is missing', () => {
    const report = buildVeroheartHarnessRunReport({
      hypothesis,
      reviews: fullPassingReviews.filter((review) => review.agent !== 'product-impact'),
      semanticSafety: {},
    });

    expect(report.decision).toBe('approval_required');
    expect(report.missingAgents).toEqual(['product-impact']);
  });
});
