import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** 커스텀 푸터. 지정하지 않으면 기본 "확인" 버튼을 노출한다. null이면 푸터 없음. */
  footer?: React.ReactNode | null;
  /** 헤더 우측 보조 슬롯(예: 활성 필터 개수 배지) */
  headerRight?: React.ReactNode;
  /** 시트 최대 높이 — 긴 콘텐츠는 내부에서 스크롤된다. 기본 88vh */
  maxHeight?: string;
}

export default function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  footer,
  headerRight,
  maxHeight = '88vh',
}: BottomSheetProps) {
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // 열릴 때 즉시 마운트(등장) → 닫힐 때는 트랜지션 후 언마운트. 의도된 enter/exit 패턴.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsRendered(true);
      document.body.style.overflow = 'hidden';
    } else {
      const timer = setTimeout(() => setIsRendered(false), 300); // match transition duration
      document.body.style.overflow = 'unset';
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Esc 로 닫기(접근성)
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isRendered && !isOpen) return null;

  // 포털로 document.body 에 렌더 — 조상의 transform(animate-fade-in) 이
  // position:fixed 를 가두어 하단 네비 아래로 깔리는 문제를 피한다.
  return createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 9998, opacity: isOpen ? 1 : 0, transition: 'opacity 0.3s ease' }}
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          position: 'fixed', bottom: 0, left: '50%',
          transform: `translateX(-50%) translateY(${isOpen ? '0' : '100%'})`,
          width: '100%', maxWidth: '480px', maxHeight,
          display: 'flex', flexDirection: 'column',
          backgroundColor: 'var(--surface-elevated, #fff)', borderTopLeftRadius: '28px', borderTopRightRadius: '28px',
          zIndex: 9999, transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          padding: '12px 24px 0', boxShadow: '0 -10px 40px rgba(0,0,0,0.12)',
        }}
      >
        {/* Handle */}
        <div style={{ width: '40px', height: '4px', backgroundColor: '#E5E8EB', borderRadius: '4px', margin: '0 auto 16px auto', flexShrink: 0 }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px', flexShrink: 0 }}>
          <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-dark, #191F28)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            {title}
            {headerRight}
          </h3>
          <button onClick={onClose} aria-label="닫기" style={{ background: 'none', border: 'none', color: '#8B95A1', cursor: 'pointer', padding: '4px', display: 'flex', flexShrink: 0 }}>
            <X size={24} />
          </button>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: '8px' }}>
          {children}
        </div>

        {footer === undefined ? (
          <div style={{ flexShrink: 0, padding: '16px 0 max(16px, env(safe-area-inset-bottom, 16px))' }}>
            <button
              className="btn btn-primary ui-press"
              style={{ width: '100%', padding: '16px', borderRadius: '20px', fontWeight: 800, fontSize: '17px' }}
              onClick={onClose}
            >
              확인
            </button>
          </div>
        ) : footer === null ? null : (
          <div style={{ flexShrink: 0, padding: '14px 0 max(16px, env(safe-area-inset-bottom, 16px))', borderTop: '1px solid rgba(28,25,23,0.06)' }}>
            {footer}
          </div>
        )}
      </div>
    </>,
    document.body,
  );
}
