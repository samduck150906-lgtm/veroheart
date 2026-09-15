/**
 * 바코드(GTIN) 검증.
 *
 * 앱의 첫 화면 기능이 "바코드 스캔하기"인데, 잘못 입력된 바코드는 스캔이
 * 안 되는 것보다 나쁘다. 엉뚱한 제품이 매칭되면 보호자가 다른 제품의 성분
 * 분석을 보게 된다. 그래서 저장 전에 체크digit 을 계산해 오타를 걸러 낸다.
 *
 * GTIN-8 / GTIN-12(UPC-A) / GTIN-13(EAN-13) / GTIN-14 는 체크digit 계산 규칙이
 * 같다. 오른쪽에서 두 번째 자리부터 왼쪽으로 3, 1, 3, 1… 을 곱해 더하고,
 * 합을 10의 배수로 만드는 수가 마지막 자리여야 한다.
 */

export type BarcodeFormat = 'GTIN-8' | 'GTIN-12' | 'GTIN-13' | 'GTIN-14';

const VALID_LENGTHS: Record<number, BarcodeFormat> = {
  8: 'GTIN-8',
  12: 'GTIN-12',
  13: 'GTIN-13',
  14: 'GTIN-14',
};

/** 공백·하이픈 등을 지우고 숫자만 남긴다. 스캐너·엑셀이 넣는 구분자를 흡수한다. */
export function normalizeBarcode(value: string): string {
  return (value ?? '').replace(/\D/g, '');
}

/** 체크digit 을 뺀 앞자리로부터 올바른 체크digit 을 계산한다. */
export function computeCheckDigit(digitsWithoutCheck: string): number {
  let sum = 0;
  // 오른쪽 끝(체크digit 바로 앞)부터 3, 1, 3, 1… 을 곱한다.
  for (let offset = 0; offset < digitsWithoutCheck.length; offset += 1) {
    const digit = Number(digitsWithoutCheck[digitsWithoutCheck.length - 1 - offset]);
    sum += digit * (offset % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10;
}

export interface BarcodeCheck {
  valid: boolean;
  /** 숫자만 남긴 값. 저장할 때 이 값을 쓴다. */
  normalized: string;
  format: BarcodeFormat | null;
  /** 운영자에게 보여 줄 한 줄 설명. valid 여도 안내가 있을 수 있다. */
  message: string | null;
}

/**
 * 바코드 한 건을 검사한다.
 *
 * 비어 있는 값은 "아직 입력하지 않음"이지 오류가 아니다 — 지금 459개 제품 중
 * 바코드가 있는 것이 하나도 없어서, 빈 값을 오류로 표시하면 화면이 온통
 * 빨간색이 된다.
 */
export function checkBarcode(value: string): BarcodeCheck {
  const normalized = normalizeBarcode(value);
  if (!normalized) {
    return { valid: true, normalized: '', format: null, message: null };
  }

  const format = VALID_LENGTHS[normalized.length];
  if (!format) {
    return {
      valid: false,
      normalized,
      format: null,
      message: `${normalized.length}자리입니다. 바코드는 8·12·13·14자리여야 합니다.`,
    };
  }

  const expected = computeCheckDigit(normalized.slice(0, -1));
  const actual = Number(normalized[normalized.length - 1]);
  if (expected !== actual) {
    return {
      valid: false,
      normalized,
      format,
      message: `체크숫자가 맞지 않습니다. 마지막 자리는 ${expected} 여야 합니다 — 오타일 가능성이 높습니다.`,
    };
  }

  // 국내 유통 상품은 880 으로 시작한다. 다른 값도 정상이라 안내만 남긴다.
  if (format === 'GTIN-12') {
    return {
      valid: true,
      normalized,
      format,
      message: `UPC-A(12자리)입니다. 스캐너에 따라 ${toGtin13(normalized)} 로 읽히기도 합니다.`,
    };
  }
  return { valid: true, normalized, format, message: null };
}

/**
 * 12자리 UPC-A 를 13자리 GTIN-13 으로 바꾼다(앞에 0 을 붙인다).
 *
 * 같은 상품이라도 스캐너에 따라 12자리로 읽기도, 13자리로 읽기도 한다.
 * 어느 쪽으로 저장할지는 운영자가 정하도록 값만 만들어 주고 자동으로
 * 바꾸지는 않는다.
 */
export function toGtin13(value: string): string {
  const normalized = normalizeBarcode(value);
  if (normalized.length === 13) return normalized;
  if (normalized.length === 12) return `0${normalized}`;
  if (normalized.length === 8) return normalized.padStart(13, '0');
  return normalized;
}

/**
 * 여러 제품의 바코드에서 중복을 찾는다.
 *
 * products.barcode 에 부분 UNIQUE 인덱스가 걸려 있어 중복은 저장 시 DB 가
 * 거부한다. 저장을 눌러 실패를 보기 전에 화면에서 먼저 알려 준다.
 */
export function findDuplicateBarcodes(
  entries: { id: string; barcode: string }[],
): Map<string, string[]> {
  const byCode = new Map<string, string[]>();
  for (const entry of entries) {
    const normalized = normalizeBarcode(entry.barcode);
    if (!normalized) continue;
    const bucket = byCode.get(normalized);
    if (bucket) bucket.push(entry.id);
    else byCode.set(normalized, [entry.id]);
  }

  const duplicates = new Map<string, string[]>();
  for (const [code, ids] of byCode) {
    if (ids.length > 1) duplicates.set(code, ids);
  }
  return duplicates;
}
