import type { Product } from '../types';
import { isValidCoupangLink } from './coupangLink';
import { isSafeExternalUrl } from './productLinks';

/** 안전(https)하고 쿠팡 도메인인 검증된 제휴 링크만 반환. 아니면 null */
function safeCoupangLink(product: Product): string | null {
  const link = product.coupangLink?.trim();
  if (link && isSafeExternalUrl(link) && isValidCoupangLink(link)) return link;
  return null;
}

function buildCoupangQuery(product: Product) {
  return `${product.brand} ${product.name}`.trim();
}

export function getCoupangSearchUrl(product: Product) {
  const query = encodeURIComponent(buildCoupangQuery(product));
  return `https://www.coupang.com/np/search?component=&q=${query}`;
}

export function getCoupangProductUrl(productId: string) {
  return `https://www.coupang.com/vp/products/${encodeURIComponent(productId)}`;
}

/** 검증된 파트너스 링크가 있으면 우선 사용, 없으면 상품ID → 검색 순으로 폴백 */
export function getCoupangLandingUrl(product: Product): string {
  const link = safeCoupangLink(product);
  if (link) return link;
  if (product.coupangProductId) return getCoupangProductUrl(product.coupangProductId);
  return getCoupangSearchUrl(product);
}

export function getCoupangAppIntentUrl(product: Product) {
  const webUrl = getCoupangLandingUrl(product);
  const intentPath = product.coupangProductId
    ? `www.coupang.com/vp/products/${encodeURIComponent(product.coupangProductId)}`
    : `www.coupang.com/np/search?component=&q=${encodeURIComponent(buildCoupangQuery(product))}`;
  return `intent://${intentPath}#Intent;scheme=https;package=com.coupang.mobile;S.browser_fallback_url=${encodeURIComponent(webUrl)};end`;
}

export function openCoupangForProduct(product: Product) {
  const landing = getCoupangLandingUrl(product);
  /* 검증된 파트너스 단축 URL은 앱 intent 대신 브라우저 직행이 안전 */
  if (safeCoupangLink(product)) {
    window.location.href = landing;
    return;
  }
  const isAndroid = /Android/i.test(window.navigator.userAgent);
  window.location.href = isAndroid ? getCoupangAppIntentUrl(product) : landing;
}
