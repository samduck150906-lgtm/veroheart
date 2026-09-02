import type { Product } from '../types';

/**
 * 탐색 화면의 추천 키워드.
 *
 * 예전에는 키워드를 `product_health_concerns` 태그 필터로 이었다. 코드 자체는 맞지만
 * 운영 DB 에서 이 컬럼이 채워진 제품이 0건이라(제품 458개 전부 비어 있음) 어떤 키워드를
 * 눌러도 결과가 0건이었다. 태그 배열이 비어 있으면 overlaps 조건이 전부 탈락시키기 때문이다.
 *
 * 그래서 키워드를 실제로 값이 들어 있는 데이터(제품명·브랜드명·원료명)로 잇고,
 * 결과가 하나도 없는 키워드는 아예 보여주지 않는다. 없는 결과를 만들어내지 않으면서
 * "눌렀는데 0건" 을 없애는 방법이다.
 *
 * 태그 데이터가 채워지면 태그 필터로 되돌리는 편이 더 정확하다. 그때까지의 조치다.
 */
export const SYMPTOM_KEYWORDS = [
  '눈물',
  '알러지',
  '다이어트',
  '관절',
  '피부',
  '노령',
  '치석',
  '소화',
] as const;

function contains(haystack: string | null | undefined, needle: string): boolean {
  if (!haystack) return false;
  return haystack.toLowerCase().includes(needle);
}

/**
 * 키워드가 이 제품에 걸리는지 — 검색(searchProducts)이 훑는 범위와 같은 기준으로 본다.
 * 제품명 / 브랜드명 / 원료명(국문·영문).
 */
export function productMatchesKeyword(product: Product, keyword: string): boolean {
  const needle = keyword.trim().toLowerCase();
  if (!needle) return false;

  if (contains(product.name, needle) || contains(product.brand, needle)) return true;
  return (product.ingredients ?? []).some(
    (ingredient) => contains(ingredient.nameKo, needle) || contains(ingredient.nameEn, needle),
  );
}

export function countKeywordMatches(products: Product[], keyword: string): number {
  return products.reduce((count, product) => count + (productMatchesKeyword(product, keyword) ? 1 : 0), 0);
}

/**
 * 실제로 결과가 있는 키워드만 남긴다.
 *
 * 제품 목록이 아직 안 실렸을 때(첫 진입 직후)는 전부 보여준다. 로딩 때문에 칩이
 * 사라졌다가 나타나면 오히려 더 어색하다.
 */
export function visibleSymptomKeywords(
  products: Product[],
  keywords: readonly string[] = SYMPTOM_KEYWORDS,
): string[] {
  if (products.length === 0) return [...keywords];
  return keywords.filter((keyword) => countKeywordMatches(products, keyword) > 0);
}

/**
 * 지금 걸려 있는 종 필터를 적용한 뒤 남는 제품.
 *
 * 칩을 누르면 검색이 종 필터(프로필 기준 기본값)까지 함께 걸기 때문에, 필터를 무시하고
 * 칩을 계산하면 "칩은 보이는데 눌러 보니 0건" 이 다시 생긴다. 실제로 강아지 프로필에서
 * '소화' 칩이 그렇게 떴다.
 */
export function productsForPetFilter(
  products: Product[],
  targetPetType: '' | 'dog' | 'cat' | 'all',
): Product[] {
  if (!targetPetType) return products;
  if (targetPetType === 'all') return products.filter((p) => p.targetPetType === 'all');
  return products.filter((p) => p.targetPetType === targetPetType || p.targetPetType === 'all');
}
