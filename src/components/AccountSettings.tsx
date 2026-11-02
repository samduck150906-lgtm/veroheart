import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { ChevronRight, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { getCurrentUser, getUserProfile, manageAccount, supabase } from '../lib/supabase';
import { getAuthRedirectUrl } from '../lib/nativeAuth';
import { useStore } from '../store/useStore';
import { TossButton, TossCard, TossSectionTitle } from './TossUI';

const providerLabels: Record<string, string> = {
  email: '이메일', kakao: '카카오', google: 'Google', apple: 'Apple',
};

function firstAccountText(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

interface AccountDetails {
  user: User;
  nickname: string;
  phone: string;
}

export default function AccountSettings() {
  const { userId, logout } = useStore();
  const navigate = useNavigate();
  const [details, setDetails] = useState<AccountDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState<'reset' | 'cleanup' | 'logout' | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [message, setMessage] = useState('');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    setDetails(null);
    getCurrentUser().then(async (user) => {
      if (cancelled) return;
      if (!user || user.id !== userId) throw new Error('Account identity changed');
      const userProfile = await getUserProfile(user.id);
      if (cancelled) return;
      if (userProfile && userProfile.id !== userId) throw new Error('Account profile identity changed');
      const metadata = user.user_metadata ?? {};
      setDetails({
        user,
        nickname: firstAccountText(userProfile?.nickname, metadata.nickname, metadata.name, metadata.full_name),
        phone: firstAccountText(user.phone, metadata.phone_number, metadata.phone),
      });
    }).catch(() => {
      if (!cancelled) setLoadError(true);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [userId, retry]);

  const currentDetails = details?.user.id === userId ? details : null;
  const account = currentDetails?.user;
  const providers: string[] = account?.app_metadata.providers?.length
    ? account.app_metadata.providers
    : account?.app_metadata.provider ? [account.app_metadata.provider] : [];
  const canResetPassword = Boolean(account?.email && providers.includes('email'));

  const runAction = async (action: 'reset' | 'cleanup' | 'logout') => {
    if (busy || (action === 'reset' && (!canResetPassword || resetSent))) return;
    setBusy(action);
    setMessage('');
    setActionError('');
    try {
      if (action === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(account!.email!, { redirectTo: getAuthRedirectUrl('recovery') });
        if (error) throw error;
        setResetSent(true);
        setMessage('비밀번호 재설정 메일을 보냈습니다. 이 기기에서 링크를 열어 새 비밀번호를 설정해 주세요.');
      } else if (action === 'cleanup') {
        await manageAccount('cleanup-photos');
        setMessage('삭제 대기 사진 정리를 완료했습니다.');
      } else {
        await logout();
        navigate('/');
      }
    } catch {
      setActionError(action === 'reset'
        ? '메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.'
        : action === 'cleanup'
          ? '사진 정리를 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.'
          : '로그아웃하지 못했습니다. 연결을 확인한 뒤 다시 시도해 주세요.');
    } finally {
      setBusy(null);
    }
  };

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
    <TossCard style={{ padding: 20 }}>
      <TossSectionTitle title="계정 정보" subtitle="가입 정보와 연락처를 확인하세요." />
      {loading && <p role="status" style={{ color: 'var(--text-muted)' }}>계정 정보를 불러오는 중입니다.</p>}
      {loadError && <>
        <p role="alert">계정 정보를 불러오지 못했습니다. 연결을 확인하고 다시 시도해 주세요.</p>
        <TossButton variant="outline" onClick={() => setRetry((value) => value + 1)}>계정 정보 다시 불러오기</TossButton>
      </>}
      {account && <>
        <dl style={{ margin: '18px 0', display: 'grid', gap: 12, fontSize: 14 }}>
          <div><dt style={{ color: 'var(--text-muted)', marginBottom: 4 }}>닉네임 / 이름</dt><dd style={{ margin: 0, overflowWrap: 'anywhere', fontWeight: 700 }}>{currentDetails?.nickname || '등록된 닉네임이나 이름이 없습니다'}</dd></div>
          <div><dt style={{ color: 'var(--text-muted)', marginBottom: 4 }}>이메일 주소</dt><dd style={{ margin: 0, overflowWrap: 'anywhere', fontWeight: 700 }}>{account.email || '연결된 이메일이 없습니다'}</dd></div>
          <div><dt style={{ color: 'var(--text-muted)', marginBottom: 4 }}>휴대폰 번호</dt><dd style={{ margin: 0, overflowWrap: 'anywhere', fontWeight: 700 }}>{currentDetails?.phone || '등록된 휴대폰 번호가 없습니다'}</dd></div>
          <div><dt style={{ color: 'var(--text-muted)', marginBottom: 4 }}>로그인 방식</dt><dd style={{ margin: 0, fontWeight: 700 }}>{providers.map((provider) => providerLabels[provider] ?? '연결된 외부 계정').join(' · ') || '확인할 수 없습니다'}</dd></div>
        </dl>
        {canResetPassword
          ? <TossButton variant="outline" disabled={busy !== null || resetSent} onClick={() => void runAction('reset')}>{busy === 'reset' ? '메일을 보내는 중…' : '비밀번호 재설정 메일 받기'}</TossButton>
          : <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-muted)' }}>연결한 서비스의 계정 설정에서 로그인 정보를 관리해 주세요.</p>}
      </>}
    </TossCard>

    <TossCard style={{ padding: 20 }}>
      <TossSectionTitle title="데이터 관리" subtitle="사진 정리와 계정 삭제를 관리합니다." />
      <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-muted)' }}>기록에서 삭제한 사진의 정리가 끝나지 않았다면 다시 시도할 수 있습니다.</p>
      <TossButton variant="outline" disabled={busy !== null} onClick={() => void runAction('cleanup')}>{busy === 'cleanup' ? '사진을 정리하는 중…' : '삭제 대기 사진 정리 다시 시도'}</TossButton>
      <Link to="/account/delete" style={{ ...settingsLinkStyle, marginTop: 10, color: 'var(--danger-strong)' }}>계정 및 데이터 삭제 <ChevronRight size={17} /></Link>
    </TossCard>

    <TossCard style={{ padding: 20 }}>
      <TossSectionTitle title="서비스 안내" />
      <Link to="/terms" style={settingsLinkStyle}>이용약관 <ChevronRight size={17} /></Link>
      <Link to="/privacy" style={settingsLinkStyle}>개인정보 처리방침 <ChevronRight size={17} /></Link>
      <Link to="/refund" style={settingsLinkStyle}>환불 정책 <ChevronRight size={17} /></Link>
    </TossCard>

    {message && <p role="status" style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>{message}</p>}
    {actionError && <p role="alert" style={{ margin: 0, fontSize: 14, color: 'var(--danger-strong)' }}>{actionError}</p>}
    <TossButton variant="outline" disabled={busy !== null} onClick={() => void runAction('logout')}><LogOut size={16} /> {busy === 'logout' ? '로그아웃 중…' : '로그아웃'}</TossButton>
  </div>;
}

const settingsLinkStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
  minHeight: 44, padding: '10px 0', fontSize: 14, fontWeight: 700,
  color: 'var(--text-dark)', textDecoration: 'none',
};
