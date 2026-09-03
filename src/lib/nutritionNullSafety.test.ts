import { describe, expect, it } from 'vitest';
import { mapProductFromSupabaseRow } from './supabaseRowTypes';
import { analyzeFeed } from '../analysis/feedAnalysis';
import { calculateCalories } from '../analysis/nutrition';
import { DEFAULT_USER_PET_PROFILE } from '../types';

/**
 * nutritional_profiles 의 7개 성분은 원래 NOT NULL DEFAULT 0.0 이었다. 그래서 '모름'이
 * 0 으로 저장되고, 앱은 그 0 을 신고값으로 읽어 "칼슘 0%" 로 보여줬다. 컬럼을 NULL
 * 허용으로 바꾸면서 처음으로 null 이 앱까지 올라온다.
 *
 * 아래는 마이그레이션 이후 DB 가 실제로 돌려주는 모양이다(운영 데이터 기준:
 * 동결건조 간식의 수분·칼슘·인이 미신고라 null 이다).
 */
const rowWithNulls = {
  id: 'p1', name: '동결건조 간식', brand_name: '고메이트', product_type: 'snack',
  nutritional_profiles: {
    crude_protein: 55, crude_fat: 15, crude_fiber: 0, crude_ash: 10,
    moisture: null, calcium: null, phosphorus: null,
  },
} as never;

describe('영양성분 null 처리 (nutritional_profiles NULL 허용 이후)', () => {
  it('null 성분을 0 으로 만들지 않는다', () => {
    const product = mapProductFromSupabaseRow(rowWithNulls);
    expect(product.guaranteedAnalysis?.crudeProtein).toBe(55);
    // 0 이 아니라 '없음' 이어야 화면에서 미확인으로 표시할 수 있다.
    expect(product.guaranteedAnalysis?.calcium).toBeUndefined();
    expect(product.guaranteedAnalysis?.phosphorus).toBeUndefined();
    expect(product.guaranteedAnalysis?.moisture).toBeUndefined();
  });

  it('칼슘·인을 모르면 Ca:P 비율을 만들어내지 않는다', () => {
    const product = mapProductFromSupabaseRow(rowWithNulls);
    const feed = analyzeFeed(product, DEFAULT_USER_PET_PROFILE);
    expect(feed.caP.ratio).toBeNull();
  });

  it('null 이 섞여도 NaN 을 만들지 않는다', () => {
    const product = mapProductFromSupabaseRow(rowWithNulls);
    const calories = calculateCalories(product.guaranteedAnalysis!);
    expect(Number.isFinite(calories.kcalPer100g)).toBe(true);
    const feed = analyzeFeed(product, DEFAULT_USER_PET_PROFILE);
    expect(JSON.stringify(feed)).not.toContain('null,"ratio"');
    expect(JSON.stringify(feed)).not.toContain('NaN');
  });

  it('성분이 전부 null 이어도 안전하다', () => {
    const product = mapProductFromSupabaseRow({
      ...(rowWithNulls as object),
      nutritional_profiles: {
        crude_protein: null, crude_fat: null, crude_fiber: null,
        crude_ash: null, moisture: null, calcium: null, phosphorus: null,
      },
    } as never);
    expect(() => analyzeFeed(product, DEFAULT_USER_PET_PROFILE)).not.toThrow();
    expect(JSON.stringify(analyzeFeed(product, DEFAULT_USER_PET_PROFILE))).not.toContain('NaN');
  });
});
