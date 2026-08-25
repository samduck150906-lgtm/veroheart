/**
 * 회귀 테스트 — 보장성분에 비정상 값이 들어와도 계산 결과가 화면에 NaN/Infinity 로
 * 새어 나가지 않는지 확인한다.
 *
 * 배경: products.guaranteed_analysis 는 크롤링·수기 입력이 섞여 있어 문자열("28"),
 * 단위가 붙은 문자열("28%"), null, 음수, 100 초과 값이 실제로 들어온다. 예전에는
 * 이 값들이 그대로 산술에 들어가 제품 상세의 열량이 "NaNkcal/100g" 로 표시됐다.
 */
import { describe, expect, it } from 'vitest';
import {
  calculateCalories,
  checkCalciumPhosphorusRatio,
  toDryMatter,
  validateAAFCO,
} from './nutrition';
import type { GuaranteedAnalysis } from './types';

/** 테스트에서 의도적으로 비정상 값을 넣기 위한 캐스팅 헬퍼 */
function ga(raw: Record<string, unknown>): GuaranteedAnalysis {
  return raw as GuaranteedAnalysis;
}

describe('보장성분 비정상 입력 방어', () => {
  it('문자열 보장성분이 들어와도 열량이 유한한 수로 나온다', () => {
    const result = calculateCalories(ga({ crudeProtein: '28', crudeFat: '16', moisture: '10' }));
    expect(Number.isFinite(result.kcalPer100g)).toBe(true);
    expect(result.kcalPer100g).toBeGreaterThan(0);
  });

  it('단위가 섞인 문자열은 0으로 취급하고 NaN 을 만들지 않는다', () => {
    const result = calculateCalories(ga({ crudeProtein: '28%', crudeFat: 'N/A', moisture: null }));
    expect(Number.isNaN(result.kcalPer100g)).toBe(false);
    expect(Number.isFinite(result.kcalPerKg)).toBe(true);
    expect(Number.isFinite(result.distribution.protein)).toBe(true);
    expect(Number.isFinite(result.distribution.fat)).toBe(true);
    expect(Number.isFinite(result.distribution.carbs)).toBe(true);
  });

  it('보장성분이 비어 있어도 유한한 값을 돌려준다', () => {
    // 값이 전부 없으면 NFE 가 100% 로 계산돼 탄수화물만 있는 350kcal 이 나온다.
    // 호출부(analyzeFeed / AnalysisResult)가 "단백 또는 지방 > 0" 을 먼저 확인하므로
    // 이 값이 화면에 실측치로 노출되지는 않는다. 여기서는 NaN 이 아님만 고정한다.
    const result = calculateCalories(ga({}));
    expect(Number.isFinite(result.kcalPer100g)).toBe(true);
    expect(result.distribution.carbs).toBe(100);
  });

  it('음수·100 초과 값은 0~100 으로 가둔다', () => {
    const negative = calculateCalories(ga({ crudeProtein: -50, crudeFat: 10 }));
    const huge = calculateCalories(ga({ crudeProtein: 400, crudeFat: 10 }));
    expect(negative.kcalPer100g).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(huge.kcalPer100g)).toBe(true);
    // 단백 400% 는 100% 로 잘려 나머지 성분이 음수 열량을 만들지 않는다.
    expect(huge.distribution.carbs).toBeGreaterThanOrEqual(0);
  });

  it('수분 100% 는 건물 기준 환산을 포기한다(0으로 나누지 않는다)', () => {
    expect(toDryMatter(30, 100)).toBeNull();
    expect(toDryMatter(30, 120)).toBeNull();
  });

  it('건물 기준 환산 결과는 항상 유한하다', () => {
    const value = toDryMatter(30, 10);
    expect(value).not.toBeNull();
    expect(Number.isFinite(value as number)).toBe(true);
  });

  it('AAFCO 판정 문구에 NaN 이 들어가지 않는다', () => {
    const { details } = validateAAFCO(ga({ crudeProtein: 'bad', crudeFat: null, moisture: '?' }), 'dog');
    for (const line of details) {
      expect(line).not.toMatch(/NaN|Infinity/);
    }
  });
});

describe('칼슘:인 비율 표기', () => {
  it('칼슘이 인보다 많으면 ratio:1 로 적는다', () => {
    // Ca 3.0 / P 1.0 = 3:1 (칼슘 과다). 예전에는 "1:3.00" 으로 적어 인 과다처럼 보였다.
    const note = checkCalciumPhosphorusRatio(ga({ calcium: 3, phosphorus: 1 }));
    expect(note).toContain('3.00:1');
    expect(note).not.toContain('1:3.00');
  });

  it('인이 칼슘보다 많은 경우도 같은 표기를 쓴다', () => {
    // Ca 0.5 / P 1.0 = 0.5:1 (인 과다)
    const note = checkCalciumPhosphorusRatio(ga({ calcium: 0.5, phosphorus: 1 }));
    expect(note).toContain('0.50:1');
  });

  it('권장 범위(1:1~2:1) 안이면 경고하지 않는다', () => {
    expect(checkCalciumPhosphorusRatio(ga({ calcium: 1.5, phosphorus: 1 }))).toBeNull();
  });

  it('인이 0 이거나 값이 없으면 나누지 않고 건너뛴다', () => {
    expect(checkCalciumPhosphorusRatio(ga({ calcium: 1.2, phosphorus: 0 }))).toBeNull();
    expect(checkCalciumPhosphorusRatio(ga({ calcium: 1.2 }))).toBeNull();
    expect(checkCalciumPhosphorusRatio(ga({ calcium: 'x', phosphorus: 'y' }))).toBeNull();
  });
});
