import { describe, expect, it } from 'vitest';
import {
  checkBarcode,
  computeCheckDigit,
  findDuplicateBarcodes,
  normalizeBarcode,
  toGtin13,
} from './barcode';

/**
 * 잘못 저장된 바코드는 스캔이 안 되는 것보다 나쁘다 — 엉뚱한 제품의 성분
 * 분석이 보호자에게 보인다. 그래서 "무엇을 통과시키는가"보다 "무엇을 막는가"를
 * 더 촘촘히 검사한다.
 */
describe('바코드 검증', () => {
  it('구분자를 지우고 숫자만 남긴다', () => {
    expect(normalizeBarcode(' 880-1234 56789 3 ')).toBe('8801234567893');
    expect(normalizeBarcode('없음')).toBe('');
  });

  it('체크숫자를 규칙대로 계산한다', () => {
    // EAN-13 표준 예시: 400638133393 → 1
    expect(computeCheckDigit('400638133393')).toBe(1);
    // UPC-A 표준 예시: 03600029145 → 2
    expect(computeCheckDigit('03600029145')).toBe(2);
    // EAN-8 표준 예시: 9638507 → 4
    expect(computeCheckDigit('9638507')).toBe(4);
  });

  it('올바른 EAN-13 을 통과시킨다', () => {
    const result = checkBarcode('4006381333931');
    expect(result.valid).toBe(true);
    expect(result.format).toBe('GTIN-13');
    expect(result.message).toBeNull();
  });

  it('한 자리만 틀린 바코드를 잡아낸다', () => {
    const result = checkBarcode('4006381333932');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('1');
  });

  it('자리수가 맞지 않으면 막는다', () => {
    expect(checkBarcode('12345').valid).toBe(false);
    expect(checkBarcode('12345').message).toContain('5자리');
    expect(checkBarcode('123456789012345').valid).toBe(false);
  });

  it('빈 값은 오류가 아니라 미입력으로 본다', () => {
    const result = checkBarcode('');
    expect(result.valid).toBe(true);
    expect(result.normalized).toBe('');
    expect(result.message).toBeNull();
  });

  it('UPC-A 는 통과시키되 13자리 형태를 함께 알려 준다', () => {
    const result = checkBarcode('036000291452');
    expect(result.valid).toBe(true);
    expect(result.format).toBe('GTIN-12');
    expect(result.message).toContain('0036000291452');
  });

  it('EAN-8 을 통과시킨다', () => {
    expect(checkBarcode('96385074').valid).toBe(true);
    expect(checkBarcode('96385074').format).toBe('GTIN-8');
  });

  describe('13자리 변환', () => {
    it('UPC-A 앞에 0 을 붙인다', () => {
      expect(toGtin13('036000291452')).toBe('0036000291452');
    });

    it('이미 13자리면 그대로 둔다', () => {
      expect(toGtin13('4006381333931')).toBe('4006381333931');
    });
  });

  describe('중복 검사', () => {
    it('같은 바코드를 쓴 제품들을 묶어 준다', () => {
      const duplicates = findDuplicateBarcodes([
        { id: 'a', barcode: '4006381333931' },
        { id: 'b', barcode: '400-6381-333931' },
        { id: 'c', barcode: '96385074' },
      ]);
      expect(duplicates.size).toBe(1);
      expect(duplicates.get('4006381333931')).toEqual(['a', 'b']);
    });

    it('빈 값끼리는 중복으로 보지 않는다', () => {
      const duplicates = findDuplicateBarcodes([
        { id: 'a', barcode: '' },
        { id: 'b', barcode: '   ' },
      ]);
      expect(duplicates.size).toBe(0);
    });
  });
});
