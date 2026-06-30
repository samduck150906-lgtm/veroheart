// @ts-nocheck
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { ScanLine, AlertCircle } from 'lucide-react';
import { useStore } from '../store/useStore';
import Analyzer from '../components/Analyzer';

const LOADING_MESSAGES = ['성분표 인식 중...', '데이터베이스 조회 중...', '분석 완료!'];

export default function ScanResult() {
  const navigate = useNavigate();
  const { isLoggedIn, profile } = useStore();
  const [loading, setLoading] = useState(true);

  const hasPetProfile =
    isLoggedIn && profile?.id && profile.id !== 'local-profile' &&
    profile.name && profile.name !== '우리 아이';

  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    if (!loading) return;
    const t = setInterval(() => {
      setMsgIdx(prev => Math.min(prev + 1, LOADING_MESSAGES.length - 1));
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
        <p style={{ fontSize: 16, fontWeight: 700, color: '#191F28' }}>{LOADING_MESSAGES[msgIdx]}</p>
        <p style={{ fontSize: 13, color: '#8B95A1', marginTop: 6 }}>AI가 성분을 분석하고 있어요</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: '96px' }}>
      <Helmet>
        <title>스캔 성분 분석 | 베로로</title>
        <meta name="description" content="촬영한 사료 성분표를 OCR로 인식해 분석합니다." />
      </Helmet>

      {/* ─── 페이지 헤더 ─── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 0 12px' }}>
        <span style={{ width: '36px', height: '36px', borderRadius: '11px', background: 'var(--brand-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ScanLine size={18} color="var(--brand-deep)" strokeWidth={2.2} />
        </span>
        <div>
          <div style={{ fontSize: '19px', fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.02em' }}>성분표 스캔 분석</div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-faint)', marginTop: '1px' }}>
            OCR 인식 결과를 확인·수정 후 분석
          </div>
        </div>
      </div>

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
              반려동물 프로필이 없어요
            </div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#92400E', opacity: 0.8, marginTop: '2px', lineHeight: 1.5 }}>
              프로필을 등록하면 알레르기·고민 기반 맞춤 분석이 가능해요.{' '}
              <button
                onClick={() => navigate('/login')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D97706', fontWeight: 800, padding: 0, textDecoration: 'underline' }}
              >
                로그인하기
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
