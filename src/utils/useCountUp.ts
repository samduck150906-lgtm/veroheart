import { useEffect, useRef, useState } from 'react';

/**
 * useCountUp — 값이 바뀔 때 이전 값에서 새 값으로 부드럽게 보간(count-up/down)한다.
 * 급여 가이드·스코어 등 숫자가 바뀌는 곳에서 피드백 애니메이션 용도.
 * prefers-reduced-motion 사용자는 즉시 목표값으로 점프한다.
 */
export function useCountUp(target: number, duration = 480): number {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    const to = target;

    if (from === to) return;

    // 접근성: 모션 최소화 설정이면 애니메이션 생략
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      fromRef.current = to;
      setValue(to);
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setValue(from + (to - from) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
        setValue(to);
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return value;
}
