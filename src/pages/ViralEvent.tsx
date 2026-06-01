import { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Copy, Share2 } from 'lucide-react';
import { isKakaoShareConfigured, kakaoShareTextWithLink } from '../lib/kakaoShare';
import { notify } from '../store/useNotification';

const SHARE_PATH = '/event/personality-quiz';
const EVENT_TITLE = '우리 집 댕냥이 성향 테스트';

export default function ViralEvent() {
  const [kakaoSharing, setKakaoSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareUrl = useMemo(() => `${window.location.origin}${SHARE_PATH}`, []);
  const shareText = `반려동물 성향 테스트 해봐! ${shareUrl}`;

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
        await navigator.share({ title: EVENT_TITLE, text: shareText, url: shareUrl });
        return;
      } catch {
        // 취소 또는 미지원
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
      await kakaoShareTextWithLink({ text: shareText, linkUrl: shareUrl });
    } catch {
      notify.error('카카오톡 공유를 열지 못했어요. 복사 후 카톡에 붙여넣기 해 주세요.');
    } finally {
      setKakaoSharing(false);
    }
  };

  return (
    <div style={{ paddingBottom: '32px' }}>
      <Helmet>
        <title>{EVENT_TITLE} — 베로로</title>
        <meta name="description" content="반려동물 성향 테스트를 완료하고 결과를 친구와 공유해 보세요." />
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
        <p style={{ fontSize: '11px', fontWeight: 800, color: '#C2410C', margin: '0 0 8px' }}>PERSONALITY TEST</p>
        <h1 style={{ fontSize: '22px', margin: '0 0 8px', color: '#7C2D12', fontWeight: 900 }}>{EVENT_TITLE}</h1>
        <p style={{ fontSize: '13px', color: '#9A3412', margin: 0, lineHeight: 1.6, fontWeight: 600 }}>
          행동 관찰 8문항으로 우리 아이 성향을 알아보고, 결과를 친구에게 공유해 보세요.
        </p>
      </section>

      <section style={{ display: 'grid', gap: '8px' }}>
        <a
          href="/event/personality-quiz"
          className="btn btn-primary"
          style={{ height: '48px', borderRadius: '12px', fontWeight: 800, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
        >
          테스트 시작하기
        </a>

        <button type="button" className="btn btn-primary" onClick={handleShare} style={{ height: '48px', borderRadius: '12px', fontWeight: 800 }}>
          <Share2 size={18} />
          <span style={{ marginLeft: '6px' }}>결과 공유하기</span>
        </button>

        <button
          type="button"
          disabled={kakaoSharing}
          onClick={() => void handleKakaoShare()}
          style={{
            height: '48px', borderRadius: '12px', fontWeight: 800, border: 'none',
            cursor: kakaoSharing ? 'wait' : 'pointer', opacity: kakaoSharing ? 0.75 : 1,
            background: '#FEE500', color: '#191919',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {kakaoSharing ? '카카오톡 연결 중…' : '카카오톡으로 공유'}
        </button>

        <button type="button" className="btn btn-outline" onClick={handleCopy} style={{ height: '48px', borderRadius: '12px', fontWeight: 800 }}>
          <Copy size={18} />
          <span style={{ marginLeft: '6px' }}>{copied ? '복사 완료' : '링크 복사'}</span>
        </button>
      </section>
    </div>
  );
}
