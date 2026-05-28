import { useEffect, useState } from 'react';
import { Smartphone, X } from 'lucide-react';

const STORAGE_KEY = 'veroro-desktop-banner-dismissed';

export default function DesktopBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const dismissed = window.sessionStorage.getItem(STORAGE_KEY) === '1';
    if (dismissed) return;
    const mq = window.matchMedia('(min-width: 900px)');
    const update = () => setIsVisible(mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);

  if (!isVisible) return null;

  const handleDismiss = () => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(STORAGE_KEY, '1');
    }
    setIsVisible(false);
  };

  return (
    <div
      role="status"
      aria-label="모바일 최적화 안내"
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 1000,
        maxWidth: '300px',
        padding: '14px 16px',
        borderRadius: '16px',
        background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
        boxShadow: '0 20px 40px rgba(15, 23, 42, 0.12), 0 4px 12px rgba(15, 23, 42, 0.06)',
        border: '1px solid rgba(99, 102, 241, 0.12)',
        display: 'flex',
        gap: '10px',
        alignItems: 'flex-start',
        animation: 'fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      }}
    >
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #EEF2FF 0%, #FAF5FF 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
        aria-hidden="true"
      >
        <Smartphone size={18} color="#6366F1" strokeWidth={2.2} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: '13px',
            fontWeight: 800,
            color: '#0F172A',
            marginBottom: '4px',
            letterSpacing: '-0.01em',
          }}
        >
          모바일에서 더 편하게 사용하세요
        </div>
        <p
          style={{
            margin: 0,
            fontSize: '12px',
            lineHeight: 1.5,
            color: '#64748B',
            fontWeight: 500,
          }}
        >
          베로로는 모바일에 최적화된 앱이에요. 휴대폰 브라우저에서 URL을 열거나 홈 화면에 추가해 보세요.
        </p>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="안내 배너 닫기"
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: '#94A3B8',
          padding: '2px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <X size={14} strokeWidth={2.5} />
      </button>
    </div>
  );
}
