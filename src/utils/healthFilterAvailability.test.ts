import { describe, expect, it } from 'vitest';
import type { Product } from '../types';
import { isHealthFilterAvailable } from './healthFilterAvailability';

function products(count: number, tagged: number): Product[] {
  return Array.from({ length: count }, (_, index) => ({
    id: String(index), brand: '브랜드', name: `제품 ${index}`, category: '사료', imageUrl: '',
    ingredients: [], reviewsCount: 0, averageRating: 0,
    healthConcerns: index < tagged ? ['관절'] : [],
  }));
}

describe('건강고민 필터 데이터 coverage gate', () => {
  it('태그가 모두 비어 있으면 필터를 숨긴다', () => {
    expect(isHealthFilterAvailable(products(458, 0))).toBe(false);
  });

  it('최소 모집단의 70% 이상이 태깅되면 연다', () => {
    expect(isHealthFilterAvailable(products(10, 7))).toBe(true);
  });
});
