import { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { VIRAL_EVENT_CONFIG } from '../copy/marketing';
import { isKakaoShareConfigured, kakaoShareTextWithLink } from '../lib/kakaoShare';
import { notify } from '../store/useNotification';
import { VR } from '../lib/veroroDesign';
import { usePublicSettings } from '../lib/publicSettings';

const SHARE_PATH = '/event/personality-quiz';

/** 참여 절차 — 프로토타입 viralSteps */
const STEPS = [
  { n: '1', title: '성향 테스트 결과 공유', sub: '카카오톡으로 친구에게 보내기' },
  { n: '2', title: '친구가 앱에 들어오면 인정', sub: `해시태그 ${VIRAL_EVENT_CONFIG.hashtag} 권장` },
  { n: '3', title: '리워드 지급', sub: '인증 제출 후 확인되면 지급' },
];

export default function ViralEvent() {
  const { viralEventVisible } = usePublicSettings();
  const navigate = useNavigate();
  const [kakaoSharing, setKakaoSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareUrl = useMemo(() => `${window.location.origin}${SHARE_PATH}`, []);
  const shareText = useMemo(
    () =>
      `반려동물 성향 테스트 결과 공유 이벤트 참여해봐! ${VIRAL_EVENT_CONFIG.weeklyReward}, ${VIRAL_EVENT_CONFIG.monthlyReward} - ${shareUrl}`,
    [shareUrl]
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      window.prompt('아래 문구를 복사해 사용하세요.', shareText);
    }
  };

  const handleKakaoShare = async () => {
    if (!isKakaoShareConfigured()) {
      notify.warning('카카오 공유를 쓰려면 .env에 VITE_KAKAO_JAVASCRIPT_KEY를 설정해 주세요.');
      return;
    }
    setKakaoSharing(true);
    try {
      await kakaoShareTextWithLink({ text: shareText, linkUrl: shareUrl });
    } catch {
      notify.error('카카오톡 공유를 열지 못했어요. 복사 후 카톡에 붙여넣기 해 주세요.');
    } finally {
      setKakaoSharing(false);
    }
  };

  // 관리자 콘솔(시스템 설정)에서 이벤트 노출을 끌 수 있다.
  if (!viralEventVisible) {
    return (
      <div style={{ padding: '80px 24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '10px' }}>이벤트가 종료되었어요</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
          다음 이벤트로 곧 다시 찾아올게요.
        </p>
      </div>
    );
  }
  return (
    <div style={{ padding: '0 0 24px' }}>
      <Helmet>
        <title>{VIRAL_EVENT_CONFIG.eventTitle} - 베로로</title>
        <meta name="description" content="반려동물 성향 테스트 결과를 공유하고 리워드 이벤트에 참여하세요." />
      </Helmet>

      {/* 노란 히어로 */}
      <section className="vr-bleed" style={{ background: 'var(--vr-yellow)', padding: '28px 20px 32px' }}>
        <div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.06em', color: '#6B5C00' }}>
          친구 초대 이벤트
        </div>
        <h1 style={{ margin: '9px 0 0', fontSize: '31px', fontWeight: 800, letterSpacing: '-0.045em', lineHeight: 1.2, color: '#15150F' }}>
          친구도 우리 아이<br />사료 확인해봐
        </h1>
        <p style={{ margin: '11px 0 0', fontSize: '14px', fontWeight: 600, color: '#5C4F00', lineHeight: 1.55 }}>
          결과를 공유하고 인증하면 {VIRAL_EVENT_CONFIG.weeklyReward}.
        </p>
      </section>

      <div style={{ paddingTop: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
          {STEPS.map((s) => (
            <div key={s.n} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <span style={{
                width: '26px', height: '26px', borderRadius: '50%', flex: 'none',
                background: 'var(--vr-inverse)', color: '#FFD90A', fontSize: '12.5px', fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {s.n}
              </span>
              <span>
                <span style={{ display: 'block', fontSize: '14.5px', fontWeight: 800, letterSpacing: '-0.02em' }}>{s.title}</span>
                <span style={{ display: 'block', fontSize: '12.5px', color: VR.muted, marginTop: '2px' }}>{s.sub}</span>
              </span>
            </div>
          ))}
        </div>

        {/* 리워드 안내 */}
        <div className="vr-card" style={{ marginTop: '22px', borderRadius: '16px', padding: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 800, color: VR.sub }}>리워드</div>
          <ul style={{ margin: '8px 0 0', paddingLeft: '18px', color: 'var(--vr-body)', fontSize: '13px', lineHeight: 1.75 }}>
            <li>{VIRAL_EVENT_CONFIG.weeklyReward}</li>
            <li>{VIRAL_EVENT_CONFIG.monthlyReward}</li>
            <li>{VIRAL_EVENT_CONFIG.bonusReward}</li>
          </ul>
          <div style={{ fontSize: '12px', color: VR.muted, marginTop: '10px' }}>
            운영 기간 · {VIRAL_EVENT_CONFIG.periodLabel}
          </div>
        </div>

        <button
          type="button"
          className="vr-btn vr-btn--kakao"
          style={{ marginTop: '18px', padding: '16px', fontSize: '15.5px', opacity: kakaoSharing ? 0.75 : 1 }}
          disabled={kakaoSharing}
          onClick={() => void handleKakaoShare()}
        >
          {kakaoSharing ? '카카오톡 연결 중…' : '카카오톡으로 공유하기'}
        </button>

        <button
          type="button"
          className="vr-btn vr-btn--outline"
          style={{ marginTop: '9px' }}
          onClick={() => navigate(SHARE_PATH)}
        >
          성향 테스트 시작하기
        </button>

        <div style={{ display: 'flex', gap: '9px', marginTop: '9px' }}>
          <button type="button" className="vr-btn vr-btn--outline" onClick={() => void handleCopy()}>
            {copied ? '복사 완료' : '공유 문구 복사'}
          </button>
          <a
            href={VIRAL_EVENT_CONFIG.formUrl}
            target="_blank"
            rel="noreferrer"
            className="vr-btn vr-btn--outline"
            style={{ textDecoration: 'none' }}
          >
            인증 제출하기
          </a>
        </div>
      </div>
    </div>
  );
}
