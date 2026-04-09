import type { Product } from '../types';

function buildCoupangQuery(product: Product) {
  return `${product.brand} ${product.name}`.trim();
}

export function getCoupangSearchUrl(product: Product) {
  const query = encodeURIComponent(buildCoupangQuery(product));
  return `https://www.coupang.com/np/search?component=&q=${query}`;
}

export function getCoupangAppIntentUrl(product: Product) {
  const query = encodeURIComponent(buildCoupangQuery(product));
  const webUrl = getCoupangSearchUrl(product);
  return `intent://www.coupang.com/np/search?component=&q=${query}#Intent;scheme=https;package=com.coupang.mobile;S.browser_fallback_url=${encodeURIComponent(webUrl)};end`;
}

export function openCoupangForProduct(product: Product) {
  const isAndroid = /Android/i.test(window.navigator.userAgent);
  const targetUrl = isAndroid ? getCoupangAppIntentUrl(product) : getCoupangSearchUrl(product);
  window.location.href = targetUrl;
}
