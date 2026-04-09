import { useNavigate } from 'react-router-dom';
import { VERORO_LOGO_SRC } from '../constants/assets';
import { HOME_HERO } from '../copy/marketing';

const STORAGE_KEY = 'vero_entry_gate_done';

export function markEntryGateDone() {
  try {
    localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function readEntryGateDone(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

type EntryGateProps = {
  /** 둘러보기: 이후 앱 진입 시 게이트 생략 */
  onBrowse: () => void;
  /** 로그인 화면으로 갈 때만 오버레이 닫기(저장 없음 → 미로그인 시 다음 방문에 다시 게이트) */
  onDismissForLogin: () => void;
};

export default function EntryGate({ onBrowse, onDismissForLogin }: EntryGateProps) {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 24px',
        boxSizing: 'border-box',
        background: 'var(--bg-gradient)',
        textAlign: 'center',
      }}
    >
      <img
        src={VERORO_LOGO_SRC}
        alt="VeRoRo"
        style={{ height: '100px', width: 'auto', objectFit: 'contain', marginBottom: '20px', display: 'block' }}
      />
      <h1
        style={{
          fontSize: '20px',
          fontWeight: 800,
          color: 'var(--text-dark)',
          lineHeight: 1.35,
          margin: '0 0 10px',
          maxWidth: '320px',
        }}
      >
        {HOME_HERO.headline}
      </h1>
      <p
        style={{
          fontSize: '14px',
          fontWeight: 600,
          color: '#4B5563',
          lineHeight: 1.55,
          margin: '0 0 28px',
          maxWidth: '300px',
        }}
      >
        로그인 없이도 상품과 성분 정보를 편하게 둘러볼 수 있어요.
      </p>
      <div
        style={{
          width: '100%',
          maxWidth: '320px',
          marginBottom: '20px',
          padding: '14px 16px',
          borderRadius: '16px',
          background: 'rgba(255, 255, 255, 0.82)',
          border: '1px solid rgba(124, 111, 156, 0.16)',
          textAlign: 'left',
        }}
      >
        <div style={{ fontSize: '12px', fontWeight: 800, color: '#5B21B6', marginBottom: '6px' }}>
          베로로 운영 원칙
        </div>
        <p style={{ margin: 0, fontSize: '12px', lineHeight: 1.55, color: '#5B566A', fontWeight: 600 }}>
          제품 데이터는 자동 크롤링보다 사람 검수 중심으로 관리하고, AI 분석은 추천 보조 도구로만 활용합니다.
        </p>
      </div>

      <button
        type="button"
        onClick={() => onBrowse()}
        style={{
          width: '100%',
          maxWidth: '320px',
          padding: '18px 20px',
          borderRadius: '16px',
          border: 'none',
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: 800,
          color: '#fff',
          background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
          boxShadow: 'var(--shadow-md)',
          marginBottom: '16px',
        }}
      >
        둘러보기
      </button>

      <button
        type="button"
        onClick={() => {
          onDismissForLogin();
          navigate('/login', { state: { from: '/' } });
        }}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 700,
          color: '#6B7280',
          textDecoration: 'underline',
          textUnderlineOffset: '3px',
        }}
      >
        로그인 · 회원가입
      </button>
    </div>
  );
}
