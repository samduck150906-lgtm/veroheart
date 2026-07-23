import { describe, expect, it } from 'vitest';
import type { Product } from '../types';
import { isSafeExternalUrl, resolveProductPurchase } from './productLinks';

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    brand: '브랜드',
    name: '연어 사료',
    category: 'food',
    price: 30000,
    imageUrl: '',
    ingredients: [],
    reviewsCount: 0,
    averageRating: 0,
    ...overrides,
  };
}

describe('isSafeExternalUrl', () => {
  it('http(s)만 허용하고 위험 스킴은 차단한다', () => {
    expect(isSafeExternalUrl('https://www.coupang.com/x')).toBe(true);
    expect(isSafeExternalUrl('http://example.com')).toBe(true);
    expect(isSafeExternalUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeExternalUrl('data:text/html,x')).toBe(false);
    expect(isSafeExternalUrl('')).toBe(false);
    expect(isSafeExternalUrl(null)).toBe(false);
  });
});

describe('resolveProductPurchase', () => {
  it('검증된 제휴 링크가 있으면 직행 "구매"로 처리한다', () => {
    const r = resolveProductPurchase(product({ coupangLink: 'https://coupa.ng/abcd' }));
    expect(r.kind).toBe('affiliate');
    expect(r.isDirect).toBe(true);
    expect(r.url).toBe('https://coupa.ng/abcd');
  });

  it('위험/비쿠팡 링크는 무시하고 검색으로 폴백한다', () => {
    const bad = resolveProductPurchase(product({ coupangLink: 'javascript:alert(1)' }));
    expect(bad.kind).toBe('search');
    expect(bad.isDirect).toBe(false);

    const nonCoupang = resolveProductPurchase(product({ coupangLink: 'https://evil.example.com/x' }));
    expect(nonCoupang.kind).toBe('search');
  });

  it('제휴 링크가 없고 상품ID가 있으면 상품 페이지로 직행한다', () => {
    const r = resolveProductPurchase(product({ coupangProductId: '12345' }));
    expect(r.kind).toBe('product');
    expect(r.isDirect).toBe(true);
    expect(r.url).toContain('/vp/products/12345');
  });

  it('아무 링크도 없으면 검색 폴백 + "판매처 검색" 문구(구매로 오인 금지)', () => {
    const r = resolveProductPurchase(product());
    expect(r.kind).toBe('search');
    expect(r.isDirect).toBe(false);
    expect(r.ctaLabel).toBe('판매처 검색');
    expect(r.url).toContain('/np/search');
  });

  it('서로 다른 상품은 서로 다른 검색 URL을 만든다', () => {
    const a = resolveProductPurchase(product({ id: 'a', name: '연어 사료' }));
    const b = resolveProductPurchase(product({ id: 'b', name: '닭고기 간식' }));
    expect(a.url).not.toBe(b.url);
  });

  it('직행 링크의 문구는 검색 폴백 문구와 다르다', () => {
    const direct = resolveProductPurchase(product({ coupangLink: 'https://coupa.ng/x' }));
    const search = resolveProductPurchase(product());
    expect(direct.ctaLabel).not.toBe(search.ctaLabel);
  });
});
