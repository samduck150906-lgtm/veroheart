import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  label?: string;
};

export function PhoneMockup({ children, label }: Props) {
  return (
    <div
      className="relative mx-auto w-[min(100%,268px)] shrink-0"
      aria-hidden={label ? undefined : true}
    >
      <div className="rounded-[2.5rem] border-[9px] border-gold-darkest bg-gold-darkest p-0.5 shadow-soft">
        <div className="relative overflow-hidden rounded-[2.1rem] bg-cream-50">
          {/* Dynamic island pill */}
          <div className="absolute left-1/2 top-2.5 z-10 h-[18px] w-[72px] -translate-x-1/2 rounded-full bg-gold-darkest/95" />
          {label && <span className="sr-only">{label}</span>}
          <div className="min-h-[430px] px-4 pb-6 pt-11">{children}</div>
        </div>
      </div>
      {/* subtle bottom reflection */}
      <div className="absolute -bottom-4 left-1/2 h-8 w-4/5 -translate-x-1/2 rounded-full bg-gold-darkest/10 blur-xl" />
    </div>
  );
}
