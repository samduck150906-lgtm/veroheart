import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { KeyRound, ArrowLeft } from 'lucide-react';
import './Login.css';

export default function PasswordRecovery() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    void supabase.auth
      .getUser()
      .then(({ data, error }) => {
        if (!active) return;
        setReady(Boolean(data.user) && !error);
        if (!data.user || error)
          setError(
            '재설정 링크가 만료되었거나 인증이 완료되지 않았습니다. 비밀번호 찾기를 다시 진행해 주세요.',
          );
      })
      .catch(() => {
        if (active)
          setError(
            '인증을 확인하지 못했습니다. 비밀번호 찾기를 다시 진행해 주세요.',
          );
      });
    return () => {
      active = false;
    };
  }, []);
  const valid =
    password.length >= 8 &&
    /[A-Za-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password) &&
    password === confirm;
  const save = async () => {
    if (!ready || !valid || busy) return;
    setBusy(true);
    setError('');
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await useStore.getState().logout();
      setDone(true);
      setPassword('');
      setConfirm('');
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : '비밀번호를 변경하지 못했습니다.',
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="account-recovery">
      <Link to="/login" className="account-recovery__back">
        <ArrowLeft size={17} /> 로그인으로 돌아가기
      </Link>
      <div className="account-recovery__icon">
        <KeyRound />
      </div>
      <h1>비밀번호 재설정</h1>
      {done ? (
        <p role="status">
          비밀번호를 변경했습니다. 새 비밀번호로{' '}
          <Link to="/login">로그인해 주세요.</Link>
        </p>
      ) : (
        <>
          <p className="account-recovery__intro">
            영문·숫자·특수문자를 포함하여 8자 이상 입력해 주세요.
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
          >
            <label>
              새 비밀번호
              <input
                className="vr-input"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={!ready || busy}
              />
            </label>
            <label>
              새 비밀번호 확인
              <input
                className="vr-input"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                disabled={!ready || busy}
              />
            </label>
            <button
              className="vr-btn vr-btn--primary"
              type="submit"
              disabled={!ready || !valid || busy}
            >
              {busy ? '변경 중…' : '비밀번호 변경'}
            </button>
          </form>
          {error && (
            <p className="account-recovery__error" role="alert">
              {error}
            </p>
          )}
          <p>
            <Link
              className="account-recovery__text-link"
              to="/account/find?mode=password"
            >
              비밀번호 찾기 다시 진행하기
            </Link>
          </p>
        </>
      )}
    </section>
  );
}
