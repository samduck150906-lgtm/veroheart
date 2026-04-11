import type { Product } from '../types';

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

/** 파트너스 링크가 있으면 그 URL을 우선 사용 */
export function getCoupangLandingUrl(product: Product): string {
  const link = product.coupangLink?.trim();
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
  /* 파트너스 단축 URL은 앱 intent 대신 브라우저 직행이 안전 */
  if (product.coupangLink?.trim()) {
    window.location.href = landing;
    return;
  }
  const isAndroid = /Android/i.test(window.navigator.userAgent);
  window.location.href = isAndroid ? getCoupangAppIntentUrl(product) : landing;
}
