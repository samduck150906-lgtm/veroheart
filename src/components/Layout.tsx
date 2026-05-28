import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import BottomNav from './BottomNav';
import Footer from './Footer';
import { VERORO_LOGO_SRC } from '../constants/assets';
import { useStore } from '../store/useStore';
import { buildHomeFeedTitle } from '../utils/homeHeadline';
export default function Layout() {
  const navigate = useNavigate();
  const { profile, isLoggedIn } = useStore();
  const location = useLocation();
  const hideFooterOn = ['/auth'];
  const shouldHideFooter = hideFooterOn.some((path) => location.pathname.startsWith(path));
  const titleMap: Record<string, string> = {
    '/': '홈',
    '/search': '검색',
    '/scanner': '성분 스캐너',
    '/community': '커뮤니티',
    '/comparison': '비교함',
    '/profile': '마이 펫',
    '/cart': '장바구니',
    '/ranking': '랭킹',
  };

  const isDetailPage = location.pathname.startsWith('/product');
  const pageTitle = isDetailPage
    ? '제품 상세'
    : titleMap[location.pathname] ?? '베로로';
  const isHome = location.pathname === '/';
  const homeHeadline = isHome ? buildHomeFeedTitle(profile, isLoggedIn) : '';

  return (
    <div className="app-shell">
      <header className="app-header app-header-community">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', minHeight: '36px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', lineHeight: 0 }} aria-label="VeRoRo 홈">
              <img
                src={VERORO_LOGO_SRC}
                alt="VeRoRo"
                style={{ height: '28px', width: '28px', objectFit: 'contain', display: 'block', borderRadius: '8px' }}
              />
            </Link>
            <div style={{ minWidth: 0, display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span
                style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: 'var(--text-dark)',
                  whiteSpace: isHome ? 'normal' : 'nowrap',
                  lineHeight: 1.3,
                  letterSpacing: '-0.01em',
                }}
              >
                {isHome ? homeHeadline : pageTitle}
              </span>
              {isLoggedIn && !isHome && (
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 500,
                    color: 'var(--text-light)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={profile.name}
                >
                  {profile.name}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/search')}
            aria-label="검색"
            style={{
              flexShrink: 0,
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            }}
          >
            <Search size={18} strokeWidth={1.8} />
          </button>
        </div>

        {isLoggedIn && isHome && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
            <span className="ui-badge ui-badge-soft">
              {profile.species === 'Cat' ? '고양이 보호자' : '강아지 보호자'}
            </span>
            {profile.healthConcerns.length > 0 && (
              <span className="ui-badge ui-badge-muted">
                {profile.healthConcerns.slice(0, 2).join(' · ')}
                {profile.healthConcerns.length > 2 ? '…' : ''}
              </span>
            )}
          </div>
        )}
      </header>

      <main className="app-main container">
        <div className="animate-fade-in" style={{ paddingBottom: '20px' }}>
          <Outlet />
        </div>
      </main>

      {!shouldHideFooter && <Footer />}
      <BottomNav />
    </div>
  );
}
