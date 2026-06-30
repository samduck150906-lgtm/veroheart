import { useNavigate } from 'react-router-dom';
import { VERORO_LOGO_SRC } from '../constants/assets';
import { HOME_HERO } from '../copy/marketing';

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
          fontSize: '22px',
          fontWeight: 800,
          color: 'var(--text-dark)',
          lineHeight: 1.35,
          margin: '0 0 12px',
          maxWidth: '300px',
        }}
      >
        {HOME_HERO.headline}
      </h1>
      <p
        style={{
          fontSize: '14px',
          fontWeight: 600,
          color: '#6B7280',
          lineHeight: 1.5,
          margin: '0 0 32px',
          maxWidth: '280px',
        }}
      >
        둘러보기로 바로 시작하거나, 로그인 후 아이 맞춤 분석을 켜 보세요.
      </p>

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
