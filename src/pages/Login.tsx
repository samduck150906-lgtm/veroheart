// @ts-nocheck
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { notify } from '../store/useNotification';
import { HOME_HERO } from '../copy/marketing';
import { LOGIN } from '../copy/ui';
import { VERORO_LOGO_SRC } from '../constants/assets';
import { TossButton } from '../components/TossUI';

const PawIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
    <g fill="#F5C518">
      <ellipse cx="7" cy="9" rx="1.9" ry="2.5" />
      <ellipse cx="12" cy="7.4" rx="1.9" ry="2.6" />
      <ellipse cx="17" cy="9" rx="1.9" ry="2.5" />
      <path d="M12 11.5c-2.6 0-4.7 1.9-4.7 4.2 0 1.7 1.4 2.6 3 2.6.7 0 1.2-.2 1.7-.2s1 .2 1.7.2c1.6 0 3-.9 3-2.6 0-2.3-2.1-4.2-4.7-4.2z" />
    </g>
  </svg>
);

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { initApp } = useStore();
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const redirectTo = (location.state as any)?.from ?? '/';

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
    setIsLoading(true);
    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
        notify.success('회원가입이 완료됐어요! 이메일 인증 후 로그인해 주세요.');
        setIsSignup(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
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
    } catch (err: any) {
      notify.error(err.message || '로그인에 실패했어요. 다시 시도해 주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBrowse = () => {
    navigate('/', { replace: true });
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F7F4EE',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '0 24px',
    }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: '60px', paddingBottom: '20px' }}>
        <div style={{
          width: 80, height: 80, borderRadius: 24,
          background: 'linear-gradient(135deg, #F5C518 0%, #E8A800 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 20,
          boxShadow: '0 8px 24px rgba(245,197,24,0.3)',
        }}>
          <PawIcon />
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: '#191F28', letterSpacing: '-0.04em', marginBottom: 8 }}>베로로</h1>
        <p style={{ fontSize: 16, color: '#4E5968', fontWeight: 500, textAlign: 'center', lineHeight: 1.6 }}>
          반려동물 건강 식단 파트너
        </p>
        <p style={{ fontSize: 14, color: '#8B95A1', marginTop: 6, textAlign: 'center' }}>
          성분 분석으로 우리 아이 맞춤 사료를 찾아보세요
        </p>
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

        {!showEmailForm ? (
          <button
            onClick={() => setShowEmailForm(true)}
            style={{
              width: '100%', height: 50, borderRadius: 14,
              background: 'transparent', border: '1.5px solid #E5E8EB', cursor: 'pointer',
              fontSize: 15, fontWeight: 600, color: '#4E5968',
              marginBottom: 16,
            }}
          >
            이메일로 로그인
          </button>
        ) : (
          <div style={{ marginBottom: 16 }}>
            <input
              type="email"
              placeholder="이메일"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{
                width: '100%', height: 50, borderRadius: 12,
                border: '1.5px solid #E5E8EB', padding: '0 16px',
                fontSize: 15, color: '#191F28', background: '#fff',
                marginBottom: 10, boxSizing: 'border-box', outline: 'none',
              }}
            />
            <input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleEmailAuth()}
              style={{
                width: '100%', height: 50, borderRadius: 12,
                border: '1.5px solid #E5E8EB', padding: '0 16px',
                fontSize: 15, color: '#191F28', background: '#fff',
                marginBottom: 12, boxSizing: 'border-box', outline: 'none',
              }}
            />
            <button
              onClick={handleEmailAuth}
              disabled={isLoading}
              style={{
                width: '100%', height: 50, borderRadius: 14,
                background: '#F5C518', border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: 16, fontWeight: 700, color: '#191F28',
                opacity: isLoading ? 0.7 : 1, marginBottom: 10,
              }}
            >
              {isLoading ? '처리 중...' : (isSignup ? '회원가입' : '로그인')}
            </button>
            <button
              onClick={() => setIsSignup(!isSignup)}
              style={{
                width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, color: '#8B95A1', fontWeight: 500,
              }}
            >
              {isSignup ? '이미 계정이 있으신가요? 로그인' : '계정이 없으신가요? 회원가입'}
            </button>
          </div>
        )}

        <div style={{ textAlign: 'center' }}>
          <button
            onClick={handleBrowse}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 14, color: '#8B95A1', fontWeight: 500,
              textDecoration: 'underline', textUnderlineOffset: 3,
            }}
          >
            로그인 없이 둘러보기
          </button>
        </div>

        <p style={{ fontSize: 12, color: '#B0B8C1', textAlign: 'center', marginTop: 24, lineHeight: 1.6 }}>
          로그인 시 이용약관과 개인정보처리방침에 동의하게 됩니다.
        </p>
      </div>
    </div>
  );
}
