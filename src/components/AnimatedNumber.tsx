import { useCountUp } from '../utils/useCountUp';

interface AnimatedNumberProps {
  value: number;
  /** 소수 자릿수 (기본 0 → 정수) */
  decimals?: number;
  /** 숫자 뒤 단위 문자열 (예: 'g', '%') */
  suffix?: string;
  /** 1000단위 콤마 표기 여부 */
  locale?: boolean;
}

/**
 * 숫자가 바뀔 때 count-up/down 애니메이션으로 표시한다.
 * 텍스트만 반환하므로 부모의 폰트/색상 스타일을 그대로 따른다.
 */
export default function AnimatedNumber({ value, decimals = 0, suffix = '', locale = false }: AnimatedNumberProps) {
  const animated = useCountUp(value);
  const rounded = decimals > 0
    ? Number(animated.toFixed(decimals))
    : Math.round(animated);
  const text = locale ? rounded.toLocaleString() : rounded.toFixed(decimals);
  return <>{text}{suffix}</>;
}
