import { describe, expect, it } from 'vitest';
import { INGREDIENT_DICTIONARY } from '../analysis/ingredientDictionary';
import { normalizeIngredientName } from '../analysis/normalize';

const dictionaryById = new Map(INGREDIENT_DICTIONARY.map((entry) => [entry.id, entry]));

function exactDictionaryIds(label: string): string[] {
  const key = normalizeIngredientName(label);
  return INGREDIENT_DICTIONARY.filter((entry) =>
    [entry.canonicalKo, entry.canonicalEn, ...entry.aliases].some(
      (name) => normalizeIngredientName(name) === key,
    ),
  ).map((entry) => entry.id);
}

describe('chicken-family dictionary coverage', () => {
  it('has separate dictionary entries for fresh chicken and chicken meal', () => {
    expect(dictionaryById.get('chicken')?.canonicalKo).toBe('닭고기');
    expect(dictionaryById.get('chicken')?.category).toBe('animal_protein');
    expect(dictionaryById.get('chicken_meal')?.canonicalKo).toBe('계육분');
    expect(dictionaryById.get('chicken_meal')?.category).toBe('processed_protein');
  });

  it('covers existing fresh chicken label variants', () => {
    for (const label of ['닭', '닭고기', '닭가슴살', '닭 신선육', '닭신선육', '생닭고기', '치킨', 'chicken']) {
      expect(exactDictionaryIds(label), label).toEqual(['chicken']);
    }
  });

  it('covers existing processed chicken label variants', () => {
    for (const label of ['계육분', '계육 분말', '닭고기분', '닭고기분말', '닭고기 분말', '치킨밀', 'chicken meal']) {
      expect(exactDictionaryIds(label), label).toEqual(['chicken_meal']);
    }
  });

  it('maps tenderloin labels to fresh chicken, not to the processed meal canonical', () => {
    // 사전 확장(dfbaa72) 이후 '닭정육'은 생육(chicken)으로 해석된다.
    // 중요한 건 가공 분말(chicken_meal)로 새지 않는 것이다 — 품질 등급이 뒤집힌다.
    for (const label of ['닭정육', '닭 정육']) {
      expect(exactDictionaryIds(label), label).toEqual(['chicken']);
      expect(exactDictionaryIds(label), label).not.toContain('chicken_meal');
    }
  });
});
