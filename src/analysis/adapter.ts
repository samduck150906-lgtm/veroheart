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

export function toPetProfile(profile: UserPetProfile): PetProfile {
  return {
    species: toEngineSpecies(profile.species),
    allergies: toAllergenTags(profile.allergies ?? []),
    diseases: profile.healthConcerns ?? [],
    name: profile.name,
  };
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
  };
}

/** 제품의 성분 객체 배열에서 원료명 문자열만 순서대로 뽑는다. */
export function toIngredientNames(product: Product): string[] {
  return (product.ingredients ?? []).map((i) => i.nameKo).filter(Boolean);
}
