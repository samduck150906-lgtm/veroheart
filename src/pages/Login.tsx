import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { notify } from '../store/useNotification';
import { HOME_HERO } from '../copy/marketing';
import { VERORO_LOGO_SRC } from '../constants/assets';

export default function Login() {
  const navigate = useNavigate();
  const { initApp } = useStore();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      notify.error('이메일과 비밀번호를 입력해주세요.');
      return;
    }
    setIsLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        notify.success('로그인되었습니다!');
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        notify.success('회원가입 완료! 이메일을 확인해주세요.');
      }
      await initApp();
      navigate('/profile');
    } catch (err: any) {
      const msg = err?.message || '오류가 발생했습니다.';
      if (msg.includes('Invalid login credentials')) notify.error('이메일 또는 비밀번호가 올바르지 않습니다.');
      else if (msg.includes('User already registered')) notify.error('이미 가입된 이메일입니다.');
      else notify.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/profile' }
    });
    if (error) notify.error('구글 로그인에 실패했습니다.');
  };

  const handleKakao = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: { redirectTo: window.location.origin + '/profile' }
    });
    if (error) notify.error('카카오 로그인에 실패했습니다.');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-gradient)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 20px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: '#374151', fontWeight: 600 }}>
          <ArrowLeft size={20} /> 뒤로
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 28px 80px' }}>
        {/* 로고 */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <img
            src={VERORO_LOGO_SRC}
            alt="VeRoRo"
            style={{ height: '48px', width: 'auto', maxWidth: 'min(280px, 100%)', objectFit: 'contain', margin: '0 auto 18px', display: 'block' }}
          />
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '0', lineHeight: 1.5 }}>{HOME_HERO.sub}</p>
        </div>

        {/* 탭 */}
        <div style={{ display: 'flex', backgroundColor: 'rgba(255, 107, 74, 0.1)', borderRadius: '14px', padding: '4px', marginBottom: '28px' }}>
          {(['login', 'signup'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex: 1, padding: '12px', borderRadius: '10px', border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: '15px', transition: 'all 0.2s',
              background: mode === m ? '#fff' : 'transparent',
              color: mode === m ? '#111827' : '#9CA3AF',
              boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.08)' : 'none'
            }}>
              {m === 'login' ? '로그인' : '회원가입'}
            </button>
          ))}
        </div>

        {/* 입력 폼 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
          <div style={{ position: 'relative' }}>
            <Mail size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
            <input
              type="email"
              placeholder="이메일 주소"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              style={{ width: '100%', padding: '16px 16px 16px 46px', borderRadius: '14px', border: '1px solid #E5E7EB', fontSize: '16px', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ position: 'relative' }}>
            <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
            <input
              type={showPw ? 'text' : 'password'}
              placeholder="비밀번호"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              style={{ width: '100%', padding: '16px 46px 16px 46px', borderRadius: '14px', border: '1px solid #E5E7EB', fontSize: '16px', outline: 'none', boxSizing: 'border-box' }}
            />
            <button onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={isLoading}
          style={{ width: '100%', padding: '18px', borderRadius: '14px', background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)', color: '#fff', fontWeight: 800, fontSize: '16px', border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.7 : 1, marginBottom: '20px', boxShadow: 'var(--shadow-sm)' }}
        >
          {isLoading ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}
        </button>

        {/* 소셜 구분선 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{ flex: 1, height: '1px', background: '#E5E7EB' }} />
          <span style={{ fontSize: '13px', color: '#9CA3AF', fontWeight: 500 }}>또는</span>
          <div style={{ flex: 1, height: '1px', background: '#E5E7EB' }} />
        </div>

        {/* 소셜 로그인 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            onClick={handleKakao}
            style={{ width: '100%', padding: '16px', borderRadius: '14px', backgroundColor: '#FEE500', color: '#191919', fontWeight: 700, fontSize: '15px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <span style={{ fontSize: '18px' }}>💬</span> 카카오로 시작하기
          </button>
          <button
            onClick={handleGoogle}
            style={{ width: '100%', padding: '16px', borderRadius: '14px', backgroundColor: '#fff', color: '#374151', fontWeight: 700, fontSize: '15px', border: '1.5px solid #E5E7EB', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <span style={{ fontSize: '18px' }}>🌐</span> 구글로 시작하기
          </button>
        </div>
      </div>
    </div>
  );
}
