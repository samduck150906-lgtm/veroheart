import { useMemo, useState, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, RefreshCw, Check, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { notify } from '../store/useNotification';
import { HOME_HERO } from '../copy/marketing';
import { VERORO_LOGO_SRC } from '../constants/assets';

const PASSWORD_RULES = [
  {
    id: 'len',
    label: '8자 이상',
    test: (pw: string) => pw.length >= 8,
  },
  {
    id: 'letter',
    label: '영문(A–Z, a–z) 1자 이상',
    test: (pw: string) => /[a-zA-Z]/.test(pw),
  },
  {
    id: 'digit',
    label: '숫자 1자 이상',
    test: (pw: string) => /[0-9]/.test(pw),
  },
  {
    id: 'special',
    label: '특수문자 1자 이상 (!@#$%^&* 등)',
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

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-gradient)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 20px' }}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: '#374151', fontWeight: 600 }}
        >
          <ArrowLeft size={20} /> 뒤로
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 28px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img
            src={VERORO_LOGO_SRC}
            alt="VeRoRo"
            style={{ height: '48px', width: 'auto', maxWidth: 'min(280px, 100%)', objectFit: 'contain', margin: '0 auto 14px', display: 'block' }}
          />
          <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#111827', margin: '0 0 6px', lineHeight: 1.35 }}>
            {mode === 'login' ? '이메일로 로그인' : '이메일로 회원가입'}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.55 }}>{HOME_HERO.sub}</p>
        </div>

        <div style={{ display: 'flex', backgroundColor: 'rgba(250, 204, 21, 0.2)', borderRadius: '14px', padding: '4px', marginBottom: '22px' }}>
          {(['login', 'signup'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setPendingVerification(false);
              }}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '15px',
                transition: 'all 0.2s',
                background: mode === m ? '#fff' : 'transparent',
                color: mode === m ? '#111827' : '#9CA3AF',
                boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              {m === 'login' ? '로그인' : '회원가입'}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '16px' }}>
          <div style={{ position: 'relative' }}>
            <Mail size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
            <input
              type="email"
              placeholder="이메일 주소"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              style={{ width: '100%', padding: '16px 16px 16px 46px', borderRadius: '14px', border: '1px solid #E5E7EB', fontSize: '16px', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ position: 'relative' }}>
            <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
            <input
              type={showPw ? 'text' : 'password'}
              placeholder="비밀번호"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              style={{ width: '100%', padding: '16px 46px 16px 46px', borderRadius: '14px', border: '1px solid #E5E7EB', fontSize: '16px', outline: 'none', boxSizing: 'border-box' }}
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}
            >
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {mode === 'signup' && (
          <div
            style={{
              marginBottom: '18px',
              padding: '12px 14px',
              borderRadius: '12px',
              background: '#F9FAFB',
              border: '1px solid #E5E7EB',
            }}
          >
            <p style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 800, color: '#374151' }}>비밀번호 정책</p>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: '6px' }}>
              {PASSWORD_RULES.map((rule) => {
                const ok = rule.test(password);
                return (
                  <li
                    key={rule.id}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: ok ? '#059669' : '#6B7280', fontWeight: 600 }}
                  >
                    {ok ? <Check size={14} strokeWidth={2.5} /> : <X size={14} strokeWidth={2.5} />}
                    {rule.label}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '18px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
            color: '#fff',
            fontWeight: 800,
            fontSize: '16px',
            border: 'none',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.7 : 1,
            marginBottom: '14px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {isLoading ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}
        </button>

        <div style={{ marginBottom: '14px', padding: '12px 14px', borderRadius: '12px', background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
          <p style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 800, color: '#1E40AF' }}>이메일 인증</p>
          <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#1D4ED8', lineHeight: 1.5, fontWeight: 600 }}>
            가입 직후 또는 로그인이 안 될 때, 아래 버튼으로 인증 메일을 다시 보낼 수 있어요. 스팸함도 꼭 확인해 주세요.
          </p>
          <button
            type="button"
            onClick={() => void handleResendVerification()}
            disabled={resendLoading || resendCooldown > 0}
            style={{
              width: '100%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px',
              borderRadius: '10px',
              border: '1px solid #93C5FD',
              background: '#fff',
              color: '#1D4ED8',
              fontWeight: 800,
              fontSize: '13px',
              cursor: resendLoading || resendCooldown > 0 ? 'not-allowed' : 'pointer',
              opacity: resendLoading || resendCooldown > 0 ? 0.65 : 1,
            }}
          >
            <RefreshCw size={16} style={{ animation: resendLoading ? 'spin 0.85s linear infinite' : undefined }} />
            {resendCooldown > 0 ? `${resendCooldown}초 후 다시 보내기` : '인증 메일 다시 보내기'}
          </button>
        </div>

        {(pendingVerification || mode === 'signup') && (
          <div style={{ marginBottom: '12px', padding: '10px 12px', borderRadius: '10px', background: '#FFFBEB', border: '1px solid #FDE68A' }}>
            <p style={{ margin: 0, fontSize: '11px', color: '#92400E', lineHeight: 1.5, fontWeight: 600 }}>
              {pendingVerification
                ? '인증이 끝나면 로그인 탭에서 같은 이메일로 로그인해 주세요.'
                : '회원가입 후 메일 인증이 필요할 수 있어요. 메일이 안 오면 재전송 버튼을 눌러 주세요.'}
            </p>
          </div>
        )}

        <p style={{ margin: 0, textAlign: 'center', fontSize: '12px', color: '#9CA3AF', lineHeight: 1.5 }}>
          소셜 로그인 없이 이메일과 비밀번호만 사용합니다.
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
