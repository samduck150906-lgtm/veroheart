import { describe, expect, it } from 'vitest';
import { INGREDIENT_DICTIONARY } from '../analysis/ingredientDictionary';

const byId = new Map(INGREDIENT_DICTIONARY.map((entry) => [entry.id, entry]));

const expectedAnimalEntries = [
  ['chicken', '닭고기', 'animal_protein', 'chicken'],
  ['chicken_meal', '계육분', 'processed_protein', 'chicken'],
  ['beef', '소고기', 'animal_protein', 'beef'],
  ['pork', '돼지고기', 'animal_protein', 'pork'],
  ['duck', '오리고기', 'animal_protein', 'duck'],
  ['lamb', '양고기', 'animal_protein', 'lamb'],
  ['turkey', '칠면조', 'animal_protein', 'turkey'],
  ['salmon', '연어', 'animal_protein', 'salmon'],
  ['tuna', '참치', 'animal_protein', 'fish'],
  ['whitefish', '흰살생선', 'animal_protein', 'fish'],
  ['egg', '계란', 'animal_protein', 'egg'],
] as const;

describe('animal-family canonical coverage audit', () => {
  it('documents current named animal protein and meal entries', () => {
    for (const [id, canonicalKo, category, source] of expectedAnimalEntries) {
      const entry = byId.get(id);
      expect(entry?.canonicalKo, id).toBe(canonicalKo);
      expect(entry?.category, id).toBe(category);
      expect(entry?.animalSource, id).toBe(source);
    }
  });

  it('documents that chicken has both fresh and processed canonical concepts', () => {
    expect(byId.get('chicken')?.animalSource).toBe('chicken');
    expect(byId.get('chicken_meal')?.animalSource).toBe('chicken');
    expect(byId.get('chicken')?.category).not.toBe(byId.get('chicken_meal')?.category);
  });

  it('documents which non-chicken animal sources have gained separate meal canonicals', () => {
    // 사전 확장(dfbaa72)으로 오리·연어는 생육과 분말이 분리됐다.
    for (const present of ['duck_meal', 'salmon_meal']) {
      expect(byId.has(present), present).toBe(true);
      expect(byId.get(present)?.category, present).toBe('processed_protein');
    }
  });

  it('documents that the remaining animal sources still lack separate meal canonicals', () => {
    // 소·돼지·칠면조는 아직 생육 정규명만 있어, 분말 라벨이 생육으로 뭉뚱그려진다.
    for (const missing of ['beef_meal', 'pork_meal', 'turkey_meal']) {
      expect(byId.has(missing), missing).toBe(false);
    }
  });

  it('documents that generic animal byproduct is separated from named animal protein', () => {
    const byproduct = byId.get('animal_byproduct');
    expect(byproduct?.category).toBe('processed_protein');
    expect(byproduct?.animalSource).toBe('unknown');
    expect(byproduct?.defaultSeverity).toBe('watch');
  });
});
