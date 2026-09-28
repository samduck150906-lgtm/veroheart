import { describe, expect, it } from 'vitest';
import { selectReanalysisTargets, type CurrentLabelMatchReference } from './reanalysisScope';

const rows: CurrentLabelMatchReference[] = [
  { productId: 'p1', labelSetId: 'l1', isCurrent: true, normalizedText: '닭고기분', canonicalIngredientId: null },
  { productId: 'p1', labelSetId: 'l1', isCurrent: true, normalizedText: '닭고기분', canonicalIngredientId: 'chicken-meal' },
  { productId: 'p2', labelSetId: 'l2', isCurrent: true, normalizedText: '현미', canonicalIngredientId: 'brown-rice' },
  { productId: 'p3', labelSetId: 'old', isCurrent: false, normalizedText: '닭고기분', canonicalIngredientId: 'chicken-meal' },
];

describe('ingredient reanalysis scope', () => {
  it('selects current products affected by alias activation once', () => {
    expect(selectReanalysisTargets(rows, {
      normalizedTerms: ['닭 고기분'],
      engineVersionId: 'engine-v2',
    })).toEqual([{ productId: 'p1', engineVersionId: 'engine-v2' }]);
  });

  it('selects products linked to a changed canonical rule and excludes unaffected/old labels', () => {
    expect(selectReanalysisTargets(rows, {
      canonicalIngredientIds: ['chicken-meal'],
      engineVersionId: 'engine-v3',
    })).toEqual([{ productId: 'p1', engineVersionId: 'engine-v3' }]);
  });

  it('keeps the requested target engine version stable across retries', () => {
    const trigger = { normalizedTerms: ['닭고기분'], engineVersionId: 'engine-v2' };
    expect(selectReanalysisTargets(rows, trigger)).toEqual(selectReanalysisTargets(rows, trigger));
    expect(selectReanalysisTargets(rows, trigger)[0].engineVersionId).toBe('engine-v2');
  });
});
