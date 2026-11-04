import { useEffect, useState } from 'react';
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  KeyRound,
  Mail,
  UserRound,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { COMPANY } from '../constants/companyInfo';
import {
  KAKAO_ACCOUNT_HELP,
  KAKAO_PASSWORD_HELP,
  requestAccountRecovery,
  validRecoveryEmail,
} from '../lib/accountRecovery';
import './Login.css';

export default function FindAccount() {
  const [params, setParams] = useSearchParams();
  const location = useLocation(),
    navigate = useNavigate();
  const mode = params.get('mode') === 'password' ? 'password' : 'id';
  const verified = params.get('verified') === '1';
  const initialEmail = (location.state as { email?: string } | null)?.email;
  const [email, setEmail] = useState(
    typeof initialEmail === 'string' ? initialEmail : '',
  );
  const [busy, setBusy] = useState(false),
    [sent, setSent] = useState(false);
  const [error, setError] = useState(
    params.get('link') === 'expired'
      ? '링크가 만료되었거나 유효하지 않습니다. 새 링크를 요청해 주세요.'
      : '',
  );
  const [cooldown, setCooldown] = useState(0);
  const [accountEmail, setAccountEmail] = useState('');
  const [checking, setChecking] = useState(verified);
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(
      () => setCooldown((v) => Math.max(0, v - 1)),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [cooldown]);
  useEffect(() => {
    if (!verified) return;
    let active = true;
    supabase.auth
      .getUser()
      .then(({ data, error }) => {
        if (!active) return;
        if (error || !data.user?.email)
          setError(
            '본인 확인을 완료하지 못했습니다. 계정 확인 링크를 다시 요청해 주세요.',
          );
        else setAccountEmail(data.user.email);
      })
      .catch(() => {
        if (active)
          setError('계정 정보를 확인하지 못했습니다. 다시 시도해 주세요.');
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, [verified]);
  const selectMode = (next: 'id' | 'password') => {
    if (busy) return;
    setSent(false);
    setError('');
    setAccountEmail('');
    setChecking(false);
    setParams({ mode: next }, { replace: true });
  };
  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || cooldown > 0) return;
    if (!validRecoveryEmail(email)) {
      setError('올바른 이메일 주소를 입력해 주세요.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await requestAccountRecovery(mode, email);
      setSent(true);
      setCooldown(60);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : '요청하지 못했습니다. 다시 시도해 주세요.',
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <section
      className="account-recovery"
      aria-labelledby="account-recovery-title"
    >
      <Link to="/login" className="account-recovery__back">
        <ArrowLeft size={17} /> 로그인으로 돌아가기
      </Link>
      <div className="account-recovery__icon">
        {accountEmail ? (
          <Check />
        ) : mode === 'id' ? (
          <UserRound />
        ) : (
          <KeyRound />
        )}
      </div>
      <h1 id="account-recovery-title">
        {accountEmail
          ? '로그인 아이디를 확인했어요'
          : mode === 'id'
            ? '아이디를 잊었어요!'
            : '비밀번호를 잊었어요!'}
      </h1>
      {!accountEmail && (
        <p className="account-recovery__intro">
          {mode === 'id'
            ? '베로로는 가입한 이메일 주소를 아이디로 사용해요.'
            : '가입한 이메일로 본인 확인 후 새 비밀번호를 설정할 수 있어요.'}
        </p>
      )}
      <div className="account-recovery__tabs" aria-label="계정 찾기 방법">
        <button
          type="button"
          aria-pressed={mode === 'id'}
          disabled={busy}
          onClick={() => selectMode('id')}
        >
          아이디 찾기
        </button>
        <button
          type="button"
          aria-pressed={mode === 'password'}
          disabled={busy}
          onClick={() => selectMode('password')}
        >
          비밀번호 찾기
        </button>
      </div>
      {checking ? (
        <p role="status">본인 확인을 마무리하고 있어요.</p>
      ) : accountEmail ? (
        <div className="account-recovery__verified">
          <p>본인 확인된 계정의 로그인 이메일</p>
          <strong>{accountEmail}</strong>
          <button
            type="button"
            className="vr-btn vr-btn--primary"
            onClick={() => navigate('/profile', { replace: true })}
          >
            이 계정으로 계속하기 <ArrowRight size={17} />
          </button>
          <Link to="/auth/recovery" className="account-recovery__text-link">
            새 비밀번호도 설정할게요
          </Link>
        </div>
      ) : (
        <>
          <div className="account-recovery__email-section">
            <h2>
              <Mail size={18} /> 이메일로 가입했어요
            </h2>
            <p>
              {mode === 'id'
                ? '기억나는 이메일로 확인 링크를 받아보세요. 링크에서 본인 확인을 마치면 로그인 아이디를 보여드려요.'
                : '이메일로 받은 재설정 링크에서 새 비밀번호를 설정해 주세요.'}
            </p>
            <form onSubmit={(event) => void send(event)} noValidate>
              <label htmlFor="account-recovery-email">
                {mode === 'id' ? '확인할 이메일' : '가입한 이메일'}
              </label>
              <input
                id="account-recovery-email"
                className="vr-input"
                type="email"
                autoComplete="email"
                inputMode="email"
                maxLength={254}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setSent(false);
                  setError('');
                }}
                placeholder="example@email.com"
                disabled={busy}
                aria-invalid={!!error}
                aria-describedby={error ? 'account-recovery-error' : undefined}
              />
              {error && (
                <p
                  className="account-recovery__error"
                  id="account-recovery-error"
                  role="alert"
                >
                  {error}
                </p>
              )}
              <button
                type="submit"
                className="vr-btn vr-btn--primary"
                disabled={busy || cooldown > 0}
              >
                {busy
                  ? '요청 중…'
                  : cooldown > 0
                    ? `${cooldown}초 후 다시 요청`
                    : mode === 'id'
                      ? '계정 확인 링크 받기'
                      : '비밀번호 재설정하기'}
              </button>
            </form>
            {sent && (
              <div className="account-recovery__notice" role="status">
                <Check size={18} />
                <div>
                  <strong>메일함을 확인해 주세요</strong>
                  <p>
                    입력한 이메일로 가입한 계정이 있다면 안내를 받을 수 있어요.
                    가장 최근에 받은 링크를 이 브라우저에서 열어 주세요.
                  </p>
                </div>
              </div>
            )}
          </div>
          <div className="account-recovery__social">
            <h2>카카오로 가입했어요</h2>
            <p>카카오 계정은 카카오에서 로그인 정보를 찾을 수 있어요.</p>
            <a
              href={mode === 'id' ? KAKAO_ACCOUNT_HELP : KAKAO_PASSWORD_HELP}
              target="_blank"
              rel="noreferrer"
            >
              {mode === 'id' ? '카카오계정 찾기 안내' : '카카오 비밀번호 찾기 안내'}{' '}
              <ArrowRight size={16} />
            </a>
          </div>
          <details className="account-recovery__help">
            <summary>가입한 이메일도 기억나지 않아요</summary>
            <p>
              자주 쓰는 메일함에서 ‘베로로’ 또는 ‘VeRoRo’를 검색해 보세요.
              이메일에 접근할 수 없다면 고객센터에 문의해 주세요.
            </p>
            <a
              href={`mailto:${COMPANY.email}?subject=${encodeURIComponent('[베로로] 계정 찾기 문의')}`}
            >
              계정 찾기 문의하기
            </a>
          </details>
        </>
      )}
    </section>
  );
}
