import type { SVGProps } from "react";

/** 공통 라인 아이콘 세트 (외부 의존성 없이 inline SVG) */

type IconProps = SVGProps<SVGSVGElement>;

function base(props: IconProps) {
  return {
    width: 24,
    height: 24,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...props,
  };
}

export function ScanIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 8V6a2 2 0 0 1 2-2h2" />
      <path d="M16 4h2a2 2 0 0 1 2 2v2" />
      <path d="M20 16v2a2 2 0 0 1-2 2h-2" />
      <path d="M8 20H6a2 2 0 0 1-2-2v-2" />
      <path d="M7 12h10" />
    </svg>
  );
}

export function ShieldCheckIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

export function ChatHeartIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M21 11.5a7.5 7.5 0 0 1-10.9 6.7L4 20l1.8-4.1A7.5 7.5 0 1 1 21 11.5z" />
      <path d="M12.6 9.2c-.6-1-2.1-1-2.7 0-.4.7-.2 1.5.4 2.1L12.6 14l2.3-2.7c.6-.6.8-1.4.4-2.1-.6-1-2.1-1-2.7 0z" />
    </svg>
  );
}

export function SparkleIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3l1.8 4.9L19 9.7l-4.4 2.8L13 18l-1-4.6L7 12l4.6-1.8L12 3z" />
      <path d="M19 15l.6 1.7L21 17.5l-1.4.8L19 20l-.6-1.7L17 17.5l1.4-.8L19 15z" />
    </svg>
  );
}

export function CartIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="9" cy="20" r="1.4" />
      <circle cx="18" cy="20" r="1.4" />
      <path d="M3 4h2l2.2 11.2a1.5 1.5 0 0 0 1.5 1.2h8.1a1.5 1.5 0 0 0 1.5-1.2L21 8H6" />
    </svg>
  );
}

export function PawIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="7" cy="9" r="1.7" />
      <circle cx="12" cy="6.5" r="1.7" />
      <circle cx="17" cy="9" r="1.7" />
      <path d="M12 12.5c-2.6 0-4.7 2-4.7 4.1 0 1.6 1.3 2.6 2.9 2.4.7-.1 1.2-.4 1.8-.4s1.1.3 1.8.4c1.6.2 2.9-.8 2.9-2.4 0-2.1-2.1-4.1-4.7-4.1z" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 12.5l5 5 11-11" />
    </svg>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  );
}

export function StarIcon(props: IconProps) {
  return (
    <svg {...base({ fill: "currentColor", stroke: "none", ...props })}>
      <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17.9 6.8 19.6l1-5.8L3.5 9.7l5.9-.9L12 3.5z" />
    </svg>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}

export function LeafIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M11 20A7 7 0 0 1 4 13c0-5 4-9 16-9 0 12-4 16-9 16z" />
      <path d="M8 17c3-4 6-6 10-7" />
    </svg>
  );
}
