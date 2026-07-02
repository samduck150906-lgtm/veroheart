import type { ReactNode } from 'react';
import { Inbox, AlertTriangle, Loader2 } from 'lucide-react';

export type StateVariant = 'empty' | 'error' | 'loading';

interface StateViewProps {
  variant?: StateVariant;
  /** 커스텀 아이콘 (미지정 시 variant 기본 아이콘) */
  icon?: ReactNode;
  title: string;
  description?: string;
  /** 기본 CTA */
  action?: { label: string; onClick: () => void };
  /** 보조 텍스트 버튼 */
  secondaryAction?: { label: string; onClick: () => void };
  /** 컨테이너 최소 높이 (기본 뷰포트 60%) */
  minHeight?: number | string;
}

const VARIANT_ICON: Record<StateVariant, ReactNode> = {
  empty: <Inbox size={30} />,
  error: <AlertTriangle size={30} />,
  loading: <Loader2 size={30} className="vero-spin" />,
};

const VARIANT_TINT: Record<StateVariant, { bg: string; fg: string }> = {
  empty: { bg: 'var(--secondary)', fg: 'var(--text-muted)' },
  error: { bg: '#FDECEE', fg: '#F04452' },
  loading: { bg: 'rgba(254,229,0,0.16)', fg: 'var(--primary-dark)' },
};

/**
 * StateView — Empty / Error / Loading 통합 상태 화면.
 * 일러스트 자리(아이콘) + 1줄 제목 + 1줄 설명 + 1 CTA 규칙(스펙 §21·§22·§23).
 */
export default function StateView({
  variant = 'empty',
  icon,
  title,
  description,
  action,
  secondaryAction,
  minHeight = '60vh',
}: StateViewProps) {
  const tint = VARIANT_TINT[variant];
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      style={{
        minHeight,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '40px 24px',
      }}
    >
      <div
        aria-hidden
        style={{
          width: 64,
          height: 64,
          borderRadius: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: tint.bg,
          color: tint.fg,
          marginBottom: 18,
        }}
      >
        {icon ?? VARIANT_ICON[variant]}
      </div>

      <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-dark)', margin: 0 }}>{title}</p>
      {description && (
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', margin: '8px 0 0', lineHeight: 1.6, maxWidth: 300 }}>
          {description}
        </p>
      )}

      {action && (
        <button
          type="button"
          onClick={action.onClick}
          style={{
            marginTop: 24,
            padding: '12px 24px',
            borderRadius: 14,
            border: 'none',
            background: 'var(--primary)',
            color: 'var(--text-dark)',
            fontSize: 14,
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          {action.label}
        </button>
      )}
      {secondaryAction && (
        <button
          type="button"
          onClick={secondaryAction.onClick}
          style={{
            marginTop: 12,
            padding: '8px 12px',
            border: 'none',
            background: 'none',
            color: 'var(--text-muted)',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {secondaryAction.label}
        </button>
      )}
    </div>
  );
}
