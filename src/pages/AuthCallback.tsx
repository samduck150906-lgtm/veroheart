import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { notify } from '../store/useNotification';
import { describeKakaoAuthError } from '../lib/kakaoAuth';

/**
 * 인증 제공자가 거절했을 때 Supabase 는 code 대신 error 파라미터를 붙여 돌려보낸다.
 * 구현에 따라 쿼리스트링과 해시 어느 쪽에도 실릴 수 있어 둘 다 확인한다.
 */
function readOAuthError(): string | null {
  if (typeof window === 'undefined') return null;
  const sources = [
    new URLSearchParams(window.location.search),
    new URLSearchParams(window.location.hash.replace(/^#/, '')),
  ];
  for (const params of sources) {
    const description = params.get('error_description') ?? params.get('error_code') ?? params.get('error');
    if (description) return description;
  }
  return null;
}

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
      // 제공자가 거절한 경우(제공자 미설정, 가입 잠금 등)에는 세션 교환을 기다릴 필요가 없다.
      // 원문 대신 이메일 로그인과 같은 안내 문구로 옮겨 보여준다.
      const oauthError = readOAuthError();
      if (oauthError) {
        if (cancelled) return;
        notify.error(describeKakaoAuthError(decodeURIComponent(oauthError)).message);
        navigate('/login', { replace: true });
        return;
      }

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
