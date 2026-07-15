import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  label?: string;
  className?: string;
};

/** 차분한 스마트폰 목업 — 실제 화면 내용이 잘 보이도록 장식은 최소화 */
export function PhoneMockup({ children, label, className = "" }: Props) {
  return (
    <div
      className={`relative mx-auto w-[min(100%,280px)] shrink-0 ${className}`}
      aria-hidden={label ? undefined : true}
    >
      <div className="rounded-[2.4rem] bg-ink-900 p-[3px] shadow-soft">
        <div className="rounded-[2.25rem] bg-ink-900 p-2">
          <div className="relative overflow-hidden rounded-[1.85rem] bg-cream-50">
            {/* 상태바 노치 */}
            <div className="absolute left-1/2 top-2.5 z-10 h-6 w-24 -translate-x-1/2 rounded-full bg-ink-900" />
            {label && <span className="sr-only">{label}</span>}
            <div className="min-h-[440px] px-4 pb-6 pt-11">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
