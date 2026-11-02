import { describe, expect, it } from 'vitest';
import { countKeywordMatches, productMatchesKeyword, visibleSymptomKeywords, recommendedSearchKeywords } from './searchKeywords';
import type { Product } from '../types';

function product(over: Partial<Product> = {}): Product {
  return {
    id: 'p1', name: '제품', brand: '브랜드', category: 'food',
    imageUrl: '', ingredients: [], reviewsCount: 0, averageRating: 0,
    verificationStatus: 'pending',
    ...over,
  } as Product;
}

const withIngredient = (nameKo: string, nameEn = '') =>
  product({ ingredients: [{ id: 'i', nameKo, nameEn, purpose: '', riskLevel: 'safe' }] });

describe('추천 키워드', () => {
  it('제품명으로 걸린다', () => {
    expect(productMatchesKeyword(product({ name: '관절 케어 사료' }), '관절')).toBe(true);
  });

  it('원료명으로도 걸린다 — 제품명에 없어도 된다', () => {
    // 운영 데이터: '귀리'는 제품명 일치 0건이지만 원료로는 43개 제품에 들어 있다.
    const p = withIngredient('유기농 귀리');
    expect(productMatchesKeyword(p, '귀리')).toBe(true);
    expect(productMatchesKeyword(p, '닭')).toBe(false);
  });

  it('영문 원료명도 본다', () => {
    expect(productMatchesKeyword(withIngredient('닭고기', 'Chicken'), 'chicken')).toBe(true);
  });

  it('브랜드명으로도 걸린다', () => {
    expect(productMatchesKeyword(product({ brand: '관절헬스' }), '관절')).toBe(true);
  });

  it('빈 키워드는 아무것도 매칭하지 않는다', () => {
    expect(productMatchesKeyword(product({ name: '무엇이든' }), '   ')).toBe(false);
  });

  it('결과가 0건인 키워드는 노출하지 않는다', () => {
    // 눌렀는데 "검색 결과 없음"이 뜨는 칩을 없애는 것이 이 함수의 목적이다.
    const products = [product({ name: '관절 케어' }), withIngredient('연어')];
    const shown = visibleSymptomKeywords(products, ['관절', '연어', '치석']);
    expect(shown).toEqual(['관절', '연어']);
    expect(countKeywordMatches(products, '치석')).toBe(0);
  });

  it('does not advertise unsupported health keywords before any catalog is loaded', () => {
    expect(visibleSymptomKeywords([], ['관절', '치석'])).toEqual([]);
  });

  it('fills sparse health suggestions with real searchable brands and product names', () => {
    const catalog = [product({ name: '제품 원문', displayName: '연어 레시피', brand: '브랜드 A' }), product({ id: 'p2', name: '시니어 레시피', brand: '브랜드 B' })];
    expect(recommendedSearchKeywords(catalog)).toEqual(['브랜드 A', '브랜드 B', '연어 레시피', '시니어 레시피']);
    expect(recommendedSearchKeywords([])).toEqual([]);
  });

  it('matches the displayed product name used by search', () => {
    expect(productMatchesKeyword(product({ name: '수집 제품 1', displayName: '관절 케어' }), '관절')).toBe(true);
  });
});
