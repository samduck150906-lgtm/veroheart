/**
 * 내부/수집 단계에서 채워진 플레이스홀더 브랜드명을 사용자에게 노출하지 않도록 정리한다.
 * (예: 쿠팡 크롤러가 brand="쿠팡상품" / "쿠팡 파트너스" 등으로 적재한 값)
 */

const PLACEHOLDER_BRANDS = new Set([
  '쿠팡상품',
  '쿠팡 상품',
  '쿠팡검색',
  '쿠팡 검색',
  '쿠팡파트너스',
  '쿠팡 파트너스',
  '쿠팡',
  'coupang',
  'coupang product',
  '기타',
  'etc',
  'n/a',
  'na',
  'unknown',
]);

function isPlaceholderBrand(brand: string): boolean {
  return PLACEHOLDER_BRANDS.has(brand.trim().toLowerCase()) || PLACEHOLDER_BRANDS.has(brand.trim());
}

/**
 * 카드/상세에 노출할 브랜드 라벨.
 * - 정상 브랜드명: 그대로
 * - 플레이스홀더(쿠팡상품 등): 상품명 첫 단어를 브랜드 추정값으로 사용, 없으면 ''(미노출)
 */
export function displayBrand(brand?: string | null, name?: string | null): string {
  const b = (brand ?? '').trim();
  if (b && !isPlaceholderBrand(b)) return b;

  // 플레이스홀더거나 비어 있으면 상품명 첫 토큰을 브랜드로 추정
  const firstToken = (name ?? '').trim().split(/[\s,]/)[0]?.trim();
  if (firstToken && firstToken.length >= 2) return firstToken;
  return '';
}

/** 브랜드 라벨이 의미 없는(플레이스홀더/빈) 값인지 — 라인 자체를 숨길지 판단용 */
export function hasMeaningfulBrand(brand?: string | null): boolean {
  const b = (brand ?? '').trim();
  return Boolean(b) && !isPlaceholderBrand(b);
}
