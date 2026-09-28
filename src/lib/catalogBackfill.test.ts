import { describe, expect, it } from 'vitest';
import { buildCatalogBackfillCandidate, slugifyProductName } from './catalogBackfill';

describe('catalog cleanup backfill candidates', () => {
  it('keeps the raw source title as an alias and proposes clean public identity fields', () => {
    const rawName = '쿠팡브랜드 연어 전연령 피부 사료 3kg 참치맛 2팩 무료배송 로켓배송';
    const result = buildCatalogBackfillCandidate({
      id: 'product-1',
      name: rawName,
      brand_name: '쿠팡검색',
      manufacturer_name: '쿠팡브랜드 제조원',
      pet_type: 'dog',
    });

    expect(result).toMatchObject({
      productId: 'product-1',
      rawAlias: rawName,
      displayName: '쿠팡브랜드 연어 전연령 피부 사료 3kg 참치맛',
      brandName: '쿠팡브랜드',
      slug: '쿠팡브랜드-연어-전연령-피부-사료-3kg-참치맛',
      needsReview: false,
    });
    expect(result.canonicalProductKey).toContain('쿠팡브랜드제조원|쿠팡브랜드');
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it('requires review when a source-label brand cannot be extracted safely', () => {
    const result = buildCatalogBackfillCandidate({
      id: 'product-2',
      name: '12개 무료배송',
      brand_name: '쿠팡상품',
    });

    expect(result.needsReview).toBe(true);
    expect(result.brandName).toBe('쿠팡상품');
    expect(result.canonicalProductKey).toBeNull();
  });

  it('creates stable, bounded slugs from Korean and Latin text', () => {
    expect(slugifyProductName('  ORIJEN 오리지널 캣 (5.4kg)  ')).toBe('orijen-오리지널-캣-5-4kg');
    expect(slugifyProductName('가'.repeat(100))).toHaveLength(80);
  });
});
