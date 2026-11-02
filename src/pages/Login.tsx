import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getAuthRedirectUrl } from '../lib/nativeAuth';
import { PRIVACY_VERSION } from '../constants/privacyInfo';
import { useStore } from '../store/useStore';
import { notify } from '../store/useNotification';
import { LogoChip } from '../components/Wordmark';
import { VR } from '../lib/veroroDesign';
import { usePublicSettings } from '../lib/publicSettings';
import { isKakaoLoginEnabled, signInWithKakao } from '../lib/kakaoAuth';
import {
  NICKNAME_MAX_LENGTH,
  checkNicknameAvailable,
  validateNickname,
  type NicknameAvailability,
} from '../lib/nickname';

const PASSWORD_RULES = [
  {
    id: 'len',
    label: '8자 이상',
    shortLabel: '8자 이상',
    test: (pw: string) => pw.length >= 8,
  },
  {
    id: 'letter',
    label: '영문(A–Z, a–z) 1자 이상',
    shortLabel: '영문 포함',
    test: (pw: string) => /[a-zA-Z]/.test(pw),
  },
  {
    id: 'digit',
    label: '숫자 1자 이상',
    shortLabel: '숫자 포함',
    test: (pw: string) => /[0-9]/.test(pw),
  },
  {
    id: 'special',
    label: '특수문자 1자 이상 (!@#$%^&* 등)',
    shortLabel: '특수문자 포함',
    test: (pw: string) => /[^A-Za-z0-9]/.test(pw),
  },
] as const;

