// @ts-nocheck
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BERO_PET } from '../data/mvpMock';

const PawIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
    <g fill="#F5C518">
      <ellipse cx="7" cy="9" rx="1.9" ry="2.5" />
      <ellipse cx="12" cy="7.4" rx="1.9" ry="2.6" />
      <ellipse cx="17" cy="9" rx="1.9" ry="2.5" />
      <path d="M12 11.5c-2.6 0-4.7 1.9-4.7 4.2 0 1.7 1.4 2.6 3 2.6.7 0 1.2-.2 1.7-.2s1 .2 1.7.2c1.6 0 3-.9 3-2.6 0-2.3-2.1-4.2-4.7-4.2z" />
    </g>
  </svg>
);

export default function Login() {
  const navigate = useNavigate();
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    localStorage.setItem('mvp_logged_in', 'true');
    localStorage.setItem('mvp_pet', JSON.stringify(BERO_PET));
    navigate('/');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F7F4EE',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '0 24px',
    }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: '60px', paddingBottom: '20px' }}>
        <div style={{
          width: 80, height: 80, borderRadius: 24,
          background: 'linear-gradient(135deg, #F5C518 0%, #E8A800 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 20,
          boxShadow: '0 8px 24px rgba(245,197,24,0.3)',
        }}>
          <PawIcon />
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: '#191F28', letterSpacing: '-0.04em', marginBottom: 8 }}>베로로</h1>
        <p style={{ fontSize: 16, color: '#4E5968', fontWeight: 500, textAlign: 'center', lineHeight: 1.6 }}>
          반려동물 건강 식단 파트너
        </p>
        <p style={{ fontSize: 14, color: '#8B95A1', marginTop: 6, textAlign: 'center' }}>
          성분 분석으로 우리 아이 맞춤 사료를 찾아보세요
        </p>
      </div>

      <div style={{ width: '100%', maxWidth: 360, paddingBottom: 40 }}>
        <button
          onClick={handleLogin}
          style={{
            width: '100%', height: 54, borderRadius: 14,
            background: '#FEE500', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            fontSize: 16, fontWeight: 700, color: '#191919',
            marginBottom: 12,
          }}
        >
          <span style={{ fontSize: 20 }}>💬</span>
          카카오로 시작하기
        </button>

        <button
          onClick={handleLogin}
          style={{
            width: '100%', height: 54, borderRadius: 14,
            background: '#03C75A', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            fontSize: 16, fontWeight: 700, color: '#fff',
            marginBottom: 12,
          }}
        >
          <span style={{ fontSize: 18, fontWeight: 900, fontFamily: 'monospace' }}>N</span>
          네이버로 시작하기
        </button>

        <button
          onClick={handleLogin}
          style={{
            width: '100%', height: 54, borderRadius: 14,
            background: '#000', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            fontSize: 16, fontWeight: 700, color: '#fff',
            marginBottom: 24,
          }}
        >
          <span style={{ fontSize: 20 }}>🍎</span>
          Apple로 시작하기
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: '#E5E8EB' }} />
          <span style={{ fontSize: 13, color: '#8B95A1', fontWeight: 500 }}>또는</span>
          <div style={{ flex: 1, height: 1, background: '#E5E8EB' }} />
        </div>

        {!showEmailForm ? (
          <button
            onClick={() => setShowEmailForm(true)}
            style={{
              width: '100%', height: 50, borderRadius: 14,
              background: 'transparent', border: '1.5px solid #E5E8EB', cursor: 'pointer',
              fontSize: 15, fontWeight: 600, color: '#4E5968',
              marginBottom: 16,
            }}
          >
            이메일로 로그인
          </button>
        ) : (
          <div style={{ marginBottom: 16 }}>
            <input
              type="email"
              placeholder="이메일"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{
                width: '100%', height: 50, borderRadius: 12,
                border: '1.5px solid #E5E8EB', padding: '0 16px',
                fontSize: 15, color: '#191F28', background: '#fff',
                marginBottom: 10, boxSizing: 'border-box', outline: 'none',
              }}
            />
            <input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{
                width: '100%', height: 50, borderRadius: 12,
                border: '1.5px solid #E5E8EB', padding: '0 16px',
                fontSize: 15, color: '#191F28', background: '#fff',
                marginBottom: 12, boxSizing: 'border-box', outline: 'none',
              }}
            />
            <button
              onClick={handleLogin}
              style={{
                width: '100%', height: 50, borderRadius: 14,
                background: '#F5C518', border: 'none', cursor: 'pointer',
                fontSize: 16, fontWeight: 700, color: '#191F28',
              }}
            >
              로그인
            </button>
          </div>
        )}

        <div style={{ textAlign: 'center' }}>
          <button
            onClick={handleLogin}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 14, color: '#8B95A1', fontWeight: 500,
              textDecoration: 'underline', textUnderlineOffset: 3,
            }}
          >
            지금 바로 둘러보기
          </button>
        </div>

        <p style={{ fontSize: 12, color: '#B0B8C1', textAlign: 'center', marginTop: 24, lineHeight: 1.6 }}>
          로그인 시 이용약관과 개인정보처리방침에 동의하게 됩니다.
        </p>
      </div>
    </div>
  );
}
