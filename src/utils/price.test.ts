import { describe, expect, it } from 'vitest';
import { formatKRW, formatPriceParts, hasValidPrice } from './price';

describe('price 포맷', () => {
  it('천단위 콤마와 원 단위를 붙인다', () => {
    expect(formatKRW(999)).toBe('999원');
    expect(formatKRW(9900)).toBe('9,900원');
    expect(formatKRW(99900)).toBe('99,900원');
    expect(formatKRW(1099000)).toBe('1,099,000원');
  });

  it('유효하지 않은 가격은 "가격 미정"', () => {
    expect(formatKRW(0)).toBe('가격 미정');
    expect(formatKRW(-1)).toBe('가격 미정');
    expect(formatKRW(null)).toBe('가격 미정');
    expect(formatKRW(undefined)).toBe('가격 미정');
    expect(formatKRW(Number.NaN)).toBe('가격 미정');
  });

  it('hasValidPrice 는 양수만 통과', () => {
    expect(hasValidPrice(100)).toBe(true);
    expect(hasValidPrice(0)).toBe(false);
    expect(hasValidPrice(null)).toBe(false);
  });

  it('formatPriceParts 는 금액과 단위를 분리해 반환한다', () => {
    expect(formatPriceParts(29900)).toEqual({ amount: '29,900', won: '원', fallback: '가격 미정' });
    expect(formatPriceParts(0).amount).toBeNull();
  });

  it('소수 가격은 반올림한다', () => {
    expect(formatKRW(29900.4)).toBe('29,900원');
  });
});
