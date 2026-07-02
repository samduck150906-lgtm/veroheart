import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  label?: string;
  className?: string;
};

/** 현대적인 스마트폰 목업 — 은은한 글로우와 그라디언트 베젤 */
export function PhoneMockup({ children, label, className = "" }: Props) {
  return (
    <div
      className={`relative mx-auto w-[min(100%,272px)] shrink-0 ${className}`}
      aria-hidden={label ? undefined : true}
    >
      {/* 뒤쪽 글로우 */}
      <div
        className="absolute -inset-8 -z-10 rounded-[3rem] bg-gold-gradient opacity-25 blur-3xl"
        aria-hidden
      />
      <div className="rounded-[2.6rem] bg-gradient-to-b from-ink-900 to-gold-darkest p-[3px] shadow-float ring-1 ring-white/10">
        <div className="rounded-[2.45rem] bg-ink-900 p-2">
          <div className="relative overflow-hidden rounded-[2rem] bg-cream-50">
            {/* 상태바 노치 */}
            <div className="absolute left-1/2 top-2.5 z-10 h-6 w-24 -translate-x-1/2 rounded-full bg-ink-900" />
            {label && <span className="sr-only">{label}</span>}
            <div className="min-h-[430px] px-4 pb-6 pt-11">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
