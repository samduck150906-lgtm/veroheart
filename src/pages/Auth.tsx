import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, CheckCircle2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { signUpWithEmail, signInWithEmail } from '../lib/supabase';
import { notify } from '../store/useNotification';
import { Button } from '../components/Button';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { initApp } = useStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      notify.error('이메일과 비밀번호를 입력해주세요.');
      return;
    }

    if (!isLogin && email !== confirmEmail) {
      notify.error('입력하신 이메일이 일치하지 않습니다.');
      return;
    }

    setIsLoading(true);

    try {
      if (isLogin) {
        const user = await signInWithEmail(email, password);
        if (user) {
          notify.success('로그인되었습니다!');
          await initApp();
          navigate('/');
        }
      } else {
        const user = await signUpWithEmail(email, password);
        if (user) {
          notify.success('회원가입이 완료되었습니다!');
          await initApp();
          navigate('/profile'); // Redirect to profile to fill out pet info
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '40px 20px', minHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 900, color: 'var(--text-dark)', marginBottom: '12px', letterSpacing: '-0.03em', whiteSpace: 'pre-line', lineHeight: 1.35 }}>
          {isLogin ? '반갑습니다!\n베로하트입니다.' : '베로하트와 함께\n아이의 건강을 챙겨요!'}
        </h1>
        <p style={{ fontSize: '15px', color: 'var(--text-muted)' }}>
          {isLogin ? '가입하신 이메일로 로그인해주세요.' : '회원가입을 위해 이메일을 입력해주세요.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '8px' }}>
            이메일
          </label>
          <div style={{ position: 'relative' }}>
            <Mail size={20} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', zIndex: 2 }} />
            <input 
              type="email" 
              placeholder="vero@heart.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ 
                width: '100%', padding: '16px 16px 16px 48px', borderRadius: '16px', 
                border: '1.5px solid #E5E8EB', fontSize: '16px', outline: 'none',
                backgroundColor: '#F9FAFB', transition: 'all 0.2s', boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.backgroundColor = '#FFFFFF';
                e.currentTarget.style.boxShadow = '0 0 0 4px rgba(79, 70, 229, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#E5E8EB';
                e.currentTarget.style.backgroundColor = '#F9FAFB';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>
        </div>

        {!isLogin && (
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '8px' }}>
              이메일 확인
            </label>
            <div style={{ position: 'relative' }}>
              <CheckCircle2 size={20} color={email === confirmEmail && confirmEmail ? 'var(--safe)' : 'var(--text-muted)'} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', zIndex: 2 }} />
              <input 
                type="email" 
                placeholder="이메일을 한 번 더 입력해주세요"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                style={{ 
                  width: '100%', padding: '16px 16px 16px 48px', borderRadius: '16px', 
                  border: email === confirmEmail && confirmEmail ? '1.5px solid var(--safe)' : '1.5px solid #E5E8EB', 
                  fontSize: '16px', outline: 'none', backgroundColor: '#F9FAFB', 
                  transition: 'all 0.2s', boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  if (email !== confirmEmail || !confirmEmail) {
                    e.currentTarget.style.borderColor = 'var(--primary)';
                    e.currentTarget.style.boxShadow = '0 0 0 4px rgba(79, 70, 229, 0.1)';
                  }
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = email === confirmEmail && confirmEmail ? 'var(--safe)' : '#E5E8EB';
                  e.currentTarget.style.backgroundColor = '#F9FAFB';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>
        )}

        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '8px' }}>
            비밀번호
          </label>
          <div style={{ position: 'relative' }}>
            <Lock size={20} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', zIndex: 2 }} />
            <input 
              type="password" 
              placeholder="비밀번호 (6자리 이상)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ 
                width: '100%', padding: '16px 16px 16px 48px', borderRadius: '16px', 
                border: '1.5px solid #E5E8EB', fontSize: '16px', outline: 'none',
                backgroundColor: '#F9FAFB', transition: 'all 0.2s', boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.backgroundColor = '#FFFFFF';
                e.currentTarget.style.boxShadow = '0 0 0 4px rgba(79, 70, 229, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#E5E8EB';
                e.currentTarget.style.backgroundColor = '#F9FAFB';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>
        </div>

        <Button
          type="submit"
          title={isLogin ? '로그인' : '회원가입'}
          loading={isLoading}
          style={{ marginTop: '24px', height: '56px', borderRadius: '20px', fontSize: '17px' }}
        />

        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <button 
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
          >
            {isLogin ? '아직 회원이 아니신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
          </button>
        </div>
      </form>
    </div>
  );
}
