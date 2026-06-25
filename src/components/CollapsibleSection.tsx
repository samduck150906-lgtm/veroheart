import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  /** 처음에 펼쳐진 상태인지 (기본 닫힘) */
  defaultOpen?: boolean;
  children: ReactNode;
}

/**
 * 섹션 접기/펼치기 아코디언.
 * grid-template-rows 0fr→1fr 트릭으로 높이 측정 없이 부드럽게 열고 닫는다.
 */
export default function CollapsibleSection({
  title,
  subtitle,
  icon,
  defaultOpen = false,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="pdp-accordion">
      <button
        type="button"
        className="pdp-accordion-head"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="pdp-accordion-titlewrap">
          {icon && <span className="pdp-accordion-icon">{icon}</span>}
          <span>
            <span className="pdp-accordion-title">{title}</span>
            {subtitle && <span className="pdp-accordion-sub">{subtitle}</span>}
          </span>
        </span>
        <ChevronDown size={20} className={`pdp-accordion-chev ${open ? 'pdp-accordion-chev--open' : ''}`} aria-hidden />
      </button>
      <div className={`pdp-accordion-body ${open ? 'pdp-accordion-body--open' : ''}`}>
        <div className="pdp-accordion-inner">{children}</div>
      </div>
    </section>
  );
}
