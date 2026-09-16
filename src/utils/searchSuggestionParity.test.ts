import { describe, expect, it } from 'vitest';
import { buildSearchSuggestions, ingredientsUsedBy } from './searchSuggestions';
import { productsForPetFilter } from './searchKeywords';
import type { Product } from '../types';

/**
 * "검색창에는 결과가 있는 것처럼 보이는데 결과 화면은 비어 있다"를 막는다.
 *
 * 결과 조회는 종 필터를 함께 걸기 때문에, 제안을 전체 목록에서 뽑으면
 * 고양이 보호자에게 강아지 전용 제품이 제안되고 눌렀을 때 0건이 된다.
 */
function product(name: string, petType: 'dog' | 'cat' | 'all', ingredients: string[] = []): Product {
  return {
    id: `id-${name}`,
    name,
    brand: '테스트브랜드',
    imageUrl: '',
    targetPetType: petType,
    ingredients: ingredients.map((nameKo, index) => ({
      id: `ing-${index}`,
      nameKo,
      nameEn: '',
      purpose: '',
      riskLevel: 'safe' as const,
    })),
    reviewsCount: 0,
    averageRating: 0,
  } as unknown as Product;
}

describe('검색 제안과 결과의 조건 일치', () => {
  const catalog = [
    product('강아지 연어 사료', 'dog', ['연어', '닭고기']),
    product('고양이 참치 사료', 'cat', ['참치']),
    product('전연령 공용 간식', 'all', ['고구마']),
  ];
  const dictionary = [
    { id: '1', name_ko: '연어', risk_level: 'safe' },
    { id: '2', name_ko: '참치', risk_level: 'safe' },
    { id: '3', name_ko: '고구마', risk_level: 'safe' },
    { id: '4', name_ko: '자일리톨', risk_level: 'danger' },
  ];

  it('고양이 필터에서 강아지 전용 제품을 제안하지 않는다', () => {
    const scoped = productsForPetFilter(catalog, 'cat');
    const suggestions = buildSearchSuggestions('사료', scoped, []);
    expect(suggestions.some((s) => s.label === '강아지 연어 사료')).toBe(false);
    expect(suggestions.some((s) => s.label === '고양이 참치 사료')).toBe(true);
  });

  it('공용(all) 제품은 종 필터에서도 남는다', () => {
    const scoped = productsForPetFilter(catalog, 'cat');
    expect(buildSearchSuggestions('간식', scoped, []).some((s) => s.label === '전연령 공용 간식')).toBe(true);
  });

  it('필터에서 빠진 제품에만 있는 성분은 제안하지 않는다', () => {
    // '연어'는 강아지 전용 제품에만 있다 — 고양이 보호자에게 제안하면 0건이 된다.
    const scoped = productsForPetFilter(catalog, 'cat');
    const usable = ingredientsUsedBy(scoped, dictionary);
    expect(usable.map((i) => i.name_ko)).not.toContain('연어');
    expect(usable.map((i) => i.name_ko)).toContain('참치');
  });

  it('어떤 제품도 쓰지 않는 사전 성분은 제안하지 않는다', () => {
    // 자일리톨은 위험 성분으로 사전에 있지만 연결된 제품이 없다.
    const usable = ingredientsUsedBy(catalog, dictionary);
    expect(usable.map((i) => i.name_ko)).not.toContain('자일리톨');
  });

  it('종 필터가 없으면 전체를 그대로 쓴다', () => {
    const scoped = productsForPetFilter(catalog, '');
    expect(scoped).toHaveLength(3);
    expect(ingredientsUsedBy(scoped, dictionary).map((i) => i.name_ko)).toEqual(
      expect.arrayContaining(['연어', '참치', '고구마']),
    );
  });

  it('제품이 하나도 없으면 성분 제안도 없다', () => {
    expect(ingredientsUsedBy([], dictionary)).toEqual([]);
  });
});
