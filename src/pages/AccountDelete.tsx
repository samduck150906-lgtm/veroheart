import { useState } from 'react';
import { Link } from 'react-router-dom';
import { manageAccount } from '../lib/supabase';
import { useStore } from '../store/useStore';
import { PRIVACY_CONTACT } from '../constants/privacyInfo';
import { rememberSelectedPet } from '../lib/petPreferences';

export default function AccountDelete() {
  const { userId, logout } = useStore();
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [deleted, setDeleted] = useState(false);
  const remove = async () => {
    if (!confirmed || busy || !userId) return;
    setBusy(true); setMessage('');
    try {
      await manageAccount('delete-account');
      rememberSelectedPet(userId, null);
      setDeleted(true);
      await logout().catch(() => undefined);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '삭제를 완료하지 못했습니다. 다시 시도해 주세요.');
    } finally { setBusy(false); }
  };
  return <div style={{ padding: '24px 4px 48px', lineHeight: 1.7 }}>
    <h1>계정 및 데이터 삭제</h1>
    <p>VeRoRo 계정을 삭제하면 로그인 정보, 반려동물 프로필, 급여 기록과 사진, 저장한 제품, 최근 본 제품, 별점 및 본인 스캔 제출 기록을 삭제합니다. 삭제 후 복구할 수 없습니다.</p>
    <p>이미 공개 카탈로그에 반영된 제품의 라벨·성분 정보는 계정과 분리된 제품 정보로 남을 수 있습니다. 서비스 제공자의 백업·보안 기록은 해당 제공자의 보존 설정에 따라 처리됩니다.</p>
    <p>사진 정리를 마친 뒤 계정을 삭제합니다. 중간에 실패하면 계정은 유지되며 새 사진 업로드가 제한될 수 있습니다. 이 페이지에서 다시 시도하면 남은 정리를 이어갑니다.</p>
    {deleted ? <p role="status">계정 삭제가 완료되었습니다.</p> : userId ? <>
      <label style={{ display: 'block', margin: '20px 0' }}><input type="checkbox" checked={confirmed} disabled={busy} onChange={(e) => setConfirmed(e.target.checked)} /> 삭제 범위를 확인했으며 계정을 영구 삭제합니다.</label>
      <button className="vr-btn vr-btn--primary" disabled={!confirmed || busy} onClick={() => void remove()}>{busy ? '사진과 계정 정리 중…' : '계정 영구 삭제'}</button>
      {message && <p role="alert">{message}</p>}
    </> : <p><Link to="/login" state={{ from: '/account/delete' }}>본인 계정으로 로그인하여 삭제하기</Link></p>}
    <p>로그인할 수 없다면 <Link to="/login">비밀번호 재설정</Link>을 이용하거나 <a href={`mailto:${PRIVACY_CONTACT}?subject=VeRoRo%20계정%20삭제%20요청`}>{PRIVACY_CONTACT}</a>으로 계정 삭제를 요청해 주세요. 비밀번호를 보내지 마세요. 본인 확인 후 처리합니다.</p>
    <Link to="/privacy">개인정보 처리방침</Link>
  </div>;
}
