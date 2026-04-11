import { useState, useEffect, type ReactNode } from 'react';
import { ShieldCheck, Lock, Loader2 } from 'lucide-react';
import './admin.css';

const ADMIN_EMAILS = parseAdminEmails(import.meta.env.VITE_ADMIN_EMAILS);

interface AdminAuthGuardProps {
  children: ReactNode;
}

export default function AdminAuthGuard({ children }: AdminAuthGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const email = session?.user?.email?.trim().toLowerCase();
        if (email && ADMIN_EMAILS.length > 0 && ADMIN_EMAILS.includes(email)) {
          if (!cancelled) setIsAuthenticated(true);
          return;
        }
        if (email && ADMIN_EMAILS.length === 0) {
          console.warn(
            '[admin] VITE_ADMIN_EMAILS가 비어 있습니다. 관리자 콘솔은 로그인된 Supabase 사용자 중에서도 열리지 않습니다.'
          );
        }
      } catch (err) {
        console.error('Admin auth check failed:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void checkAuth();
    return () => {
      cancelled = true;
    };
  }, []);

  const checkAuth = () => {
    // 관리자 3계정 외 로그인 금지: 세션스토리지 토큰만 검증
    const stored = sessionStorage.getItem('vh_admin_auth');
    if (stored && ADMIN_CREDENTIALS.some((cred) => btoa(`${cred.username}:${cred.password}`) === stored)) {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  };

  const handleAdminLogin = () => {
    const id = adminId.trim();
    const pw = adminPassword.trim();
    const matched = ADMIN_CREDENTIALS.find(
      (cred) => cred.username === id && cred.password === pw
    );
    if (matched) {
      sessionStorage.setItem('vh_admin_auth', btoa(`${matched.username}:${matched.password}`));
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('관리자 인증에 실패했습니다.');
      setAdminPassword('');
    }
  };

  if (isLoading) {
    return (
      <div className="admin-auth-page">
        <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: '#a78bfa' }} />
        <p style={{ marginTop: '14px', color: '#cbd5e1', fontWeight: 700 }}>인증 확인 중...</p>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="admin-auth-page">
        <div className="admin-auth-card">
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '20px',
              backgroundColor: 'rgba(99,102,241,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}
          >
            <ShieldCheck size={36} color="#6366f1" />
          </div>

          <h1>VeRoRo Admin</h1>
          <p>관리자 콘솔에 접근하려면 인증이 필요합니다.</p>
          <p style={{ marginTop: '-8px' }}>추가 가입은 불가하며 지정된 3명 관리자만 로그인할 수 있습니다.</p>

          <div className="admin-auth-field">
            <input
              type="text"
              placeholder="관리자 아이디 입력"
              value={adminId}
              onChange={(e) => { setAdminId(e.target.value); if (error) setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
            />
          </div>

          <div className="admin-auth-field" style={{ position: 'relative' }}>
            <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
            <input
              type="password"
              placeholder="관리자 비밀번호 입력"
              value={adminPassword}
              onChange={(e) => { setAdminPassword(e.target.value); if (error) setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
              style={{
                paddingLeft: '46px',
              }}
            />
          </div>

          {error && <p className="admin-auth-error">{error}</p>}

          <button onClick={handleAdminLogin} className="admin-auth-submit">
            인증하기
          </button>

          <div style={{ marginTop: '16px', fontSize: '12px', color: '#64748b', lineHeight: 1.6 }}>
            <div>허용 계정: rumi / young / jeong</div>
            <div>신규 관리자 가입: 불가</div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
