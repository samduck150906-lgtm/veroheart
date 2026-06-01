"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  delayMs?: number;
};

export function Reveal({ children, className = "", delayMs = 0 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let timeout: number | undefined;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            timeout = window.setTimeout(() => setVisible(true), delayMs);
            obs.disconnect();
            break;
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      if (timeout) window.clearTimeout(timeout);
    };
  }, [delayMs]);

  return (
    <div
      ref={ref}
      className={`reveal-base ${visible ? "reveal-visible" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
