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

export type PoultrySourceFamily = 'chicken' | 'duck' | 'turkey';
export type AllergyRelationshipKind =
  | 'hard'
  | 'cross_caution'
  | 'strong_caution'
  | 'processing_caution'
  | 'hydrolysis_caution'
  | 'none';

export interface AllergyRelationshipMatch {
  allergy: string;
  ingredientName: string;
  kind: AllergyRelationshipKind;
  allergySource: PoultrySourceFamily | 'poultry' | null;
  ingredientSource: PoultrySourceFamily | 'poultry' | null;
}

const POULTRY_SOURCE_TERMS: Array<{ source: PoultrySourceFamily; terms: string[] }> = [
  { source: 'chicken', terms: ['닭', '계육', '치킨', 'chicken'] },
  { source: 'duck', terms: ['오리', 'duck'] },
  { source: 'turkey', terms: ['칠면조', '터키', 'turkey'] },
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

function poultrySourceFromLabel(label: string): PoultrySourceFamily | null {
  const key = compact(label);
  for (const rule of POULTRY_SOURCE_TERMS) {
    if (rule.terms.some((term) => key.includes(compact(term)))) return rule.source;
  }

  const dictionaryTags = dictionaryMatches(label).flatMap((entry) => entry.allergenTags.map(compact));
  if (dictionaryTags.includes('chicken')) return 'chicken';
  if (dictionaryTags.includes('duck')) return 'duck';
  if (dictionaryTags.includes('turkey')) return 'turkey';
  return null;
}

function isBroadPoultryLabel(label: string): boolean {
  const key = compact(label);
  if (!key || poultrySourceFromLabel(label)) return false;
  return key.includes(compact('가금')) || key.includes(compact('poultry'));
}

function poultrySourceFromIngredient(ingredient: Ingredient): PoultrySourceFamily | null {
  const labels = [ingredient.nameKo, ingredient.nameEn, ingredient.purpose].filter(Boolean);
  for (const label of labels) {
    const source = poultrySourceFromLabel(label);
    if (source) return source;
  }
  return null;
}

function isGenericPoultryIngredient(ingredient: Ingredient): boolean {
  if (poultrySourceFromIngredient(ingredient)) return false;
  return [ingredient.nameKo, ingredient.nameEn, ingredient.purpose]
    .filter(Boolean)
    .some((label) => isBroadPoultryLabel(label));
}

function ingredientText(ingredient: Ingredient): string {
  return compact(`${ingredient.nameKo} ${ingredient.nameEn || ''} ${ingredient.purpose || ''}`);
}

function isHydrolyzedPoultryIngredient(ingredient: Ingredient): boolean {
  const key = ingredientText(ingredient);
  return ['가수분해', 'hydrolyzed', 'hydrolysed', 'hydrolysate'].some((term) =>
    key.includes(compact(term)),
  );
}

function isPoultryFatIngredient(ingredient: Ingredient): boolean {
  const key = ingredientText(ingredient);
  return ['지방', '기름', 'fat', 'oil'].some((term) => key.includes(compact(term)));
}

function poultryRelationship(
  ingredient: Ingredient,
  allergy: string,
): AllergyRelationshipMatch | null {
  const allergySource = poultrySourceFromLabel(allergy);
  const broadPoultryAllergy = isBroadPoultryLabel(allergy);
  const ingredientSource = poultrySourceFromIngredient(ingredient);
  const genericPoultryIngredient = isGenericPoultryIngredient(ingredient);

  const allergyIsPoultry = Boolean(allergySource || broadPoultryAllergy);
  const ingredientIsPoultry = Boolean(ingredientSource || genericPoultryIngredient);
  if (!allergyIsPoultry && !ingredientIsPoultry) return null;

  const base: Omit<AllergyRelationshipMatch, 'kind'> = {
    allergy,
    ingredientName: ingredient.nameKo,
    allergySource: allergySource ?? (broadPoultryAllergy ? 'poultry' : null),
    ingredientSource: ingredientSource ?? (genericPoultryIngredient ? 'poultry' : null),
  };

  if (!allergyIsPoultry || !ingredientIsPoultry) return { ...base, kind: 'none' };

  if (isHydrolyzedPoultryIngredient(ingredient)) {
    return { ...base, kind: 'hydrolysis_caution' };
  }
  if (isPoultryFatIngredient(ingredient)) {
    return { ...base, kind: 'processing_caution' };
  }

  if (broadPoultryAllergy) return { ...base, kind: 'hard' };
  if (allergySource && ingredientSource === allergySource) return { ...base, kind: 'hard' };
  if (allergySource && ingredientSource && ingredientSource !== allergySource) {
    return { ...base, kind: 'cross_caution' };
  }
  if (allergySource && genericPoultryIngredient) return { ...base, kind: 'strong_caution' };

  return { ...base, kind: 'none' };
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

export function classifyAllergyRelationship(
  ingredient: Ingredient,
  allergy: string,
): AllergyRelationshipMatch {
  const poultry = poultryRelationship(ingredient, allergy);
  if (poultry) return poultry;

  const allergyKey = compact(allergy);
  if (!allergyKey) {
    return {
      allergy,
      ingredientName: ingredient.nameKo,
      kind: 'none',
      allergySource: null,
      ingredientSource: null,
    };
  }

  const directTextMatch =
    compact(ingredient.nameKo || '').includes(allergyKey) ||
    compact(ingredient.nameEn || '').includes(allergyKey) ||
    compact(ingredient.purpose || '').includes(allergyKey);
  const ingredientTags = new Set(allergyTagsForIngredient(ingredient));
  const dictionaryFamilyMatch = allergyTagsForLabel(allergy).some((tag) => ingredientTags.has(tag));

  return {
    allergy,
    ingredientName: ingredient.nameKo,
    kind: directTextMatch || dictionaryFamilyMatch ? 'hard' : 'none',
    allergySource: null,
    ingredientSource: null,
  };
}

export function isFamilyAllergyIngredient(ingredient: Ingredient, allergies: string[]): boolean {
  return allergies.some((allergy) => classifyAllergyRelationship(ingredient, allergy).kind === 'hard');
}

export function allergyCautionMatches(
  ingredients: Ingredient[],
  allergies: string[],
): AllergyRelationshipMatch[] {
  const cautionKinds: AllergyRelationshipKind[] = [
    'cross_caution',
    'strong_caution',
    'processing_caution',
    'hydrolysis_caution',
  ];

  return allergies.flatMap((allergy) =>
    ingredients
      .map((ingredient) => classifyAllergyRelationship(ingredient, allergy))
      .filter((match) => cautionKinds.includes(match.kind)),
  );
}

export function allergyIngredientNames(ingredients: Ingredient[], allergy: string): string[] {
  return ingredients
    .filter((ingredient) => classifyAllergyRelationship(ingredient, allergy).kind === 'hard')
    .map((ingredient) => ingredient.nameKo);
}
