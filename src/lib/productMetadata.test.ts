import { describe, expect, it } from 'vitest';
import { buildProductMetadata, buildProductPath } from './productMetadata';

describe('product metadata', () => {
  it('builds a stable encoded path from product ID and database slug', () => {
    expect(buildProductPath('11111111-1111-1111-1111-111111111111', '연어 & 오리')).toBe(
      '/product/11111111-1111-1111-1111-111111111111/%EC%97%B0%EC%96%B4%20%26%20%EC%98%A4%EB%A6%AC',
    );
  });

  it('uses clean public facts only and hides a retailer source label', () => {
    const metadata = buildProductMetadata({
      id: '11111111-1111-1111-1111-111111111111',
      name: '쿠팡 원문 무료배송',
      displayName: '오리지널 독',
      brand: '쿠팡검색',
      slug: '오리지널-독',
      imageUrl: 'https://images.example/product.jpg',
    }, 'https://veroro.example');

    expect(metadata.title).toBe('오리지널 독 | 베로로');
    expect(metadata.canonicalUrl).toBe(
      'https://veroro.example/product/11111111-1111-1111-1111-111111111111/%EC%98%A4%EB%A6%AC%EC%A7%80%EB%84%90-%EB%8F%85',
    );
    expect(metadata.jsonLd).not.toHaveProperty('offers');
    expect(metadata.jsonLd).not.toHaveProperty('aggregateRating');
    expect(JSON.stringify(metadata.jsonLd)).not.toContain('쿠팡검색');
    expect(JSON.stringify(metadata.jsonLd)).not.toContain('무료배송');
  });
});
