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

  it('documents that most non-chicken animal sources currently lack separate meal canonicals', () => {
    for (const missing of ['beef_meal', 'pork_meal', 'duck_meal', 'salmon_meal', 'turkey_meal']) {
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
