import type { Product } from '../types';

/** 한글 종 라벨 → DB target_pet_type 값 (전체=필터 없음) */
export const SPECIES_LABEL_TO_PET_TYPE: Record<string, 'dog' | 'cat' | null> = {
  전체: null,
  강아지: 'dog',
  고양이: 'cat',
};

/**
 * 종 필터 매칭.
 * - '전체' → 모두 통과
 * - target_pet_type 미지정 상품도 통과(빈 랭킹 방지)
 * - 그 외엔 선택 종 또는 공용(all)만 통과
 *
 * (버그였던 부분: 한글 라벨 '강아지'를 DB의 'dog'와 직접 ===비교해 한 건도 매칭되지 않았음)
 */
export function matchesSpecies(product: Product, speciesLabel: string): boolean {
  const petType = SPECIES_LABEL_TO_PET_TYPE[speciesLabel] ?? null;
  if (!petType) return true;
  if (!product.targetPetType) return true;
  return product.targetPetType === petType || product.targetPetType === 'all';
}

/**
 * 카테고리 필터 매칭.
 * 카테고리 칩('사료' 등)은 main_category 값과 매칭됨.
 * product.category(product_type, 예: 'food')와는 다르므로 둘 다 + 상품명까지 확인.
 */
export function matchesCategory(product: Product, categoryLabel: string): boolean {
  if (!categoryLabel || categoryLabel === '전체') return true;
  return (
    product.mainCategory === categoryLabel ||
    product.category === categoryLabel ||
    (product.name || '').includes(categoryLabel)
  );
}
