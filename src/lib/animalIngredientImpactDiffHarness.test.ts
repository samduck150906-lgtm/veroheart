import { describe, expect, it } from 'vitest';
import { buildAnimalIngredientImpactDiffReport } from './animalIngredientImpactDiffHarness';

const before = [
  {
    productId: 'ordinary-chicken',
    productName: 'Ordinary chicken food',
    ingredientNames: ['닭고기'],
    allergyHits: ['닭'],
    score: 0,
    displayScore: 0,
    rankingPosition: 1,
  },
  {
    productId: 'meal-label',
    productName: 'Chicken meal food',
    ingredientNames: ['계육분'],
    allergyHits: [],
    score: 80,
    displayScore: 80,
    rankingPosition: 2,
  },
  {
    productId: 'unknown-byproduct',
    productName: 'Unknown animal byproduct food',
    ingredientNames: ['동물성부산물'],
    allergyHits: [],
    score: 70,
    displayScore: 70,
    rankingPosition: 3,
  },
];

const after = [
  {
    productId: 'ordinary-chicken',
    productName: 'Ordinary chicken food',
    ingredientNames: ['닭고기'],
    allergyHits: ['닭'],
    score: 0,
    displayScore: 0,
    rankingPosition: 1,
  },
  {
    productId: 'meal-label',
    productName: 'Chicken meal food',
    ingredientNames: ['계육분'],
    allergyHits: ['닭'],
    score: 0,
    displayScore: 0,
    rankingPosition: 3,
  },
  {
    productId: 'unknown-byproduct',
    productName: 'Unknown animal byproduct food',
    ingredientNames: ['동물성부산물'],
    allergyHits: [],
    score: 70,
    displayScore: 70,
    rankingPosition: 2,
  },
];

describe('animal ingredient impact diff harness', () => {
  it('summarizes allergy score display and ranking impact', () => {
    const report = buildAnimalIngredientImpactDiffReport({
      hypothesisId: 'chicken-family-allergy-impact',
      hypothesisStatement: 'Chicken family allergy should include named meal labels.',
      before,
      after,
    });

    expect(report.reportKind).toBe('animal_ingredient_impact_diff_report');
    expect(report.summary).toEqual({
      productsCompared: 3,
      allergyHitChangedProducts: 1,
      scoreChangedProducts: 1,
      displayChangedProducts: 1,
      rankingChangedProducts: 2,
    });
  });

  it('keeps unknown byproduct unchanged when it is not a named source match', () => {
    const report = buildAnimalIngredientImpactDiffReport({
      hypothesisId: 'chicken-family-allergy-impact',
      hypothesisStatement: 'Chicken family allergy should include named meal labels.',
      before,
      after,
    });

    const unknown = report.rows.find((row) => row.productId === 'unknown-byproduct');
    expect(unknown?.allergyHitChanged).toBe(false);
    expect(unknown?.scoreDelta).toBe(0);
    expect(unknown?.displayScoreDelta).toBe(0);
  });

  it('routes behavior-impacting diff reports to approval required', () => {
    const report = buildAnimalIngredientImpactDiffReport({
      hypothesisId: 'chicken-family-allergy-impact',
      hypothesisStatement: 'Chicken family allergy should include named meal labels.',
      before,
      after,
    });

    expect(report.harnessGate.decision).toBe('approval_required');
    expect(report.harnessGate.requiredApproval).toEqual([
      'allergy_hit change requires owner approval',
      'score change requires owner approval',
      'display_verdict change requires owner approval',
      'ranking change requires owner approval',
    ]);
  });
});
