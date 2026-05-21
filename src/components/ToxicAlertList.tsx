// @ts-nocheck
/**
 * ToxicAlertList
 * 위험 성분 경고 카드 목록
 * - 빨간 경고 카드 + 해골 아이콘
 * - 심각도 레벨(critical / caution)에 따라 색상 분기
 * - 각 카드 클릭 시 상세 설명 바텀시트 확장
 */
import { useState } from 'react';
import { Skull, AlertTriangle, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

export type ToxicSeverity = 'critical' | 'caution';

export interface ToxicIngredient {
  name: string;
  severity: ToxicSeverity;
  reason: string;
  detail?: string;
  source?: string;
}

interface ToxicAlertListProps {
  items: ToxicIngredient[];
}

const SEV_META = {
  critical: {
    icon: Skull,
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.3)',
    label: '위험',
  },
  caution: {
    icon: AlertTriangle,
    color: '#f97316',
    bg: 'rgba(249,115,22,0.08)',
    border: 'rgba(249,115,22,0.3)',
    label: '주의',
  },
};

function ToxicCard({ item }: { item: ToxicIngredient }) {
  const [open, setOpen] = useState(false);
  const meta = SEV_META[item.severity];
  const Icon = meta.icon;

  return (
    <div
      className="toxic-card"
      style={{ background: meta.bg, borderColor: meta.border }}
    >
      {/* Header row */}
      <button
        className="toxic-card-header"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="toxic-card-left">
          <span className="toxic-icon-wrap" style={{ background: meta.color }}>
            <Icon size={14} color="#fff" />
          </span>
          <div>
            <div className="toxic-name" style={{ color: meta.color }}>{item.name}</div>
            <div className="toxic-reason">{item.reason}</div>
          </div>
        </div>
        <div className="toxic-card-right">
          <span
            className="toxic-badge"
            style={{ background: meta.color }}
          >
            {meta.label}
          </span>
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Expandable detail */}
      {open && item.detail && (
        <div className="toxic-detail">
          <p>{item.detail}</p>
          {item.source && (
            <a href={item.source} target="_blank" rel="noopener noreferrer" className="toxic-source-link">
              <ExternalLink size={12} style={{ marginRight: 4 }} />
              출처 보기
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export default function ToxicAlertList({ items }: ToxicAlertListProps) {
  if (!items.length) {
    return (
      <div className="toxic-empty">
        <span style={{ fontSize: 32 }}>✅</span>
        <p>위험 성분이 검출되지 않았습니다.</p>
      </div>
    );
  }

  const criticals = items.filter((i) => i.severity === 'critical');
  const cautions  = items.filter((i) => i.severity === 'caution');

  return (
    <div className="toxic-list-wrap">
      <div className="toxic-list-header">
        <Skull size={18} color="#ef4444" />
        <h3 className="toxic-list-title">
          위험 성분 분석
          <span className="toxic-count">{items.length}개 발견</span>
        </h3>
      </div>

      {criticals.length > 0 && (
        <>
          <div className="toxic-section-label">⛔ 위험</div>
          {criticals.map((item, i) => <ToxicCard key={i} item={item} />)}
        </>
      )}
      {cautions.length > 0 && (
        <>
          <div className="toxic-section-label">⚠️ 주의</div>
          {cautions.map((item, i) => <ToxicCard key={i} item={item} />)}
        </>
      )}
    </div>
  );
}
