import { describe, expect, it } from 'vitest';
import { isSourceLabelBrand, resolveBrandLabel } from './productDisplay';

/**
 * 운영 DB 의 제품 458개는 brand_name 이 전부 '쿠팡검색'(438) 또는 '쿠팡상품'(20)이다.
 * 대량 임포트가 수집 출처를 브랜드 자리에 넣은 값이라, 화면에 그대로 내보내면
 * 모든 제품의 브랜드가 '쿠팡검색' 으로 보인다.
 */
describe('브랜드 표시', () => {
  it('수집 출처 라벨은 브랜드로 쓰지 않는다', () => {
    for (const brand of ['쿠팡검색', '쿠팡상품', '쿠팡', 'Coupang', ' 쿠팡검색 ']) {
      expect(resolveBrandLabel({ brand }), brand).toBe('');
      expect(isSourceLabelBrand(brand), brand).toBe(true);
    }
  });

  it('진짜 브랜드는 그대로 쓴다', () => {
    expect(resolveBrandLabel({ brand: '로얄캐닌' })).toBe('로얄캐닌');
    expect(isSourceLabelBrand('로얄캐닌')).toBe(false);
  });

  it('브랜드가 없으면 빈 문자열', () => {
    expect(resolveBrandLabel({})).toBe('');
    expect(resolveBrandLabel({ brand: '   ' })).toBe('');
    expect(isSourceLabelBrand(null)).toBe(false);
    expect(isSourceLabelBrand('')).toBe(false);
  });
});
