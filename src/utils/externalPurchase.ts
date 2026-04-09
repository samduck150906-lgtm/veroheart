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

export function getCoupangAppIntentUrl(product: Product) {
  const webUrl = product.coupangProductId ? getCoupangProductUrl(product.coupangProductId) : getCoupangSearchUrl(product);
  const intentPath = product.coupangProductId
    ? `www.coupang.com/vp/products/${encodeURIComponent(product.coupangProductId)}`
    : `www.coupang.com/np/search?component=&q=${encodeURIComponent(buildCoupangQuery(product))}`;
  return `intent://${intentPath}#Intent;scheme=https;package=com.coupang.mobile;S.browser_fallback_url=${encodeURIComponent(webUrl)};end`;
}

export function openCoupangForProduct(product: Product) {
  const isAndroid = /Android/i.test(window.navigator.userAgent);
  const targetUrl = isAndroid
    ? getCoupangAppIntentUrl(product)
    : (product.coupangProductId ? getCoupangProductUrl(product.coupangProductId) : getCoupangSearchUrl(product));
  window.location.href = targetUrl;
}
