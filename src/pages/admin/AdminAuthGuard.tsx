import { useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../../lib/supabase';
import { ShieldCheck, Lock, Loader2 } from 'lucide-react';

function parseAdminEmails(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

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
            베로로 Admin
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px', lineHeight: 1.55 }}>
            관리자 콘솔은 <strong style={{ color: '#94a3b8' }}>허용된 Supabase 계정</strong>으로 로그인한 경우에만 이용할 수 있습니다.
            일반 로그인 화면에서 해당 이메일로 로그인한 뒤 다시 접속해 주세요.
          </p>

          <a
            href="/login"
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              width: '100%', padding: '16px', borderRadius: '14px',
              backgroundColor: '#6366f1', color: '#fff', fontWeight: 700, fontSize: '16px',
              textDecoration: 'none', boxShadow: '0 8px 16px rgba(99,102,241,0.3)',
            }}
          >
            <Lock size={18} />
            로그인으로 이동
          </a>

          <p style={{ marginTop: '24px', fontSize: '12px', color: '#475569' }}>
            배포 시 빌드 환경 변수 <code style={{ color: '#a5b4fc' }}>VITE_ADMIN_EMAILS</code>에 관리자 이메일을 쉼표로 구분해 설정하세요.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
