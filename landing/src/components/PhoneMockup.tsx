import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  label?: string;
};

export function PhoneMockup({ children, label }: Props) {
  return (
    <div
      className="relative mx-auto w-[min(100%,260px)] shrink-0"
      aria-hidden={label ? undefined : true}
    >
      <div className="rounded-[2.25rem] border-[10px] border-gold-darkest bg-gold-darker p-1 shadow-soft">
        <div className="relative overflow-hidden rounded-[1.85rem] bg-cream-50">
          <div className="absolute left-1/2 top-2 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-gold-darkest/95" />
          {label && (
            <span className="sr-only">{label}</span>
          )}
          <div className="min-h-[420px] px-4 pb-6 pt-10">{children}</div>
        </div>
      </div>
    </div>
  );
}