function isValidEmail(value: string): boolean {
  const v = value.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function passwordPolicyOk(password: string): boolean {
  return PASSWORD_RULES.every((r) => r.test(password));
}

const RESEND_COOLDOWN_SEC = 60;
/** 닉네임 중복 확인 디바운스(ms) — 타자 중 매 글자마다 조회하지 않는다. */
const NICKNAME_CHECK_DEBOUNCE_MS = 400;

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { initApp } = useStore();
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  // 관리자 콘솔(시스템 설정)에서 신규 가입을 잠글 수 있다.
  const { signupEnabled } = usePublicSettings();
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [nicknameStatus, setNicknameStatus] = useState<NicknameAvailability>('idle');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [kakaoLoading, setKakaoLoading] = useState(false);
  const resendIntervalRef = useRef<number | null>(null);
  // 카카오 키가 준비되기 전에는 버튼을 잠가 둔다 (lib/kakaoAuth 참고).
  const kakaoReady = isKakaoLoginEnabled();

  // 가입 모드에서만, 형식이 맞는 닉네임에 대해 중복 여부를 미리 확인한다.
  useEffect(() => {
    if (mode !== 'signup') {
      setNicknameStatus('idle');
      return;
    }
    if (validateNickname(nickname)) {
      setNicknameStatus('idle');
      return;
    }
    let cancelled = false;
    setNicknameStatus('checking');
    const timer = window.setTimeout(() => {
      checkNicknameAvailable(nickname).then((status) => {
        if (!cancelled) setNicknameStatus(status);
      });
    }, NICKNAME_CHECK_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [mode, nickname]);

  const redirectTo = useMemo(() => {
    const from = (location.state as { from?: string } | null)?.from;
    if (!from || from === '/login') return '/profile';
    return from;
  }, [location.state]);

  useEffect(() => () => {
    if (resendIntervalRef.current != null) window.clearInterval(resendIntervalRef.current);
  }, []);

  const startResendCooldown = useCallback(() => {
    if (resendIntervalRef.current != null) {
      window.clearInterval(resendIntervalRef.current);
      resendIntervalRef.current = null;
    }
    setResendCooldown(RESEND_COOLDOWN_SEC);
    resendIntervalRef.current = window.setInterval(() => {
      setResendCooldown((s) => {
        if (s <= 1) {
          if (resendIntervalRef.current != null) {
            window.clearInterval(resendIntervalRef.current);
            resendIntervalRef.current = null;
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, []);

  const handleResendVerification = async () => {
    const addr = email.trim();
    if (!addr) {
      notify.error('이메일 주소를 입력해 주세요.');
      return;
    }
    if (!isValidEmail(addr)) {
      notify.error('이메일 형식을 확인해 주세요.');
      return;
    }
    if (resendCooldown > 0 || resendLoading) return;

    setResendLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: addr,
        options: {
          emailRedirectTo: getAuthRedirectUrl(),
        },
      });
      if (error) throw error;
      notify.success('인증 메일을 다시 보냈습니다. 스팸함도 확인해 주세요.');
      startResendCooldown();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes('rate limit') || msg.includes('429')) {
        notify.warning('요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요.');
      } else {
        notify.error(msg || '메일 재전송에 실패했습니다.');
      }
    } finally {
      setResendLoading(false);
    }
  };

  const requestPasswordReset = async () => {
    if (!isValidEmail(email) || resetLoading || resendCooldown > 0) return;
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: getAuthRedirectUrl('recovery') });
      if (error) throw error;
      notify.success('가입된 이메일이면 재설정 메일을 받을 수 있습니다. 같은 기기에서 링크를 열어 주세요.');
      startResendCooldown();
    } catch { notify.error('재설정 메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.'); }
    finally { setResetLoading(false); }
  };

  const handleKakao = async () => {
    if (kakaoLoading) return;
    if (!privacyAccepted) { notify.warning('개인정보 처리 안내와 약관을 확인해 주세요.'); return; }
    if (mode === 'signup' && !signupEnabled) {
      notify.error('현재 신규 회원 가입이 일시 중단되었습니다.');
      return;
    }
    setKakaoLoading(true);
    try {
      // 성공하면 카카오 인증 페이지로 이동하므로 이 아래는 실행되지 않는다.
      const failure = await signInWithKakao(getAuthRedirectUrl());
      if (failure) {
        notify.error(failure.message);
        setKakaoLoading(false);
      }
    } catch (err: unknown) {
      notify.error(err instanceof Error ? err.message : '카카오 로그인에 실패했습니다.');
      setKakaoLoading(false);
    }
  };

  const handleSubmit = async () => {
    const addr = email.trim();
    if (!addr || !password) {
      notify.error('이메일과 비밀번호를 입력해 주세요.');
      return;
    }
    if (!isValidEmail(addr)) {
      notify.error('올바른 이메일 형식인지 확인해 주세요.');
      return;
    }
    if (mode === 'signup' && !signupEnabled) {
      notify.error('현재 신규 회원 가입이 일시 중단되었습니다.');
      return;
    }
    if (mode === 'signup' && !privacyAccepted) { notify.warning('개인정보 처리 안내와 약관을 확인해 주세요.'); return; }
    if (mode === 'signup' && !passwordPolicyOk(password)) {
      notify.error('비밀번호 정책을 모두 충족해 주세요.');
      return;
    }
    if (mode === 'signup') {
      const invalidNickname = validateNickname(nickname);
      if (invalidNickname) {
        notify.error(invalidNickname);
        return;
      }
      if (nicknameStatus === 'taken') {
        notify.error('이미 사용 중인 닉네임입니다. 다른 닉네임을 골라 주세요.');
        return;
      }
    }

    setIsLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: addr, password });
        if (error) throw error;
        notify.success('로그인되었습니다.');
        await initApp();
        navigate(redirectTo, { replace: true });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: addr,
          password,
          options: {
            emailRedirectTo: getAuthRedirectUrl(),
            // handle_new_user 트리거가 이 값을 그대로 public.users.nickname 으로 옮긴다.
            // 관리자 회원 관리에 보이는 이름도 같은 값이다.
            data: { nickname: nickname.trim(), privacy_policy_version: PRIVACY_VERSION, privacy_acknowledged: true },
          },
        });
        if (error) throw error;

        if (data.session) {
          notify.success('회원가입이 완료되었습니다.');
          setPendingVerification(false);
          await initApp();
          navigate(redirectTo, { replace: true });
        } else {
          notify.success('가입 확인 메일을 보냈습니다. 메일의 링크를 눌러 인증을 마쳐 주세요.');
          setPendingVerification(true);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const lower = msg.toLowerCase();
      if (msg.includes('Invalid login credentials')) {
        notify.error('이메일 또는 비밀번호가 올바르지 않습니다.');
      } else if (msg.includes('User already registered') || lower.includes('already registered')) {
        notify.error('이미 가입된 이메일입니다. 로그인을 시도해 주세요.');
      } else if (lower.includes('signup_disabled') || lower.includes('signup disabled')) {
        // DB 트리거(enforce_signup_enabled)가 막은 경우. 프론트 스위치가 캐시 때문에
        // 아직 열려 있어도 서버에서 걸리므로, 원문 대신 같은 안내를 보여준다.
        notify.error('현재 신규 회원 가입이 일시 중단되었습니다.');
      } else if (lower.includes('users_nickname_unique') || (lower.includes('duplicate key') && lower.includes('nickname'))) {
        notify.error('이미 사용 중인 닉네임입니다. 다른 닉네임을 골라 주세요.');
        setNicknameStatus('taken');
      } else if (lower.includes('email not confirmed')) {
        notify.error('이메일 인증이 아직 완료되지 않았습니다. 메일함을 확인하거나 아래에서 재전송해 주세요.');
        setPendingVerification(true);
      } else {
        notify.error(msg || '오류가 발생했습니다.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const emailOk = isValidEmail(email);
  const nicknameError = mode === 'signup' && nickname.trim() ? validateNickname(nickname) : null;
  const canSubmit = mode === 'login'
    ? Boolean(email.trim()) && password.length > 0
    : emailOk
      && privacyAccepted
      && passwordPolicyOk(password)
      && !validateNickname(nickname)
      && nicknameStatus !== 'taken'
      && nicknameStatus !== 'checking';

  return (
    <div style={{ padding: '22px 4px 40px' }}>
      <div style={{ marginBottom: '22px' }}>
        <LogoChip height={20} padding="11px 14px" radius={10} ariaLabel="VERORO" />
      </div>

      <h1 style={{ margin: '0 0 6px', fontSize: '26px', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.25 }}>
        {mode === 'login' ? '이메일로 로그인' : '이메일로 시작하기'}
      </h1>
      <p style={{ margin: '0 0 24px', fontSize: '13.5px', color: VR.muted, lineHeight: 1.55 }}>
        반려동물 프로필을 저장하면 맞춤 등급을 볼 수 있습니다.
      </p>

      {/* 로그인 / 회원가입 전환 */}
      <div style={{ display: 'flex', gap: '6px', background: 'var(--vr-soft)', padding: '4px', borderRadius: '12px', marginBottom: '18px' }}>
        {(['login', 'signup'] as const).map((m) => (
          <button
            key={m}
            type="button"
            disabled={m === 'signup' && !signupEnabled}
            title={m === 'signup' && !signupEnabled ? '신규 가입이 일시 중단되었습니다.' : undefined}
            onClick={() => { setMode(m); setPendingVerification(false); }}
            style={{
              flex: 1, padding: '10px', borderRadius: '9px', border: 'none',
              cursor: m === 'signup' && !signupEnabled ? 'not-allowed' : 'pointer',
              fontSize: '13.5px', fontWeight: 800,
              background: mode === m ? 'var(--surface)' : 'transparent',
              color: mode === m ? 'var(--vr-ink)' : VR.sub,
              opacity: m === 'signup' && !signupEnabled ? 0.45 : 1,
            }}
          >
            {m === 'login' ? '로그인' : '회원가입'}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
        {mode === 'signup' && (
          <div>
            <input
              type="text"
              className="vr-input"
              placeholder="닉네임 (2~20자, 공백 없이)"
              autoComplete="nickname"
              maxLength={NICKNAME_MAX_LENGTH}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void handleSubmit()}
              aria-label="닉네임"
              aria-describedby="nickname-status"
            />
            <p
              id="nickname-status"
              role="status"
              style={{
                margin: '6px 2px 0',
                fontSize: '12px',
                fontWeight: 700,
                minHeight: '16px',
                color: nicknameError || nicknameStatus === 'taken'
                  ? 'var(--danger-strong, #DC2626)'
                  : nicknameStatus === 'available'
                    ? 'var(--safe-strong)'
                    : VR.faint,
              }}
            >
              {nicknameError
                ?? (nicknameStatus === 'checking'
                  ? '중복 확인 중…'
                  : nicknameStatus === 'taken'
                    ? '이미 사용 중인 닉네임입니다.'
                    : nicknameStatus === 'available'
                      ? '사용할 수 있는 닉네임입니다.'
                      : '앱과 관리자 화면에 이 이름으로 표시됩니다.')}
            </p>
          </div>
        )}
        <input
          type="email"
          className="vr-input"
          placeholder="이메일"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void handleSubmit()}
          aria-label="이메일"
        />
        <div style={{ position: 'relative' }}>
          <input
            type={showPw ? 'text' : 'password'}
            className="vr-input"
            style={{ paddingRight: '50px' }}
            placeholder="비밀번호"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void handleSubmit()}
            aria-label="비밀번호"
          />
          <button
            type="button"
            onClick={() => setShowPw(!showPw)}
            aria-label={showPw ? '비밀번호 숨기기' : '비밀번호 보기'}
            style={{
              position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: VR.sub, display: 'inline-flex',
            }}
          >
            {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      {mode === 'signup' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '14px' }}>
          {PASSWORD_RULES.map((rule) => {
            const ok = rule.test(password);
            return (
              <div key={rule.id} style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <span style={{
                  width: '16px', height: '16px', borderRadius: '50%', flex: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: ok ? 'var(--safe-strong)' : 'var(--vr-card-line)',
                }}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={ok ? '#fff' : 'var(--vr-line)'} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: ok ? 'var(--safe-strong)' : VR.faint }}>
                  {rule.shortLabel}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {mode === 'login' && <button type="button" className="vr-btn vr-btn--outline" style={{ marginTop: 14 }} disabled={!emailOk || resetLoading || resendCooldown > 0} onClick={() => void requestPasswordReset()}>{resetLoading ? '메일 전송 중…' : resendCooldown > 0 ? `${resendCooldown}초 후 메일 다시 요청` : '비밀번호 재설정 메일 받기'}</button>}
      <label style={{ display: 'block', marginTop: 18, fontSize: 13, lineHeight: 1.7 }}>
        <input type="checkbox" checked={privacyAccepted} onChange={(e) => setPrivacyAccepted(e.target.checked)} />
        회원가입 또는 카카오로 계속하기 전에 <a href="/terms" target="_blank" rel="noreferrer">이용약관</a>과 <a href="/privacy" target="_blank" rel="noreferrer">개인정보 처리방침</a>을 확인하고 동의합니다.
      </label>

      <button
        type="button"
        className="vr-btn vr-btn--primary"
        style={{ marginTop: '22px', padding: '16px', fontSize: '15.5px' }}
        onClick={() => void handleSubmit()}
        disabled={isLoading || !canSubmit}
      >
        {isLoading ? '처리 중…' : mode === 'login' ? '로그인' : '가입하고 시작하기'}
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '22px 0' }}>
        <span style={{ flex: 1, height: '1px', background: 'var(--vr-card-line)' }} />
        <span style={{ fontSize: '11.5px', color: VR.faint, fontWeight: 700 }}>또는</span>
        <span style={{ flex: 1, height: '1px', background: 'var(--vr-card-line)' }} />
      </div>

      {/* 카카오로 계속하기 — 로그인/회원가입 공용 (첫 로그인 시 계정이 생성된다) */}
      <button
        type="button"
        onClick={() => void handleKakao()}
        disabled={!kakaoReady || kakaoLoading || !privacyAccepted}
        aria-label={kakaoReady ? '카카오로 계속하기' : '카카오 로그인 준비 중'}
        title={kakaoReady ? undefined : '카카오 로그인은 준비 중입니다.'}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '9px',
          padding: '15px', borderRadius: '12px', border: 'none',
          background: '#FEE500', color: '#191600',
          fontSize: '14.5px', fontWeight: 800, letterSpacing: '-0.02em',
          cursor: kakaoReady && !kakaoLoading ? 'pointer' : 'not-allowed',
          opacity: kakaoReady ? (kakaoLoading ? 0.65 : 1) : 0.45,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 3C6.99 3 2.93 6.2 2.93 10.15c0 2.53 1.67 4.75 4.19 6.01-.18.65-.67 2.42-.77 2.8-.12.47.17.46.36.34.15-.1 2.39-1.63 3.36-2.29.63.09 1.27.14 1.93.14 5.01 0 9.07-3.2 9.07-7.15S17.01 3 12 3z" />
        </svg>
        {kakaoReady
          ? (kakaoLoading ? '카카오로 이동 중…' : '카카오로 계속하기')
          : '카카오로 계속하기 (준비 중)'}
      </button>
      {!kakaoReady && (
        <p style={{ margin: '8px 0 0', fontSize: '11.5px', color: VR.faint, lineHeight: 1.55, textAlign: 'center' }}>
          카카오 로그인은 준비 중입니다. 이메일로 가입해 주세요.
        </p>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '22px 0' }}>
        <span style={{ flex: 1, height: '1px', background: 'var(--vr-card-line)' }} />
        <span style={{ fontSize: '11.5px', color: VR.faint, fontWeight: 700 }}>도움말</span>
        <span style={{ flex: 1, height: '1px', background: 'var(--vr-card-line)' }} />
      </div>

      {/* 이메일 인증 재전송 */}
      <div className="vr-card" style={{ padding: '14px' }}>
        <div style={{ fontSize: '12.5px', fontWeight: 800, marginBottom: '6px' }}>인증 메일을 받지 못한 경우</div>
        <p style={{ margin: '0 0 10px', fontSize: '12px', color: VR.muted, lineHeight: 1.55 }}>
          가입 직후나 로그인할 수 없을 때 다시 보낼 수 있습니다. 스팸함도 확인해 주세요.
        </p>
        <button
          type="button"
          className="vr-btn vr-btn--outline"
          style={{ padding: '12px', fontSize: '13.5px' }}
          onClick={() => void handleResendVerification()}
          disabled={resendLoading || resendCooldown > 0}
        >
          <RefreshCw size={15} style={{ animation: resendLoading ? 'spin 0.85s linear infinite' : undefined }} />
          {resendCooldown > 0 ? `${resendCooldown}초 후 다시 보내기` : '인증 메일 다시 보내기'}
        </button>
      </div>

      {pendingVerification && (
        <p style={{ margin: '12px 0 0', fontSize: '11.5px', color: 'var(--caution-strong)', lineHeight: 1.55, fontWeight: 700 }}>
          인증 후 로그인 탭에서 같은 이메일로 로그인해 주세요.
        </p>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
