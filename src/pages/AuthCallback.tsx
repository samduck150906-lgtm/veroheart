import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { useStore } from '../store/useStore';
import { notify } from '../store/useNotification';
import { completeAuthCallback, readAuthCallback, toNativeCallbackUrl } from '../lib/nativeAuth';
import { publicUrl } from '../lib/publicUrls';
import { consumeAuthReturn } from '../lib/authReturn';
import { supabase } from '../lib/supabase';
import { PRIVACY_VERSION } from '../constants/privacyInfo';

/**
 * 인증 제공자가 거절했을 때 Supabase 는 code 대신 error 파라미터를 붙여 돌려보낸다.
 * 구현에 따라 쿼리스트링과 해시 어느 쪽에도 실릴 수 있어 둘 다 확인한다.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const { initApp } = useStore();
  const [consentRequired, setConsentRequired] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [savingConsent, setSavingConsent] = useState(false);
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
        if (intent === 'signin') {
          const { data, error } = await supabase.auth.getUser();
          if (error || !data.user) throw new Error('계정 정보를 확인하지 못했습니다. 다시 로그인해 주세요.');
          if (data.user.user_metadata?.privacy_acknowledged !== true) {
            setConsentRequired(true);
            return;
          }
        }
        await initApp();
        if (cancelled) return;
        if (intent === 'recovery') {
          navigate('/auth/recovery', { replace: true });
          return;
        }
        if (intent === 'account') {
          navigate('/account/find?mode=id&verified=1', { replace: true });
          return;
        }
        notify.success('로그인되었습니다!');
        navigate(consumeAuthReturn(), { replace: true });
      } catch (error) {
        if (cancelled) return;
        notify.error(error instanceof Error ? error.message : '로그인에 실패했습니다. 다시 시도해 주세요.');
        navigate(callback?.intent === 'account' ? '/account/find?mode=id&link=expired' : callback?.intent === 'recovery' ? '/account/find?mode=password&link=expired' : '/login', { replace: true });
      }
    }
    void handleCallback();
    return () => { cancelled = true; };
  }, [navigate, initApp, raw, nativeUrl, callback?.intent]);

  if (consentRequired) return <section style={{ padding: 24 }}>
    <h1>처음 이용하는 계정의 필수 안내</h1>
    <p>동의 기록이 있는 기존 계정은 이 단계를 다시 거치지 않습니다.</p>
    <p><a href="/terms" target="_blank" rel="noreferrer">이용약관</a> · <a href="/privacy" target="_blank" rel="noreferrer">개인정보 처리방침</a></p>
    <label><input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} /> 이용약관 및 개인정보 처리방침에 동의합니다. (필수)</label>
    <button type="button" disabled={!accepted || savingConsent} onClick={async () => {
      if (!accepted || savingConsent) return;
      setSavingConsent(true);
      try {
        const { error } = await supabase.auth.updateUser({ data: { privacy_acknowledged: true, privacy_policy_version: PRIVACY_VERSION } });
        if (error) throw error;
        await initApp(); navigate(consumeAuthReturn(), { replace: true });
      } catch { notify.error('동의 기록을 저장하지 못했습니다. 다시 시도해 주세요.'); }
      finally { setSavingConsent(false); }
    }}>{savingConsent ? '저장 중…' : '동의하고 계속하기'}</button>
  </section>;

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
