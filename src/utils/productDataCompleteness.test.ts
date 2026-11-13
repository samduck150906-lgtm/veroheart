import { reviewedLabelFixture } from '../test/reviewedLabelFixture';
import { describe, expect, it } from 'vitest';
import { describeIngredientAvailability, describeProductCompleteness, resolveProductCompleteness } from './productDataCompleteness';
import type { Product } from '../types';

function product(over: Partial<Product> = {}): Product {
  return reviewedLabelFixture({
    id: 'p1', name: '제품', brand: '브랜드', category: 'food',
    imageUrl: '', ingredients: [], reviewsCount: 0, averageRating: 0,
    verificationStatus: 'pending',
    ...over,
  } as Product);
}

const oneIngredient = [{ id: 'i', nameKo: '닭고기', nameEn: '', purpose: '', riskLevel: 'safe' as const }];

describe('제품 정보 충실도', () => {
  it('이전 분석 상태가 미준비여도 실제 등록 원료를 누락으로 표시하지 않는다', () => {
    const p = product({ analysisStatus: 'unavailable', ingredients: oneIngredient, ingredientDataLoaded: true });
    expect(describeIngredientAvailability(p).label).toBe('원료 1개 등록');
    expect(describeIngredientAvailability(product({ ...p, ingredients: [] })).label).toBe('원료 등록 필요');
  });
  it('원료와 영양성분이 모두 있으면 full', () => {
    const p = product({ ingredients: oneIngredient, guaranteedAnalysis: { crudeProtein: 26, crudeFat: 10, crudeFiber: 0, crudeAsh: 0, moisture: 10 } });
    expect(resolveProductCompleteness(p)).toBe('full');
    expect(describeProductCompleteness(p).detail).toBe('');
  });
  it('조단백질 하나로 원료·영양 확인 완료 배지를 표시하지 않는다', () => {
    const p = product({ ingredients: oneIngredient, guaranteedAnalysis: { crudeProtein: 26 } });
    expect(resolveProductCompleteness(p)).toBe('partial');
    expect(describeProductCompleteness(p).detail).toContain('영양 균형을 평가할 수 없습니다');
  });

  it('원료만 있으면 partial — 운영 데이터 대부분이 여기 해당한다', () => {
    const p = product({ ingredients: oneIngredient });
    expect(resolveProductCompleteness(p)).toBe('partial');
    expect(describeProductCompleteness(p).label).toContain('일부 정보만');
  });

  it('영양성분 객체가 있어도 값이 비어 있으면 partial 로 본다', () => {
    const p = product({ ingredients: oneIngredient, guaranteedAnalysis: {} });
    expect(resolveProductCompleteness(p)).toBe('partial');
  });

  it('원료가 없으면 minimal', () => {
    expect(resolveProductCompleteness(product())).toBe('minimal');
  });

  it('어떤 경우에도 운영자용 검수 상태를 노출하지 않는다', () => {
    for (const status of ['pending', 'verified', 'needs_review'] as const) {
      const shown = describeProductCompleteness(product({ verificationStatus: status }));
      expect(shown.label).not.toContain('검수');
      expect(shown.detail).not.toContain('검수');
    }
  });
});
