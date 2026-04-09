import { useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../../lib/supabase';
import { ShieldCheck, Lock, Loader2 } from 'lucide-react';
import './admin.css';

// 관리자 이메일 화이트리스트
const ADMIN_EMAILS = ['ceo@eternalsix.kr', 'admin@eternalsix.kr'];

// 관리자 아이디/비밀번호 (앱 오너 계정)
const ADMIN_CREDENTIALS = [
  { username: 'rumi', password: 'fnalfnal' },
  { username: 'young', password: 'duddlduddl' },
  { username: 'jeong', password: 'wjddlwjddl' },
] as const;

interface AdminAuthGuardProps {
  children: ReactNode;
}

export default function AdminAuthGuard({ children }: AdminAuthGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [adminId, setAdminId] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
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

      // 2차: 세션스토리지 확인 (아이디/비밀번호 인증)
      const stored = sessionStorage.getItem('vh_admin_auth');
      if (stored && ADMIN_CREDENTIALS.some((cred) => btoa(`${cred.username}:${cred.password}`) === stored)) {
        setIsAuthenticated(true);
      }
    } catch (err) {
      console.error('Admin auth check failed:', err);
    } finally {
      setIsLoading(false);
    }
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

          <p style={{ marginTop: '24px', fontSize: '12px', color: '#475569' }}>
            관리자 계정이 없으신가요? <a href="mailto:ceo@eternalsix.kr" style={{ color: '#6366f1' }}>문의</a>
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
