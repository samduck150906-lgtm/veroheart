import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { notify } from '../store/useNotification';

/**
 * OAuth 리다이렉트 콜백 핸들러.
 * 카카오/애플 등 소셜 로그인 후 Supabase가 이 URL로 리다이렉트한다.
 * URL에 담긴 code/token을 SDK가 자동 교환하고, 세션을 확립한 뒤 홈으로 이동.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const { initApp } = useStore();

  useEffect(() => {
    let cancelled = false;

    async function handleCallback() {
      // Supabase SDK v2가 URL 파라미터(code, access_token 등)를 자동 처리한다.
      const { data, error } = await supabase.auth.getSession();

      if (cancelled) return;

      if (error || !data.session) {
        notify.error('로그인에 실패했습니다. 다시 시도해주세요.');
        navigate('/login', { replace: true });
        return;
      }

      await initApp();
      notify.success('로그인되었습니다!');
      navigate('/', { replace: true });
    }

    handleCallback();
    return () => { cancelled = true; };
  }, [navigate, initApp]);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100dvh', gap: '20px',
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: '50%',
        border: '4px solid #E5E8EB', borderTopColor: 'var(--brand, #FFC928)',
        animation: 'spin 0.8s linear infinite',
      }} />
      <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--ink-faint, #888)' }}>
        로그인 처리 중...
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
