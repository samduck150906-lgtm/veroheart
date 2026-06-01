import { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Copy, ExternalLink, Share2, CheckCircle2 } from 'lucide-react';
import { VIRAL_EVENT_CONFIG } from '../copy/marketing';
import { isKakaoShareConfigured, kakaoShareTextWithLink } from '../lib/kakaoShare';
import { notify } from '../store/useNotification';

const SHARE_PATH = '/event/personality-quiz';

export default function ViralEvent() {
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

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: VIRAL_EVENT_CONFIG.eventTitle,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch {
        // User cancelled or share unavailable. Fallback to copy.
      }
    }
    handleCopy();
  };

  const handleKakaoShare = async () => {
    if (!isKakaoShareConfigured()) {
      notify.warning('카카오 공유를 쓰려면 .env에 VITE_KAKAO_JAVASCRIPT_KEY를 설정해 주세요.');
      return;
    }
    setKakaoSharing(true);
    try {
      await kakaoShareTextWithLink({
        text: shareText,
        linkUrl: shareUrl,
      });
    } catch {
      notify.error('카카오톡 공유를 열지 못했어요. 복사 후 카톡에 붙여넣기 해 주세요.');
    } finally {
      setKakaoSharing(false);
    }
  };

  return (
    <div style={{ paddingBottom: '32px' }}>
      <Helmet>
        <title>{VIRAL_EVENT_CONFIG.eventTitle} - 베로로</title>
        <meta
          name="description"
          content="반려동물 성향 테스트 결과를 공유하고 리워드 이벤트에 참여하세요."
        />
      </Helmet>

      <section
        style={{
          marginBottom: '18px',
          padding: '20px',
          borderRadius: '20px',
          background: 'linear-gradient(150deg, #FFF7ED 0%, #FFFFFF 100%)',
          border: '1px solid #FED7AA',
        }}
      >
        <p style={{ fontSize: '11px', fontWeight: 800, color: '#C2410C', margin: '0 0 8px' }}>
          EVENT
        </p>
        <h1 style={{ fontSize: '22px', margin: '0 0 8px', color: '#7C2D12', fontWeight: 900 }}>
          {VIRAL_EVENT_CONFIG.eventTitle}
        </h1>
        <p style={{ fontSize: '13px', color: '#9A3412', margin: 0, lineHeight: 1.6, fontWeight: 600 }}>
          성향 테스트 결과를 SNS에 공유하고 인증하면 리워드를 받을 수 있어요.
        </p>
      </section>

      <section style={{ marginBottom: '16px', background: '#fff', border: '1px solid #E5E7EB', borderRadius: '16px', padding: '16px' }}>
        <h2 style={{ margin: '0 0 10px', fontSize: '16px', fontWeight: 800 }}>리워드 안내</h2>
        <ul style={{ margin: 0, paddingLeft: '18px', color: '#374151', fontSize: '14px', lineHeight: 1.7 }}>
          <li>{VIRAL_EVENT_CONFIG.weeklyReward}</li>
          <li>{VIRAL_EVENT_CONFIG.monthlyReward}</li>
          <li>{VIRAL_EVENT_CONFIG.bonusReward}</li>
          <li>운영 기간: {VIRAL_EVENT_CONFIG.periodLabel}</li>
        </ul>
      </section>

      <section style={{ marginBottom: '16px', background: '#fff', border: '1px solid #E5E7EB', borderRadius: '16px', padding: '16px' }}>
        <h2 style={{ margin: '0 0 10px', fontSize: '16px', fontWeight: 800 }}>참여 방법</h2>
        <div style={{ display: 'grid', gap: '10px' }}>
          {[
            '반려동물 성향 테스트 완료',
            `결과 화면 공유 (해시태그 ${VIRAL_EVENT_CONFIG.hashtag} 권장)`,
            '공유 링크 또는 캡처로 인증 제출',
          ].map((item) => (
            <div key={item} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '14px', color: '#374151' }}>
              <CheckCircle2 size={16} color="#16A34A" style={{ marginTop: '2px', flexShrink: 0 }} />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>

      <section style={{ display: 'grid', gap: '8px' }}>
        <button type="button" className="btn btn-primary" onClick={handleShare} style={{ height: '48px', borderRadius: '12px', fontWeight: 800 }}>
          <Share2 size={18} />
          <span style={{ marginLeft: '6px' }}>이벤트 공유하기</span>
        </button>

        <button
          type="button"
          disabled={kakaoSharing}
          onClick={() => void handleKakaoShare()}
          style={{
            height: '48px',
            borderRadius: '12px',
            fontWeight: 800,
            border: 'none',
            cursor: kakaoSharing ? 'wait' : 'pointer',
            opacity: kakaoSharing ? 0.75 : 1,
            background: '#FEE500',
            color: '#191919',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {kakaoSharing ? '카카오톡 연결 중…' : '카카오톡으로 공유'}
        </button>

        <a
          href="/event/personality-quiz"
          className="btn btn-primary"
          style={{ height: '48px', borderRadius: '12px', fontWeight: 800, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
        >
          테스트 시작하기
        </a>

        <button type="button" className="btn btn-outline" onClick={handleCopy} style={{ height: '48px', borderRadius: '12px', fontWeight: 800 }}>
          <Copy size={18} />
          <span style={{ marginLeft: '6px' }}>{copied ? '복사 완료' : '공유 문구 복사'}</span>
        </button>

        <a
          href={VIRAL_EVENT_CONFIG.formUrl}
          target="_blank"
          rel="noreferrer"
          className="btn btn-outline"
          style={{ height: '48px', borderRadius: '12px', fontWeight: 800, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <ExternalLink size={18} />
          <span style={{ marginLeft: '6px' }}>인증 제출하기</span>
        </a>
      </section>
    </div>
  );
}
