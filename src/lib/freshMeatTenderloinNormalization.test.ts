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
    // 인접 부위는 각자의 정규명으로 떨어져야 한다. 생육(chicken)으로 흡수되면
    // 부위별 품질·알레르기 판정이 뭉개진다.
    expect(exactDictionaryIds('닭간')).toEqual(['chicken_liver']);
    expect(exactDictionaryIds('닭지방')).toEqual(['chicken_fat']);
    expect(exactDictionaryIds('닭연골')).toEqual([]);

    for (const label of ['닭간', '닭지방', '닭연골']) {
      expect(exactDictionaryIds(label), label).not.toContain('chicken');
    }
  });
});
