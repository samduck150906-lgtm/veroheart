import { useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { useStore } from '../store/useStore';
import { notify } from '../store/useNotification';
import { completeAuthCallback, readAuthCallback, toNativeCallbackUrl } from '../lib/nativeAuth';
import { publicUrl } from '../lib/publicUrls';

/**
 * 인증 제공자가 거절했을 때 Supabase 는 code 대신 error 파라미터를 붙여 돌려보낸다.
 * 구현에 따라 쿼리스트링과 해시 어느 쪽에도 실릴 수 있어 둘 다 확인한다.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const { initApp } = useStore();
  // Capture before stripping credentials from browser history, and retain across StrictMode effects.
  const raw = useMemo(() => publicUrl(`/auth/callback${location.search}${location.hash}`), [location.search, location.hash]);
  const callback = readAuthCallback(raw);
  const nativeUrl = !Capacitor.isNativePlatform() && callback?.native ? toNativeCallbackUrl(raw) : null;

  useEffect(() => {
    let cancelled = false;
    window.history.replaceState(window.history.state, '', '/auth/callback');
    async function handleCallback() {
      if (nativeUrl) {
        window.location.assign(nativeUrl);
        return;
      }
      try {
        const { intent } = await completeAuthCallback(raw);
        if (cancelled) return;
        await initApp();
        if (cancelled) return;
        if (intent === 'recovery') {
          navigate('/auth/recovery', { replace: true });
          return;
        }
        notify.success('로그인되었습니다!');
        navigate('/', { replace: true });
      } catch (error) {
        if (cancelled) return;
        notify.error(error instanceof Error ? error.message : '로그인에 실패했습니다. 다시 시도해주세요.');
        navigate('/login', { replace: true });
      }
    }
    void handleCallback();
    return () => { cancelled = true; };
  }, [navigate, initApp, raw, nativeUrl]);

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
        {nativeUrl ? '앱으로 돌아가 인증을 완료해 주세요.' : '로그인 처리 중...'}
      </p>
      {nativeUrl && <a href={nativeUrl} style={{ fontWeight: 800, padding: 16 }}>베로로 앱에서 계속</a>}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
