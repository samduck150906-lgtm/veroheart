import type { Ingredient } from '../types';
import { INGREDIENT_DICTIONARY } from './ingredientDictionary';
import type { DictionaryIngredient } from './types';
import { normalizeIngredientName } from './normalize';

/**
 * 정규화 결과 캐시.
 *
 * normalizeIngredientName 은 NFKC 정규화와 정규식 치환 5회를 돌기 때문에 한 번은 싸지만,
 * 이 모듈은 (제품 × 원료 × 알레르기 × 라벨) 조합마다 같은 문자열을 반복해서 정규화한다.
 * 라벨 어휘는 성분 사전과 프로필 알레르기로 한정되므로 결과를 그대로 재사용한다.
 */
const compactCache = new Map<string, string>();
/** 라벨 어휘는 유한하지만, 사용자 입력이 섞여도 캐시가 무한히 자라지 않도록 상한을 둔다. */
const COMPACT_CACHE_LIMIT = 5000;

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
  const raw = value || '';
  const cached = compactCache.get(raw);
  if (cached !== undefined) return cached;
  const key = normalizeIngredientName(raw);
  if (compactCache.size < COMPACT_CACHE_LIMIT) compactCache.set(raw, key);
  return key;
}

function addAll(set: Set<string>, values: string[]) {
  for (const value of values) {
    const key = compact(value);
    if (key) set.add(key);
  }
}

/**
 * 정규화된 표기 → 사전 항목 색인.
 *
 * 예전에는 라벨 하나를 찾을 때마다 사전 전체(항목 111개 × 표기 약 1,300개)를 훑으며
 * 매번 정규화했다. 표기는 고정이므로 모듈 로드 시 한 번만 정규화해 색인을 만든다.
 * 항목 순서와 중복 제거 규칙은 기존 filter 결과와 같게 유지한다.
 */
const DICTIONARY_BY_KEY: Map<string, DictionaryIngredient[]> = (() => {
  const index = new Map<string, DictionaryIngredient[]>();
  for (const entry of INGREDIENT_DICTIONARY) {
    const seen = new Set<string>();
    for (const name of [entry.canonicalKo, entry.canonicalEn ?? '', ...entry.aliases]) {
      const key = compact(name);
      // 빈 키는 예전 dictionaryMatches 가 라벨 단계에서 걸러내던 값이라 색인에 넣지 않는다.
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const bucket = index.get(key);
      if (bucket) bucket.push(entry);
      else index.set(key, [entry]);
    }
  }
  return index;
})();

function dictionaryMatches(label: string): DictionaryIngredient[] {
  const key = compact(label);
  if (!key) return [];
  return DICTIONARY_BY_KEY.get(key) ?? [];
}

/** 규칙 용어도 고정 문자열이므로 모듈 로드 시 한 번만 정규화한다. */
const FAMILY_RULES_COMPACT = FAMILY_RULES.map((rule) => ({
  terms: rule.terms.map(compact),
  tags: rule.tags,
}));
const POULTRY_SOURCE_TERMS_COMPACT = POULTRY_SOURCE_TERMS.map((rule) => ({
  source: rule.source,
  terms: rule.terms.map(compact),
}));
const BROAD_POULTRY_TERMS = ['가금', 'poultry'].map(compact);

/**
 * 라벨 단위 파생값 캐시.
 *
 * 같은 원료명·알레르기명이 제품 수천 건에 걸쳐 반복 조회되므로, 라벨당 한 번만 계산한다.
 * 입력이 같으면 결과도 같은 순수 함수들이라 캐시가 판정을 바꾸지 않는다.
 */
const familyTagsCache = new Map<string, string[]>();
const poultrySourceCache = new Map<string, PoultrySourceFamily | null>();
const broadPoultryCache = new Map<string, boolean>();

function familyTagsFromLabel(label: string): string[] {
  const key = compact(label);
  if (!key) return [];
  const cached = familyTagsCache.get(key);
  if (cached) return cached;

  const tags = new Set<string>();
  for (const rule of FAMILY_RULES_COMPACT) {
    if (rule.terms.some((term) => key.includes(term))) addAll(tags, rule.tags);
  }
  const result = [...tags];
  familyTagsCache.set(key, result);
  return result;
}

function poultrySourceFromLabel(label: string): PoultrySourceFamily | null {
  const key = compact(label);
  const cached = poultrySourceCache.get(key);
  if (cached !== undefined) return cached;

  const source = computePoultrySourceFromLabel(key);
  poultrySourceCache.set(key, source);
  return source;
}

function computePoultrySourceFromLabel(key: string): PoultrySourceFamily | null {
  for (const rule of POULTRY_SOURCE_TERMS_COMPACT) {
    if (rule.terms.some((term) => key.includes(term))) return rule.source;
  }

  // dictionaryMatches 는 정규화된 키로 조회하므로 원본 라벨 대신 키를 그대로 넘긴다.
  const dictionaryTags = dictionaryMatches(key).flatMap((entry) => entry.allergenTags.map(compact));
  if (dictionaryTags.includes('chicken')) return 'chicken';
  if (dictionaryTags.includes('duck')) return 'duck';
  if (dictionaryTags.includes('turkey')) return 'turkey';
  return null;
}

function isBroadPoultryLabel(label: string): boolean {
  const key = compact(label);
  const cached = broadPoultryCache.get(key);
  if (cached !== undefined) return cached;

  const broad = Boolean(key) && !poultrySourceFromLabel(key)
    && BROAD_POULTRY_TERMS.some((term) => key.includes(term));
  broadPoultryCache.set(key, broad);
  return broad;
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
