import { useState, useEffect, type ReactNode } from 'react';
import { ShieldCheck, Lock, Loader2 } from 'lucide-react';
import { adminWrite } from '../../lib/supabase';
import { clearAdminSession, readAdminToken, storeAdminToken } from '../../lib/adminSession';
import './admin.css';

interface AdminAuthGuardProps {
  children: ReactNode;
}

export default function AdminAuthGuard({ children }: AdminAuthGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [adminId, setAdminId] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // 탭을 새로고침할 때도 세션 값만 믿지 않고 서버에서 다시 검증한다.
    const token = readAdminToken();
    let active = true;
    if (!token) {
      queueMicrotask(() => {
        if (active) setIsLoading(false);
      });
      return () => {
        active = false;
      };
    }
    adminWrite('verifyAdmin', {}, token)
      .then(() => {
        if (active) setIsAuthenticated(true);
      })
      .catch(() => {
        clearAdminSession();
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleAdminLogin = async () => {
    if (isSubmitting) return;
    const id = adminId.trim();
    const pw = adminPassword.trim();
    if (!id || !pw) {
      setError('아이디와 비밀번호를 입력해 주세요.');
      return;
    }
    // 자격증명은 클라이언트에 두지 않는다. 입력값으로 토큰을 만들어 서버(Edge Function)가 검증한다.
    const token = btoa(`${id}:${pw}`);
    setIsSubmitting(true);
    setError('');
    try {
      await adminWrite('verifyAdmin', {}, token);
      storeAdminToken(token);
      setIsAuthenticated(true);
    } catch {
      // 아이디 존재 여부를 구분하지 않는 단일 메시지 — 계정 열거 방지
      setError('아이디 또는 비밀번호를 확인해주세요.');
      setAdminPassword('');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="admin-auth-page">
        <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: '#FFD633' }} />
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
              backgroundColor: '#FFF8D6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}
          >
            <ShieldCheck size={36} color="#171712" />
          </div>

          <div className="admin-auth-wordmark">VERORO</div>
          <h1>Admin Console</h1>
          <p>관리자 계정으로 로그인하세요.</p>
          <p style={{ marginTop: '-8px' }}>추가 가입은 불가하며 지정된 관리자만 로그인할 수 있습니다.</p>

          <div className="admin-auth-field">
            <label htmlFor="admin-id" className="admin-visually-hidden">
              관리자 아이디
            </label>
            <input
              id="admin-id"
              type="text"
              autoComplete="username"
              placeholder="관리자 아이디 입력"
              value={adminId}
              onChange={(e) => { setAdminId(e.target.value); if (error) setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
            />
          </div>

          <div className="admin-auth-field" style={{ position: 'relative' }}>
            <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
            <label htmlFor="admin-password" className="admin-visually-hidden">
              관리자 비밀번호
            </label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              placeholder="관리자 비밀번호 입력"
              value={adminPassword}
              onChange={(e) => { setAdminPassword(e.target.value); if (error) setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
              style={{
                paddingLeft: '46px',
              }}
            />
          </div>

          {error && <p className="admin-auth-error" role="alert">{error}</p>}

          <button type="button" onClick={handleAdminLogin} className="admin-auth-submit" disabled={isSubmitting}>
            {isSubmitting ? '인증 중…' : '인증하기'}
          </button>

          <div style={{ marginTop: '16px', fontSize: '12px', color: '#64748b', lineHeight: 1.6 }}>
            <div>신규 관리자 가입: 불가</div>
            <div style={{ marginTop: '10px' }}>
              계정 문의:{' '}
              <a href="mailto:veroro@eternalsix.com" style={{ color: '#d4a900' }}>
                veroro@eternalsix.com
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
