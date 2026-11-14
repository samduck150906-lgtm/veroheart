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
  it('다섯 항목이 실제로 표시된 경우에만 Modified Atwater 추정치를 계산한다', () => {
    const result = calculateCalories(ga({ crudeProtein: '28', crudeFat: '16', crudeFiber: '4', crudeAsh: '8', moisture: '10' }));
    expect(result?.kcalPer100g).toBe(353);
    expect(result?.distribution.carbs).toBe(34);
  });

  it('미표시·단위 오류·음수·범위 초과·합계 오류를 가짜 0이나 탄수화물 100%로 바꾸지 않는다', () => {
    const valid = { crudeProtein: 28, crudeFat: 16, crudeFiber: 4, crudeAsh: 8, moisture: 10 };
    for (const field of Object.keys(valid)) {
      for (const value of [undefined, null, '', '28%', 'N/A', -1, 101, NaN, Infinity]) {
        expect(calculateCalories(ga({ ...valid, [field]: value }))).toBeNull();
      }
    }
    expect(calculateCalories(ga({}))).toBeNull();
    expect(calculateCalories(ga({ ...valid, moisture: 60 }))).toBeNull();
    expect(calculateCalories(ga({ crudeProtein: 0, crudeFat: 0, crudeFiber: 0, crudeAsh: 0, moisture: 100 }))?.kcalPer100g).toBe(0);
  });

  it('미표시 수분을 임의의 10%로 대체해 기준을 통과시키지 않는다', () => {
    expect(validateAAFCO({ crudeProtein: 30, crudeFat: 20 }, 'dog')).toMatchObject({ evaluated: false, passed: false });
    expect(toDryMatter(-1, 10)).toBeNull();
    expect(toDryMatter(95, 10)).toBeNull();
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
