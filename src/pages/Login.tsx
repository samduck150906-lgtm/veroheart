import { useMemo, useState, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { notify } from '../store/useNotification';
import { LogoChip } from '../components/Wordmark';
import { VR } from '../lib/veroroDesign';

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

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { initApp } = useStore();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [pendingVerification, setPendingVerification] = useState(false);
  const resendIntervalRef = useRef<number | null>(null);

  const redirectTo = useMemo(() => {
    const from = (location.state as { from?: string } | null)?.from;
    if (!from || from === '/login') return '/profile';
    return from;
  }, [location.state]);

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
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });
      if (error) throw error;
      notify.success('인증 메일을 다시 보냈어요. 스팸함도 확인해 주세요.');
      startResendCooldown();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes('rate limit') || msg.includes('429')) {
        notify.warning('요청이 너무 잦아요. 잠시 후 다시 시도해 주세요.');
      } else {
        notify.error(msg || '메일 재전송에 실패했어요.');
      }
    } finally {
      setResendLoading(false);
    }
  };

  const handleSubmit = async () => {
    const addr = email.trim();
    if (!addr || !password) {
      notify.error('이메일과 비밀번호를 입력해주세요.');
      return;
    }
    if (!isValidEmail(addr)) {
      notify.error('올바른 이메일 형식인지 확인해 주세요.');
      return;
    }
    if (mode === 'signup' && !passwordPolicyOk(password)) {
      notify.error('비밀번호 정책을 모두 충족해 주세요.');
      return;
    }

    setIsLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: addr, password });
        if (error) throw error;
        notify.success('로그인되었습니다!');
        await initApp();
        navigate(redirectTo, { replace: true });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: addr,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/login`,
          },
        });
        if (error) throw error;

        if (data.session) {
          notify.success('회원가입이 완료되었습니다!');
          setPendingVerification(false);
          await initApp();
          navigate(redirectTo, { replace: true });
        } else {
          notify.success('가입 확인 메일을 보냈어요. 메일의 링크를 눌러 인증을 마쳐 주세요.');
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
  const canSubmit = mode === 'login'
    ? Boolean(email.trim()) && password.length > 0
    : emailOk && passwordPolicyOk(password);

  return (
    <div style={{ padding: '22px 4px 40px' }}>
      <div style={{ marginBottom: '22px' }}>
        <LogoChip height={20} padding="11px 14px" radius={10} ariaLabel="VERORO" />
      </div>

      <h1 style={{ margin: '0 0 6px', fontSize: '26px', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.25 }}>
        {mode === 'login' ? '이메일로 로그인' : '이메일로 시작하기'}
      </h1>
      <p style={{ margin: '0 0 24px', fontSize: '13.5px', color: VR.muted, lineHeight: 1.55 }}>
        펫 프로필을 저장하면 맞춤 등급을 볼 수 있어.
      </p>

      {/* 로그인 / 회원가입 전환 */}
      <div style={{ display: 'flex', gap: '6px', background: 'var(--vr-soft)', padding: '4px', borderRadius: '12px', marginBottom: '18px' }}>
        {(['login', 'signup'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); setPendingVerification(false); }}
            style={{
              flex: 1, padding: '10px', borderRadius: '9px', border: 'none', cursor: 'pointer',
              fontSize: '13.5px', fontWeight: 800,
              background: mode === m ? 'var(--surface)' : 'transparent',
              color: mode === m ? 'var(--vr-ink)' : VR.sub,
            }}
          >
            {m === 'login' ? '로그인' : '회원가입'}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
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

      {/* 이메일 인증 재전송 — 소셜 로그인 대신 제공하는 보조 경로 */}
      <div className="vr-card" style={{ padding: '14px' }}>
        <div style={{ fontSize: '12.5px', fontWeight: 800, marginBottom: '6px' }}>인증 메일이 안 왔어?</div>
        <p style={{ margin: '0 0 10px', fontSize: '12px', color: VR.muted, lineHeight: 1.55 }}>
          가입 직후나 로그인이 안 될 때 다시 보낼 수 있어. 스팸함도 꼭 확인해줘.
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
          인증이 끝나면 로그인 탭에서 같은 이메일로 로그인해줘.
        </p>
      )}

      <p style={{ margin: '20px 0 0', fontSize: '11.5px', color: VR.faint, lineHeight: 1.6, textAlign: 'center' }}>
        가입하면{' '}
        <button
          type="button"
          onClick={() => navigate('/terms')}
          style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'inherit', textDecoration: 'underline', cursor: 'pointer' }}
        >
          이용약관
        </button>
        과 개인정보 처리방침에 동의하는 걸로 볼게. 소셜 로그인 없이 이메일과 비밀번호만 사용해.
      </p>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
