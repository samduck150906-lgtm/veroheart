import { describe, expect, it } from 'vitest';
import type { Ingredient, Product } from '../types';
import { buildHealthConcernAnatomicalRuntimeImpactReport } from './healthConcernAnatomicalRuntimeImpact';

function ingredient(nameKo: string, nameEn = '', purpose = ''): Ingredient {
  return { id: `${nameKo}:${nameEn}`, nameKo, nameEn, purpose, riskLevel: 'safe' };
}

function product(id: string, ingredients: Ingredient[], healthConcerns: string[] = []): Product {
  return {
    id,
    brand: '',
    name: `Fixture ${id}`,
    category: 'food',
    targetPetType: 'dog',
    imageUrl: '',
    ingredients,
    healthConcerns,
    reviewsCount: 0,
    averageRating: 0,
  };
}

describe('health-concern anatomical runtime aggregate impact', () => {
  it('isolates pure anatomical collisions and keeps independent evidence unchanged', () => {
    const products = [
      product('chicken-heart', [ingredient('닭고기 심장', 'Chicken Heart')]),
      product('rabbit-heart', [ingredient('토끼 심장', 'Rabbit Heart')]),
      product('tagged', [ingredient('닭고기 심장', 'Chicken Heart')], ['심장 건강']),
      product('purpose', [ingredient('토끼 심장', 'Rabbit Heart', '심장 건강 지원')]),
      product('unrelated', [ingredient('관절 건강 원료', 'joint support')]),
    ];
    const before = structuredClone(products);
    const report = buildHealthConcernAnatomicalRuntimeImpactReport(products);

    expect(report.rowsCompared).toBe(45);
    expect(report.affectedRows).toBe(2);
    expect(report.affectedConcernCounts).toEqual({ heart: 2 });
    expect(report.concernFitTransitions).toEqual({ '5->5': 2 });
    expect(report.totalScoreDeltaDistribution).toEqual({ '0': 2 });
    expect(report.displayScoreDeltaDistribution).toEqual({ '0': 2 });
    expect(report.gradeChanges).toBe(0);
    expect(report.reasonChanges).toEqual({
      matchedConcernReasonRemoved: 2,
      neutralNoDirectMatchReasonAdded: 2,
    });
    expect(report.ordering.cohortsCompared).toBe(9);
    expect(report.ordering.cohortsChanged).toBe(0);
    expect(report.ordering.productsWithChangedPosition).toBe(0);
    expect(report.otherConcernChanges).toBe(0);
    expect(report.everyAffectedRowConfirmedAnatomicalHeartCollision).toBe(true);
    expect(Object.values(report.nonConcernComponentChanges).every((count) => count === 0)).toBe(true);
    expect(report.invariantViolations).toEqual({});
    expect(report.safety).toEqual({
      localCopiedDataOnly: true,
      mutatesInput: false,
      changesCanonicalHealthConcernScore: false,
      changesMissingEvidencePolicy: false,
      authorizesRuntimeActivation: false,
    });
    expect(products).toEqual(before);
  });

  it('is deterministic and reports no change when only legitimate or unrelated evidence exists', () => {
    const products = [
      product('tagged', [ingredient('닭고기 심장', 'Chicken Heart')], ['심장 건강']),
      product('purpose', [ingredient('토끼 심장', 'Rabbit Heart', '심장 건강 지원')]),
      product('joint', [ingredient('관절 건강 원료')]),
    ];
    const first = buildHealthConcernAnatomicalRuntimeImpactReport(products);
    const second = buildHealthConcernAnatomicalRuntimeImpactReport(products);
    expect(second).toEqual(first);
    expect(first.affectedRows).toBe(0);
    expect(first.otherConcernChanges).toBe(0);
    expect(first.invariantViolations).toEqual({});
  });
});
