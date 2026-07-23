// 구매 링크 결정 단일 소스.
// 상품마다 실제 등록된 판매 링크가 있을 때만 "구매" CTA 로 취급하고,
// 링크가 없어 검색으로 폴백할 때는 "판매처 검색"으로 명확히 구분한다.
// javascript:/data: 등 위험 프로토콜은 차단한다.

import type { Product } from '../types';
import { isValidCoupangLink } from './coupangLink';

export type PurchaseKind = 'affiliate' | 'product' | 'search' | 'none';

export interface ProductPurchase {
  kind: PurchaseKind;
  /** 실제로 열 URL. kind==='none' 이면 null */
  url: string | null;
  /** 개별 상품 판매 페이지로 직행하는가(=진짜 "구매"). false 면 검색 폴백 */
  isDirect: boolean;
  /** CTA 문구 — 직행이면 "구매", 검색 폴백이면 "판매처 검색" */
  ctaLabel: string;
  /** 제휴 링크 고지 필요 여부 */
  affiliate: boolean;
}

/** http(s) 스킴에 한해 허용. javascript:/data:/vbscript: 등 차단 */
export function isSafeExternalUrl(raw: string | null | undefined): boolean {
  const url = (raw ?? '').trim();
  if (!url) return false;
  try {
    const scheme = new URL(url).protocol.toLowerCase();
    return scheme === 'https:' || scheme === 'http:';
  } catch {
    return false;
  }
}

function buildCoupangQuery(product: Pick<Product, 'brand' | 'name'>) {
  return `${product.brand ?? ''} ${product.name ?? ''}`.trim();
}

function getCoupangSearchUrl(product: Pick<Product, 'brand' | 'name'>) {
  return `https://www.coupang.com/np/search?component=&q=${encodeURIComponent(buildCoupangQuery(product))}`;
}

/**
 * 상품 구매 링크를 우선순위로 결정한다.
 *  1) 검증된 상품별 제휴 링크(coupangLink) → 직행 "구매"
 *  2) 상품 ID 기반 상품 페이지(coupangProductId) → 직행 "구매"
 *  3) 제품명 기반 검색 결과 → "판매처 검색"(구매로 오인 금지)
 * 위험/유효하지 않은 링크는 무시하고 다음 우선순위로 폴백한다.
 */
export function resolveProductPurchase(product: Product): ProductPurchase {
  const rawLink = product.coupangLink?.trim();
  // isValidCoupangLink 는 빈 문자열을 true 로 보므로, 값이 있고 + 안전 + 쿠팡 도메인일 때만 채택
  if (rawLink && isSafeExternalUrl(rawLink) && isValidCoupangLink(rawLink)) {
    return { kind: 'affiliate', url: rawLink, isDirect: true, ctaLabel: '최저가 보러가기', affiliate: true };
  }

  const productId = product.coupangProductId?.trim();
  if (productId) {
    return {
      kind: 'product',
      url: `https://www.coupang.com/vp/products/${encodeURIComponent(productId)}`,
      isDirect: true,
      ctaLabel: '판매처에서 보기',
      affiliate: true,
    };
  }

  // 폴백: 검색. "구매하기"가 아니라 "판매처 검색"으로 표시해야 한다.
  return {
    kind: 'search',
    url: getCoupangSearchUrl(product),
    isDirect: false,
    ctaLabel: '판매처 검색',
    affiliate: true,
  };
}
