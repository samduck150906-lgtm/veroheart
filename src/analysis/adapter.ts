/**
 * 앱 도메인 모델 ↔ 분석 엔진 어댑터.
 *
 * 기존 화면(Detail/AnalysisResult)은 Product/UserPetProfile을 쓰고,
 * 엔진은 ProductForAnalysis/PetProfile을 쓴다. 이 모듈이 둘을 잇는다.
 */
import type { Product, UserPetProfile } from '../types';
import type { PetProfile, ProductForAnalysis, ProductType } from './types';
import { findIngredientByName } from './ingredientDictionary';

const TREAT_HINTS = ['간식', '껌', '져키', '저키', '츄', '트릿', '덴탈', '캔', '스낵'];
const SUPPLEMENT_HINTS = ['영양제', '보조제', '서플리먼트', '파우더'];

/** 제품 카테고리/이름으로 완전사료/간식/보충제를 추정한다. */
export function inferProductType(product: Product): ProductType {
  const hay = [product.category, product.mainCategory, product.subCategory, product.name]
    .filter(Boolean)
    .join(' ');
  if (SUPPLEMENT_HINTS.some((h) => hay.includes(h))) return 'supplement';
  if (TREAT_HINTS.some((h) => hay.includes(h))) return 'treat';
  return 'complete_food';
}

/** UserPetProfile.species('Dog'|'Cat') → 엔진 종 */
export function toEngineSpecies(species: UserPetProfile['species']): 'dog' | 'cat' {
  return species === 'Cat' ? 'cat' : 'dog';
}

/**
 * 사용자가 등록한 한국어 알레르기 항목을 사전 allergenTags로 변환한다.
 * 사전에서 못 찾으면 원문 토큰을 그대로 보존(폴백 매칭용).
 */
export function toAllergenTags(allergies: string[]): string[] {
  const tags = new Set<string>();
  for (const a of allergies) {
    const dict = findIngredientByName(a);
    if (dict) {
      dict.allergenTags.forEach((t) => tags.add(t));
    } else {
      tags.add(a.trim());
    }
  }
  return [...tags];
}

function inferLifeStageFromAge(species: 'dog' | 'cat', ageYears: number): 'puppy_kitten' | 'adult' | 'senior' {
  if (species === 'cat') {
    if (ageYears < 1) return 'puppy_kitten';
    if (ageYears < 11) return 'adult';
    return 'senior';
  }
  // dog — conservative estimate (varies by size; default small-medium)
  if (ageYears < 1) return 'puppy_kitten';
  if (ageYears < 7) return 'adult';
  return 'senior';
}

export function toPetProfile(profile: UserPetProfile): PetProfile {
  const species = toEngineSpecies(profile.species);
  const ageYears = profile.age ?? 0;
  return {
    species,
    ageMonths: ageYears * 12,
    lifeStage: inferLifeStageFromAge(species, ageYears),
    allergies: toAllergenTags(profile.allergies ?? []),
    diseases: profile.healthConcerns ?? [],
    name: profile.name,
  };
}

const LIFE_STAGE_MAP: Record<string, import('./types').LifeStage> = {
  puppy: 'puppy_kitten',
  puppy_kitten: 'puppy_kitten',
  kitten: 'puppy_kitten',
  자견: 'puppy_kitten',
  자묘: 'puppy_kitten',
  adult: 'adult',
  성견: 'adult',
  성묘: 'adult',
  senior: 'senior',
  노령: 'senior',
  all: 'all_life_stages',
  all_life_stages: 'all_life_stages',
};

function toLifeStage(stages: string[] | undefined): import('./types').LifeStage {
  if (!stages?.length) return 'unknown';
  const first = stages[0].toLowerCase();
  return LIFE_STAGE_MAP[first] ?? 'unknown';
}

export function toProductForAnalysis(product: Product): ProductForAnalysis {
  return {
    id: product.id,
    brand: product.brand,
    name: product.name,
    species:
      product.targetPetType === 'cat'
        ? 'cat'
        : product.targetPetType === 'dog'
          ? 'dog'
          : 'both',
    productType: inferProductType(product),
    lifeStage: toLifeStage(product.targetLifeStage),
    healthConcerns: product.healthConcerns ?? [],
    guaranteedAnalysis: undefined,
  };
}

/** 제품의 성분 객체 배열에서 원료명 문자열만 순서대로 뽑는다. */
export function toIngredientNames(product: Product): string[] {
  return (product.ingredients ?? []).map((i) => i.nameKo).filter(Boolean);
}

/**
 * 프로필 건강 고민 라벨(Profile 화면의 concernOptions) → 질환 엔진 diseaseId.
 * 매핑되지 않는 항목(예: '면역')은 대응 질환 카테고리가 없어 건너뛴다.
 */
const CONCERN_TO_DISEASE_ID: Record<string, string> = {
  '피부·모질': 'skin',
  관절: 'joint',
  소화기: 'gut',
  '비만·다이어트': 'weight',
  '신장·비뇨기': 'kidney',
  심장: 'heart',
  눈: 'eye',
  구강: 'dental',
};

/** 건강 고민 라벨 배열을 질환 ID 배열로 변환한다(중복 제거, 알 수 없는 항목 제외). */
export function concernsToDiseaseIds(concerns: string[] | undefined): string[] {
  const ids = new Set<string>();
  for (const c of concerns ?? []) {
    const id = CONCERN_TO_DISEASE_ID[c.trim()];
    if (id) ids.add(id);
  }
  return [...ids];
}
