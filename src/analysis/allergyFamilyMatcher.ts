import type { Ingredient } from '../types';
import { INGREDIENT_DICTIONARY } from './ingredientDictionary';
import { normalizeIngredientName } from './normalize';

interface FamilyRule {
  terms: string[];
  tags: string[];
}

const FAMILY_RULES: FamilyRule[] = [
  { terms: ['닭', '계육', '치킨', 'chicken'], tags: ['chicken', 'poultry'] },
  { terms: ['오리', 'duck'], tags: ['duck', 'poultry'] },
  { terms: ['칠면조', '터키', 'turkey'], tags: ['turkey', 'poultry'] },
  { terms: ['가금', 'poultry'], tags: ['poultry'] },
  { terms: ['소고기', '쇠고기', '우육', '비프', 'beef', '소간', '소지방', '소내장'], tags: ['beef'] },
  { terms: ['돼지', '돈육', '포크', 'pork'], tags: ['pork'] },
  { terms: ['양고기', '램', 'lamb', '양간', '양지방'], tags: ['lamb'] },
  {
    terms: [
      '연어',
      '참치',
      '명태',
      '황태',
      '대구',
      '생선',
      '어류',
      '어분',
      '어유',
      'fish',
      'salmon',
      'tuna',
      'whitefish',
      'cod',
      'fishmeal',
      'fishoil',
      'salmonoil',
    ],
    tags: ['fish'],
  },
  { terms: ['계란', '달걀', '난백', '난황', 'egg'], tags: ['egg'] },
];

function compact(value: string): string {
  return normalizeIngredientName(value || '');
}

function addAll(set: Set<string>, values: string[]) {
  for (const value of values) {
    const key = compact(value);
    if (key) set.add(key);
  }
}

function dictionaryMatches(label: string) {
  const key = compact(label);
  if (!key) return [];
  return INGREDIENT_DICTIONARY.filter((entry) =>
    [entry.canonicalKo, entry.canonicalEn ?? '', ...entry.aliases].some((name) => compact(name) === key),
  );
}

function familyTagsFromLabel(label: string): string[] {
  const key = compact(label);
  if (!key) return [];

  const tags = new Set<string>();
  for (const rule of FAMILY_RULES) {
    if (rule.terms.some((term) => key.includes(compact(term)))) addAll(tags, rule.tags);
  }
  return [...tags];
}

export function allergyTagsForLabel(label: string): string[] {
  const tags = new Set<string>();

  for (const entry of dictionaryMatches(label)) addAll(tags, entry.allergenTags);
  addAll(tags, familyTagsFromLabel(label));

  const fallback = compact(label);
  if (tags.size === 0 && fallback) tags.add(fallback);

  return [...tags];
}

export function allergyTagsForIngredient(ingredient: Ingredient): string[] {
  const tags = new Set<string>();
  const labels = [ingredient.nameKo, ingredient.nameEn, ingredient.purpose].filter(Boolean);

  for (const label of labels) {
    for (const entry of dictionaryMatches(label)) addAll(tags, entry.allergenTags);
    addAll(tags, familyTagsFromLabel(label));
  }

  return [...tags];
}

export function isFamilyAllergyIngredient(ingredient: Ingredient, allergies: string[]): boolean {
  const ingredientTags = new Set(allergyTagsForIngredient(ingredient));

  return allergies.some((allergy) => {
    const allergyKey = compact(allergy);
    if (!allergyKey) return false;

    const directTextMatch =
      compact(ingredient.nameKo || '').includes(allergyKey) ||
      compact(ingredient.nameEn || '').includes(allergyKey) ||
      compact(ingredient.purpose || '').includes(allergyKey);
    if (directTextMatch) return true;

    return allergyTagsForLabel(allergy).some((tag) => ingredientTags.has(tag));
  });
}

export function allergyIngredientNames(ingredients: Ingredient[], allergy: string): string[] {
  return ingredients
    .filter((ingredient) => isFamilyAllergyIngredient(ingredient, [allergy]))
    .map((ingredient) => ingredient.nameKo);
}
