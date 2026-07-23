import type { CSSProperties } from 'react';
import { formatPriceParts } from '../../utils/price';

/**
 * 가격 표시 컴포넌트 — 숫자와 "원"이 절대 줄바꿈되지 않게 한 덩어리로 렌더한다.
 * (기존 `{price.toLocaleString()}원` 인라인 렌더는 숫자와 "원" 사이에서 줄바꿈될 수 있었다)
 */
export default function ProductPrice({
  value,
  size = 15,
  weight = 800,
  color = 'var(--text-dark)',
  wonSize,
  style,
}: {
  value: number | null | undefined;
  size?: number;
  weight?: number;
  color?: string;
  wonSize?: number;
  style?: CSSProperties;
}) {
  const { amount, won, fallback } = formatPriceParts(value);

  if (amount == null) {
    return (
      <span style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: size, fontWeight: 600, ...style }}>
        {fallback}
      </span>
    );
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        color,
        fontSize: size,
        fontWeight: weight,
        letterSpacing: '-0.01em',
        ...style,
      }}
    >
      {amount}
      <span style={{ fontSize: wonSize ?? Math.round(size * 0.8), fontWeight: 700, marginLeft: 1 }}>{won}</span>
    </span>
  );
}
