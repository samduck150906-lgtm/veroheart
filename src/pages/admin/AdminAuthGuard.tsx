import { useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../../lib/supabase';
import { ShieldCheck, Lock, Loader2 } from 'lucide-react';

// 관리자 이메일 화이트리스트 (추후 DB 기반으로 교체 가능)
const ADMIN_EMAILS = ['ceo@eternalsix.kr', 'admin@veroheart.com'];

// 관리자 비밀번호 (환경변수 기반이 이상적이나, 우선 간단한 가드)
const ADMIN_PASSPHRASE = 'veroheart-admin-2026';

interface AdminAuthGuardProps {
  children: ReactNode;
}

export default function AdminAuthGuard({ children }: AdminAuthGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // 1차: Supabase Auth 세션 확인
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email && ADMIN_EMAILS.includes(session.user.email)) {
        setIsAuthenticated(true);
        setIsLoading(false);
        return;
      }

      // 2차: 세션스토리지 확인 (패스프레이즈 인증)
      const stored = sessionStorage.getItem('vh_admin_auth');
      if (stored === btoa(ADMIN_PASSPHRASE)) {
        setIsAuthenticated(true);
      }
    } catch (err) {
      console.error('Admin auth check failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePassphraseLogin = () => {
    if (passphrase === ADMIN_PASSPHRASE) {
      sessionStorage.setItem('vh_admin_auth', btoa(ADMIN_PASSPHRASE));
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('관리자 인증에 실패했습니다.');
      setPassphrase('');
    }
  };

  if (isLoading) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100vh', backgroundColor: '#f8fafc'
      }}>
        <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: '#6366f1' }} />
        <p style={{ marginTop: '16px', color: '#64748b', fontWeight: 500 }}>인증 확인 중...</p>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', backgroundColor: '#0f172a',
        backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(99,102,241,0.15) 0%, transparent 50%)'
      }}>
        <div style={{
          backgroundColor: '#1e293b', borderRadius: '24px', padding: '48px 40px',
          width: '100%', maxWidth: '420px', boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
          textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)'
        }}>
          <div style={{
            width: '72px', height: '72px', borderRadius: '20px', backgroundColor: 'rgba(99,102,241,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px'
          }}>
            <ShieldCheck size={36} color="#6366f1" />
          </div>

          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#f1f5f9', marginBottom: '8px' }}>
            VERO HEART Admin
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '32px' }}>
            관리자 콘솔에 접근하려면 인증이 필요합니다.
          </p>

          <div style={{ position: 'relative', marginBottom: '16px' }}>
            <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
            <input
              type="password"
              placeholder="관리자 패스프레이즈 입력"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePassphraseLogin()}
              style={{
                width: '100%', padding: '16px 16px 16px 48px', borderRadius: '14px',
                border: '1px solid rgba(255,255,255,0.1)', backgroundColor: '#0f172a',
                color: '#f1f5f9', fontSize: '15px', outline: 'none', boxSizing: 'border-box',
                transition: 'border-color 0.2s'
              }}
            />
          </div>

          {error && (
            <p style={{ color: '#ef4444', fontSize: '13px', fontWeight: 600, marginBottom: '16px' }}>
              {error}
            </p>
          )}

          <button
            onClick={handlePassphraseLogin}
            style={{
              width: '100%', padding: '16px', borderRadius: '14px', border: 'none',
              backgroundColor: '#6366f1', color: '#fff', fontWeight: 700, fontSize: '16px',
              cursor: 'pointer', transition: 'all 0.2s',
              boxShadow: '0 8px 16px rgba(99,102,241,0.3)'
            }}
          >
            인증하기
          </button>

          <p style={{ marginTop: '24px', fontSize: '12px', color: '#475569' }}>
            관리자 계정이 없으신가요? <a href="mailto:ceo@eternalsix.kr" style={{ color: '#6366f1' }}>문의</a>
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
