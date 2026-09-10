import { AlertTriangle, CheckCircle2, CircleHelp } from 'lucide-react';
import type {
  ConcernPresentationItem,
  HealthConcernPresentation,
} from '../health/concernPresentation';

function stateStyle(state: ConcernPresentationItem['state']) {
  if (state === 'contradiction_caution') {
    return { icon: AlertTriangle, color: 'var(--danger-strong)', background: 'var(--danger-bg)' };
  }
  if (state === 'supported_evidence') {
    return { icon: CheckCircle2, color: 'var(--safe-strong)', background: 'var(--safe-bg)' };
  }
  if (state === 'limited_evidence') {
    return { icon: CircleHelp, color: 'var(--caution-strong)', background: 'var(--caution-bg)' };
  }
  return { icon: CircleHelp, color: 'var(--text-muted)', background: 'var(--secondary)' };
}

export function HealthConcernEvidence({
  presentation,
}: {
  presentation: HealthConcernPresentation | null;
}) {
  if (!presentation || presentation.status === 'not_selected') return null;

  return (
    <section aria-label="건강 고민 근거" style={{ display: 'grid', gap: 10 }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-dark)' }}>건강 고민 근거</div>
        <div style={{ marginTop: 3, fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          선택한 고민별로 현재 등록된 근거와 정보 부족을 구분해 보여드려요.
        </div>
      </div>
      {presentation.items.map((item, index) => {
        const style = stateStyle(item.state);
        const Icon = style.icon;
        return (
          <article
            key={`${item.concernId ?? 'legacy'}-${index}`}
            style={{
              display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 10, padding: 14,
              borderRadius: 8, background: style.background,
            }}
          >
            <Icon size={18} color={style.color} aria-hidden style={{ marginTop: 2 }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text-dark)', lineHeight: 1.45 }}>
                {item.title}
              </div>
              <div style={{ marginTop: 4, fontSize: 12.5, fontWeight: 600, color: 'var(--text-muted)', lineHeight: 1.55 }}>
                {item.summary}
              </div>
              <div style={{ marginTop: 7, fontSize: 11.5, fontWeight: 800, color: style.color }}>
                점수 반영: {item.scoreEffect}
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}
