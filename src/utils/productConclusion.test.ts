import { describe, expect, it } from 'vitest';
import { buildProductConclusion } from './productConclusion';
import type { AnalysisReport } from './analysis';
import type { Ingredient, Product, UserPetProfile } from '../types';

function ing(nameKo: string): Ingredient {
  return { id: nameKo, nameKo, nameEn: '', purpose: '', riskLevel: 'safe' };
}

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1', brand: '브랜드', name: '연어 사료', category: 'food',
    targetPetType: 'dog', price: 30000, imageUrl: '',
    ingredients: [ing('연어'), ing('현미')],
    reviewsCount: 0, averageRating: 0,
    ...overrides,
  };
}

const dog: UserPetProfile = { id: 'u1', name: '코코', species: 'Dog', age: 4, healthConcerns: [], allergies: [] };

function report(score: number, summary = ''): AnalysisReport {
  return { score, summary } as unknown as AnalysisReport;
}

describe('buildProductConclusion — 판정 우선순위(§6)', () => {
  it('알레르기 위험이 있으면 기본 점수가 높아도 메인 결론은 경고(alert)', () => {
    const c = buildProductConclusion(
      product({ ingredients: [ing('닭고기')] }),
      { ...dog, allergies: ['닭'] },
      report(95),
    );
    expect(c.tone).toBe('alert');
    expect(c.headline).toContain('맞지 않을 수 있어요');
  });

  it('종이 다르면(고양이용을 강아지가) 확인 경고를 우선한다', () => {
    const c = buildProductConclusion(product({ targetPetType: 'cat' }), dog, report(90));
    expect(c.tone).toBe('caution');
    expect(c.headline).toContain('강아지');
    expect(c.subline).toContain('고양이용');
  });

  it("targetPetType이 'all'이면 종 경고를 내지 않는다", () => {
    const c = buildProductConclusion(product({ targetPetType: 'all' }), dog, report(88));
    expect(c.tone).toBe('match');
  });

  it('원재료·보장성분이 모두 없으면 점수(0%)로 단정하지 않고 데이터 부족으로 안내', () => {
    const c = buildProductConclusion(
      product({ ingredients: [], guaranteedAnalysis: undefined }),
      dog,
      report(0),
    );
    expect(c.headline).toContain('판정하기 어려워요');
    expect(c.subline).toContain('정보가 부족');
    expect(c.headline).not.toContain('0%');
  });

  it('보장성분만 있어도(원재료 없음) 데이터 부족으로 처리하지 않는다', () => {
    const c = buildProductConclusion(
      product({ ingredients: [], guaranteedAnalysis: { crudeProtein: 30, crudeFat: 15, moisture: 10 } }),
      dog,
      report(82),
    );
    expect(c.headline).not.toContain('판정하기 어려워요');
  });

  it('위험/부적합/데이터부족이 없으면 점수 기반 결론(매칭/보통/신중)', () => {
    expect(buildProductConclusion(product(), dog, report(85)).tone).toBe('match');
    expect(buildProductConclusion(product(), dog, report(60)).tone).toBe('caution');
    expect(buildProductConclusion(product(), dog, report(30)).tone).toBe('caution');
  });
});
