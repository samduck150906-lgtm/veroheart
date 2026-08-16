import { describe, expect, it } from 'vitest';
import { INGREDIENT_DICTIONARY } from '../analysis/ingredientDictionary';
import { normalizeIngredientName } from '../analysis/normalize';

function exactDictionaryIds(label: string): string[] {
  const key = normalizeIngredientName(label);
  return INGREDIENT_DICTIONARY.filter((entry) =>
    [entry.canonicalKo, entry.canonicalEn, ...entry.aliases].some(
      (name) => normalizeIngredientName(name) === key,
    ),
  ).map((entry) => entry.id);
}

describe('fresh meat tenderloin normalization', () => {
  it('maps fresh named meat cut labels to existing fresh meat canonicals', () => {
    expect(exactDictionaryIds('닭정육')).toEqual(['chicken']);
    expect(exactDictionaryIds('닭 정육')).toEqual(['chicken']);
    expect(exactDictionaryIds('소정육')).toEqual(['beef']);
    expect(exactDictionaryIds('오리 정육')).toEqual(['duck']);
  });

  it('does not collapse meal labels into fresh meat', () => {
    expect(exactDictionaryIds('닭고기분말')).toEqual(['chicken_meal']);
    expect(exactDictionaryIds('계육 분말')).toEqual(['chicken_meal']);
  });

  it('does not turn adjacent chicken-family parts into fresh meat aliases', () => {
    expect(exactDictionaryIds('닭간')).toEqual([]);
    expect(exactDictionaryIds('닭지방')).toEqual([]);
    expect(exactDictionaryIds('닭연골')).toEqual([]);
  });
});
