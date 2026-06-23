// @ts-nocheck
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useStore } from '../store/useStore';
import Analyzer from '../components/Analyzer';
import { SIGNUP_PROMPT } from '../copy/ui';

export default function ScanResult() {
  const navigate = useNavigate();
  const { isLoggedIn, profile } = useStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1800);
    return () => clearTimeout(t);
  }, []);

  const messages = ['성분표 인식 중...', '데이터베이스 조회 중...', '분석 완료!'];
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    if (!loading) return;
    const t = setInterval(() => {
      setMsgIdx(prev => Math.min(prev + 1, messages.length - 1));
    }, 600);
    return () => clearInterval(t);
  }, [loading]);

  const hasPetProfile = isLoggedIn && profile?.name && profile.name !== '우리 아이';
  const allergyCount = profile?.allergies?.length ?? 0;
  const concernCount = profile?.healthConcerns?.length ?? 0;

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F7F4EE' }}>
        <div style={{ fontSize: 56, marginBottom: 20 }}>🔍</div>
        <div style={{ width: 48, height: 48, border: '4px solid rgba(245,197,24,0.3)', borderTopColor: '#F5C518', borderRadius: '50%', animation: 'spin 0.85s linear infinite', marginBottom: 20 }} />
        <p style={{ fontSize: 16, fontWeight: 700, color: '#191F28' }}>{messages[msgIdx]}</p>
        <p style={{ fontSize: 13, color: '#8B95A1', marginTop: 6 }}>AI가 성분을 분석하고 있어요</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px', paddingBottom: 90 }}>
      {/* ─── 반려동물 프로필 컨텍스트 배너 ─── */}
      {hasPetProfile ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '13px 16px', borderRadius: '14px', marginBottom: '16px',
          background: 'var(--brand-tint)', border: '1px solid var(--brand-line)',
        }}>
          <span style={{ fontSize: '26px', lineHeight: 1 }}>
            {profile.species === 'Cat' ? '🐱' : '🐾'}
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13.5px', fontWeight: 800, color: 'var(--ink)' }}>
              {profile.name} 기준으로 분석해요
            </div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--brand-deep)', marginTop: '2px' }}>
              {[
                allergyCount > 0 && `회피 성분 ${allergyCount}개`,
                concernCount > 0 && `건강 고민 ${concernCount}개`,
              ].filter(Boolean).join(' · ') || '알레르기·고민 없음'}
            </div>
          </div>
          <button
            onClick={() => navigate('/profile')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700, color: 'var(--brand-deep)', textDecoration: 'underline', padding: 0 }}
          >
            수정
          </button>
        </div>
      ) : (
        <div style={{
          display: 'flex', gap: '10px', alignItems: 'flex-start',
          padding: '13px 16px', borderRadius: '14px', marginBottom: '16px',
          background: '#FFFBEB', border: '1px solid #FDE68A',
        }}>
          <AlertCircle size={16} color="#D97706" style={{ flexShrink: 0, marginTop: '1px' }} />
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#92400E' }}>
              {SIGNUP_PROMPT.analysisGate.title}
            </div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#92400E', opacity: 0.8, marginTop: '2px', lineHeight: 1.5 }}>
              {SIGNUP_PROMPT.analysisGate.description}{' '}
              <button
                onClick={() => navigate('/login')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D97706', fontWeight: 800, padding: 0, textDecoration: 'underline' }}
              >
                {SIGNUP_PROMPT.analysisGate.cta}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Analyzer (OCR 텍스트 검토 + 분석 결과) ─── */}
      <Analyzer initialMode="text" />
    </div>
  );
}
