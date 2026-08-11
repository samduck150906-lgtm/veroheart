import { useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { notify } from '../store/useNotification';
import { normalizeProductDisplayName } from '../utils/productDisplay';
import { LogoChip } from './Wordmark';
import ThemeToggle from './ThemeToggle';
import { VR } from '../lib/veroroDesign';
import { resolveRouteChrome } from '../lib/routeChrome';

interface AppHeaderProps {
  /** 본문이 8px 이상 스크롤되었는지 — 헤더 그림자(headerShadow) 트리거 */
  raised: boolean;
}

export default function AppHeader({ raised }: AppHeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const { profile, selectedProduct } = useStore();

  const chrome = useMemo(
    () => resolveRouteChrome(location.pathname, location.search),
    [location.pathname, location.search]
  );

  if (chrome.header === 'none') return null;

  const petInitial = (profile.name || '펫').trim().charAt(0) || '펫';

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ url });
        return;
      }
      await navigator.clipboard.writeText(url);
      notify.success('공유 링크를 복사했어');
    } catch {
      notify.info('공유 링크를 복사하지 못했어');
    }
  };

  // 상세는 스크롤 전에는 제목을 비워 두고, 내려가면 제품명을 띄운다 (프로토타입 pageTitle).
  const brandParam = params.brandName ? decodeURIComponent(params.brandName) : '';
  const title = location.pathname.startsWith('/product/')
    ? (raised && selectedProduct ? normalizeProductDisplayName(selectedProduct) : '')
    : location.pathname.startsWith('/brand/')
      ? brandParam
      : (chrome.title ?? '');

  const className = raised ? 'app-header app-header--raised' : 'app-header';

  if (chrome.header === 'back') {
    return (
      <header className={className}>
        <div className="vr-header-row vr-header-row--back">
          <button type="button" className="vr-round-btn" onClick={() => navigate(-1)} aria-label="뒤로">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <span className="vr-header-title">{title}</span>
          <button type="button" className="vr-round-btn" onClick={() => void share()} aria-label="공유">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v12M8 7l4-4 4 4M5 14v5a2 2 0 002 2h10a2 2 0 002-2v-5" />
            </svg>
          </button>
        </div>
      </header>
    );
  }

  return (
    <header className={className}>
      <div className="vr-header-row">
        <LogoChip onClick={() => navigate('/')} />
        {chrome.sub ? (
          <span style={{ fontSize: '13px', fontWeight: 700, color: VR.faint }}>{chrome.sub}</span>
        ) : null}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ThemeToggle />
          <button
            type="button"
            className="vr-round-btn vr-round-btn--accent"
            onClick={() => navigate('/profile')}
            aria-label="마이 펫"
          >
            {petInitial}
          </button>
        </div>
      </div>
    </header>
  );
}
