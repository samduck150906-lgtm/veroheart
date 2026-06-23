import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Mail, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { supabase, ensurePublicUserExists } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { notify } from '../store/useNotification';

// 카카오 로고 SVG (공식 색상)
function KakaoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M10 2C5.582 2 2 4.895 2 8.455c0 2.267 1.446 4.254 3.624 5.393l-.922 3.37a.25.25 0 0 0 .376.274L9.19 15.1A9.48 9.48 0 0 0 10 15.91c4.418 0 8-2.895 8-6.455C18 4.895 14.418 2 10 2z" fill="#191919"/>
    </svg>
  );
}
import { LOGIN } from '../copy/ui';
import { VERORO_LOGO_SRC } from '../constants/assets';
import { TossButton } from '../components/TossUI';

function isValidEmail(value: string): boolean {
  const v = value.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { initApp } = useStore();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isKakaoLoading, setIsKakaoLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string; confirmPassword?: string }>({});

  const redirectTo = useMemo(() => {
    const from = (location.state as { from?: string } | null)?.from;
    if (!from || from === '/login') return '/profile';
    return from;
  }, [location.state]);

  const handleKakaoLogin = async () => {
    setIsKakaoLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: { redirectTo: `${window.location.origin}/profile` },
      });
      if (error) throw error;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '카카오 로그인에 실패했습니다.';
      notify.error(msg);
      setIsKakaoLoading(false);
    }
  };

  const handleSubmit = async () => {
    const addr = email.trim();
    const errors: { email?: string; password?: string; confirmPassword?: string } = {};
    if (!addr) errors.email = LOGIN.errors.emailRequired;
    else if (!isValidEmail(addr)) errors.email = LOGIN.errors.emailInvalid;
    if (!password) errors.password = LOGIN.errors.passwordRequired;
    else if (password.length < 8) errors.password = '비밀번호는 8자 이상이어야 합니다.';
    if (mode === 'signup') {
      if (!confirmPassword) errors.confirmPassword = '비밀번호 확인을 입력해 주세요.';
      else if (password !== confirmPassword) errors.confirmPassword = LOGIN.errors.passwordMismatch;
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setIsLoading(true);
    try {
      if (mode === 'login') {
        let { error } = await supabase.auth.signInWithPassword({ email: addr, password });
        if (error && error.message.toLowerCase().includes('email not confirmed')) {
          try {
            if (supabase.auth.admin) {
              const { data: listData, error: listErr } = await supabase.auth.admin.listUsers();
              if (!listErr && listData?.users) {
                const foundUser = (listData.users as any[]).find(u => u.email === addr);
                if (foundUser) {
                  const { error: confirmErr } = await supabase.auth.admin.updateUserById(foundUser.id, {
                    email_confirm: true
                  });
                  if (!confirmErr) {
                    const retry = await supabase.auth.signInWithPassword({ email: addr, password });
                    error = retry.error;
                  }
                }
              }
            }
          } catch (adminErr) {
            console.error('Login auto-confirm failed:', adminErr);
          }
        }
        if (error) throw error;

        // Ensure public.users entry exists defensively
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await ensurePublicUserExists(session.user.id, addr);
        }

        notify.success('로그인되었습니다!');
        await initApp();
        navigate(redirectTo, { replace: true });
      } else {
        let signUpSuccess = false;
        let createdUser = null;

        try {
          if (supabase.auth.admin) {
            const { data: adminData, error: adminError } = await supabase.auth.admin.createUser({
              email: addr,
              password,
              email_confirm: true
            });
            if (!adminError && adminData.user) {
              createdUser = adminData.user;
              signUpSuccess = true;
            }
          }
        } catch (err) {
          console.warn('Admin user creation failed, falling back to standard signup:', err);
        }

        if (signUpSuccess && createdUser) {
          const { error: signInErr } = await supabase.auth.signInWithPassword({
            email: addr,
            password
          });
          if (signInErr) throw signInErr;

          // Ensure public.users entry exists defensively
          await ensurePublicUserExists(createdUser.id, addr);

          notify.success('회원가입이 완료되었습니다!');
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
            if (data.user) {
              await ensurePublicUserExists(data.user.id, addr);
            }
            notify.success('회원가입이 완료되었습니다!');
            await initApp();
            navigate(redirectTo, { replace: true });
          } else {
            let autoConfirmed = false;
            try {
              const url = import.meta.env.VITE_SUPABASE_URL;
              const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
              if (url && anonKey) {
                const response = await fetch(`${url}/functions/v1/admin-auth`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${anonKey}`
                  },
                  body: JSON.stringify({
                    action: 'confirm',
                    email: addr
                  }),
                });
                if (response.ok) {
                  autoConfirmed = true;
                }
              }
            } catch (err) {
              console.warn('Signup auto-confirm edge function failed:', err);
            }

            if (autoConfirmed) {
              const signInResult = await supabase.auth.signInWithPassword({
                email: addr,
                password
              });
              if (!signInResult.error && signInResult.data.session) {
                if (signInResult.data.user) {
                  await ensurePublicUserExists(signInResult.data.user.id, addr);
                }
                notify.success('회원가입이 완료되었습니다!');
                await initApp();
                navigate(redirectTo, { replace: true });
                return;
              }
            }

            if (data.user) {
              await ensurePublicUserExists(data.user.id, addr);
            }
            notify.success('가입이 완료되었습니다. 이메일을 확인해 주세요.');
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const lower = msg.toLowerCase();
      if (msg.includes('Invalid login credentials')) {
        notify.error(LOGIN.errors.invalidCredentials);
      } else if (msg.includes('User already registered') || lower.includes('already registered')) {
        notify.error('이미 가입된 이메일입니다. 로그인을 시도해 주세요.');
      } else if (lower.includes('email not confirmed')) {
        notify.error('이메일 인증이 필요합니다. 메일함을 확인해 주세요.');
      } else {
        notify.error(msg || '오류가 발생했습니다.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-gradient)', display: 'flex', flexDirection: 'column' }}>
      <Helmet>
        <title>{mode === 'login' ? '로그인' : '회원가입'} | 베로로</title>
        <meta name="description" content="베로로 이메일 로그인 및 회원가입" />
      </Helmet>
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
            {mode === 'login' ? LOGIN.title : '베로로에 오신 걸 환영해요'}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.55 }}>{LOGIN.description}</p>
        </div>

        <div style={{ display: 'flex', backgroundColor: 'var(--primary-light)', borderRadius: '16px', padding: '4px', marginBottom: '22px' }}>
          {(['login', 'signup'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setFieldErrors({});
                setConfirmPassword('');
              }}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '12px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '15px',
                transition: 'all 0.2s',
                background: mode === m ? '#FFFFFF' : 'transparent',
                color: mode === m ? 'var(--primary-dark)' : 'var(--text-muted)',
                boxShadow: mode === m ? '0 2px 8px rgba(102, 181, 125, 0.08)' : 'none',
              }}
            >
              {m === 'login' ? '로그인' : '회원가입'}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
          {/* 이메일 */}
          <div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              border: fieldErrors.email ? '1.5px solid #EF4444' : '1.5px solid #E5E7EB',
              borderRadius: '14px', background: '#FFFFFF',
              padding: '0 16px', height: '54px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              transition: 'border-color 0.2s',
            }}>
              <Mail size={18} color="#9CA3AF" style={{ flexShrink: 0 }} />
              <input
                type="email"
                placeholder="이메일 주소"
                autoComplete="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setFieldErrors(prev => ({ ...prev, email: undefined })); }}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: '16px', color: '#111827' }}
              />
            </div>
            {fieldErrors.email && (
              <p style={{ margin: '5px 0 0 4px', fontSize: '12px', color: '#EF4444', fontWeight: 600 }}>{fieldErrors.email}</p>
            )}
          </div>

          {/* 비밀번호 */}
          <div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              border: fieldErrors.password ? '1.5px solid #EF4444' : '1.5px solid #E5E7EB',
              borderRadius: '14px', background: '#FFFFFF',
              padding: '0 16px', height: '54px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              transition: 'border-color 0.2s',
            }}>
              <Lock size={18} color="#9CA3AF" style={{ flexShrink: 0 }} />
              <input
                type={showPw ? 'text' : 'password'}
                placeholder="비밀번호 (8자 이상)"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setFieldErrors(prev => ({ ...prev, password: undefined })); }}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: '16px', color: '#111827' }}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'inline-flex', flexShrink: 0 }}
              >
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {fieldErrors.password && (
              <p style={{ margin: '5px 0 0 4px', fontSize: '12px', color: '#EF4444', fontWeight: 600 }}>{fieldErrors.password}</p>
            )}
          </div>

          {/* 비밀번호 확인 - 회원가입 시만 */}
          {mode === 'signup' && (
            <div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                border: fieldErrors.confirmPassword ? '1.5px solid #EF4444' : '1.5px solid #E5E7EB',
                borderRadius: '14px', background: '#FFFFFF',
                padding: '0 16px', height: '54px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                transition: 'border-color 0.2s',
              }}>
                <Lock size={18} color="#9CA3AF" style={{ flexShrink: 0 }} />
                <input
                  type={showConfirmPw ? 'text' : 'password'}
                  placeholder="비밀번호 확인"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setFieldErrors(prev => ({ ...prev, confirmPassword: undefined })); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: '16px', color: '#111827' }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw(!showConfirmPw)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'inline-flex', flexShrink: 0 }}
                >
                  {showConfirmPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <p style={{ margin: '5px 0 0 4px', fontSize: '12px', color: '#EF4444', fontWeight: 600 }}>{fieldErrors.confirmPassword}</p>
              )}
            </div>
          )}
        </div>

        <TossButton
          type="button"
          onClick={() => void handleSubmit()}
          disabled={isLoading || isKakaoLoading}
          style={{ width: '100%', height: '52px', fontSize: '16px' }}
        >
          {isLoading ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}
        </TossButton>

        {/* 소셜 로그인 구분선 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '18px 0' }}>
          <div style={{ flex: 1, height: '1px', background: '#E5E7EB' }} />
          <span style={{ fontSize: '12px', color: '#9CA3AF', fontWeight: 600 }}>또는</span>
          <div style={{ flex: 1, height: '1px', background: '#E5E7EB' }} />
        </div>

        {/* 카카오 로그인 */}
        <button
          type="button"
          onClick={() => void handleKakaoLogin()}
          disabled={isLoading || isKakaoLoading}
          style={{
            width: '100%', height: '52px', borderRadius: '14px',
            background: '#FEE500', border: 'none',
            cursor: isLoading || isKakaoLoading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            fontSize: '15px', fontWeight: 800, color: '#191919',
            opacity: isKakaoLoading ? 0.7 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          <KakaoIcon />
          {isKakaoLoading ? '카카오 로그인 중...' : '카카오로 시작하기'}
        </button>
      </div>
    </div>
  );
}
