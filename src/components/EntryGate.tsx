import { useNavigate } from 'react-router-dom';
import { LogoChip } from './Wordmark';
import { VR } from '../lib/veroroDesign';

type EntryGateProps = {
  /** 둘러보기: 이후 앱 진입 시 게이트 생략 */
  onBrowse: () => void;
  /** 로그인 화면으로 갈 때만 오버레이 닫기(저장 없음 → 미로그인 시 다음 방문에 다시 게이트) */
  onDismissForLogin: () => void;
};

/** 첫 진입 안내 — 프로토타입 gateBullets */
const BULLETS = [
  { n: '1', text: '펫 프로필 6단계 (1분)' },
  { n: '2', text: '바코드 스캔으로 성분 확인' },
  { n: '3', text: '급여일지로 변화 기록' },
];

/**
 * 첫 진입 게이트 — 화면 아래에서 올라오는 시트.
 * (디자인 핸드오프 `EntryGate` 스크린)
 */
export default function EntryGate({ onBrowse, onDismissForLogin }: EntryGateProps) {
  const navigate = useNavigate();

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div
        className="vr-anim-fade"
        style={{ position: 'absolute', inset: 0, background: 'rgba(10,10,8,.55)' }}
        aria-hidden
      />
      <div
        style={{
          position: 'relative',
          background: 'var(--surface)',
          borderRadius: '24px 24px 0 0',
          padding: '24px 20px 22px',
          animation: 'vSheet .38s cubic-bezier(.2,.8,.2,1)',
        }}
      >
        <div style={{ marginBottom: '16px' }}>
          <LogoChip height={18} padding="9px 12px" radius={9} ariaLabel="VERORO" />
        </div>

        <h2 style={{ margin: '0 0 8px', fontSize: '25px', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.25 }}>
          VERORO 처음이야?
        </h2>
        <p style={{ margin: '0 0 18px', fontSize: '13.5px', color: VR.muted, lineHeight: 1.55 }}>
          우리 아이 프로필만 등록하면, 성분을 우리 아이 기준으로 다시 계산해줄게.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          {BULLETS.map((b) => (
            <div key={b.n} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span
                style={{
                  width: '24px', height: '24px', borderRadius: '8px', flex: 'none',
                  background: 'var(--vr-yellow-soft)', color: 'var(--vr-yellow-deep)',
                  fontSize: '12px', fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {b.n}
              </span>
              <span style={{ fontSize: '13.5px', fontWeight: 700, letterSpacing: '-0.01em' }}>{b.text}</span>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="vr-btn vr-btn--primary"
          style={{ padding: '16px', fontSize: '15.5px' }}
          onClick={() => {
            onDismissForLogin();
            navigate('/login', { state: { from: '/' } });
          }}
        >
          프로필 만들고 시작하기
        </button>
        <button
          type="button"
          className="vr-btn vr-btn--ghost"
          style={{ padding: '13px', fontWeight: 800, color: VR.sub }}
          onClick={() => onBrowse()}
        >
          먼저 둘러볼게
        </button>
      </div>
    </div>
  );
}
