import { describe, it, expect } from 'vitest';
import { buildSearchSuggestions, deriveBrandOptions } from './searchSuggestions';

const products = [
  { name: '로얄캐닌 미니 인도어 어덜트', brand: '로얄캐닌' },
  { name: '로얄캐닌 어번 라이프', brand: '로얄캐닌' },
  { name: '오리젠 오리지널 도그', brand: '오리젠' },
  { name: '지위픽 에어드라이 비프', brand: '지위픽' },
];

const ingredients = [
  { name_ko: '닭고기', risk_level: 'safe' },
  { name_ko: '글루코사민', risk_level: 'safe' },
  { name_ko: 'BHA', risk_level: 'danger' },
];

describe('buildSearchSuggestions', () => {
  it('빈 입력이면 빈 배열을 반환한다', () => {
    expect(buildSearchSuggestions('', products, ingredients)).toEqual([]);
    expect(buildSearchSuggestions('   ', products, ingredients)).toEqual([]);
  });

  it('브랜드·제품·성분을 종류별로 모아 제안한다', () => {
    const s = buildSearchSuggestions('로얄', products, ingredients);
    expect(s.some((x) => x.kind === 'brand' && x.label === '로얄캐닌')).toBe(true);
    expect(s.some((x) => x.kind === 'product' && x.label.includes('로얄캐닌'))).toBe(true);
    // 브랜드가 제품보다 앞선다
    expect(s[0].kind).toBe('brand');
  });

  it('성분명도 위험도와 함께 제안한다', () => {
    const s = buildSearchSuggestions('글루', products, ingredients);
    const ing = s.find((x) => x.kind === 'ingredient');
    expect(ing?.label).toBe('글루코사민');
    expect(ing?.risk).toBe('safe');
  });

  it('접두 일치를 부분 일치보다 우선한다', () => {
    const items = [{ name: '가나다', brand: '무관' }, { name: '리브가나', brand: '무관2' }];
    const s = buildSearchSuggestions('가나', items, []);
    const prodLabels = s.filter((x) => x.kind === 'product').map((x) => x.label);
    expect(prodLabels[0]).toBe('가나다'); // 접두 일치가 먼저
  });

  it('limit을 초과하지 않는다', () => {
    expect(buildSearchSuggestions('로', products, ingredients, 2).length).toBeLessThanOrEqual(2);
  });

  it('대소문자를 구분하지 않는다', () => {
    const s = buildSearchSuggestions('bha', products, ingredients);
    expect(s.some((x) => x.kind === 'ingredient' && x.label === 'BHA')).toBe(true);
  });
});

describe('deriveBrandOptions', () => {
  it('제품 수가 많은 브랜드 순으로 정렬한다', () => {
    const opts = deriveBrandOptions(products);
    expect(opts[0]).toBe('로얄캐닌'); // 2건으로 최다
    expect(opts).toContain('오리젠');
    expect(opts).toContain('지위픽');
  });

  it('limit으로 개수를 제한한다', () => {
    expect(deriveBrandOptions(products, 1)).toEqual(['로얄캐닌']);
  });
});
