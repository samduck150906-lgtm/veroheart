// 가격 표시 단일 소스. 숫자와 통화 단위("원")가 항상 한 덩어리로 유지되도록
// 문자열 포맷과 파트 분해를 함께 제공한다. (줄바꿈은 표시 컴포넌트에서 nowrap 처리)

export interface PriceParts {
  /** 천단위 콤마가 적용된 금액 문자열 (예: "29,900"). 유효 가격이 없으면 null */
  amount: string | null;
  /** 통화 단위 라벨 */
  won: string;
  /** 가격 정보가 없을 때 표시할 대체 문구 */
  fallback: string;
}

/** 유효한 양수 가격인지 (null/undefined/NaN/0 이하 제외) */
export function hasValidPrice(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

/** 가격 → 파트(금액/단위/대체문구). UI 컴포넌트가 nowrap 으로 조립한다. */
export function formatPriceParts(value: number | null | undefined): PriceParts {
  if (!hasValidPrice(value)) {
    return { amount: null, won: '원', fallback: '가격 미정' };
  }
  return { amount: Math.round(value).toLocaleString('ko-KR'), won: '원', fallback: '가격 미정' };
}

/** "29,900원" 또는 "가격 미정" 한 줄 문자열 */
export function formatKRW(value: number | null | undefined): string {
  const p = formatPriceParts(value);
  return p.amount == null ? p.fallback : `${p.amount}${p.won}`;
}
