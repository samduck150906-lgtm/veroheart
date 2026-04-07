import { Outlet, useLocation, Link } from 'react-router-dom';
import BottomNav from './BottomNav';
import Footer from './Footer';
import { VERORO_LOGO_SRC } from '../constants/assets';
import { useStore } from '../store/useStore';
export default function Layout() {
  const { profile, isLoggedIn } = useStore();
  const location = useLocation();
  const hideFooterOn = ['/checkout', '/success', '/fail', '/login'];
  const shouldHideFooter = hideFooterOn.some((path) => location.pathname.startsWith(path));
  const titleMap: Record<string, string> = {
    '/': '홈',
    '/search': '탐색',
    '/comparison': '비교함',
    '/profile': '마이 펫',
    '/cart': '장바구니',
    '/checkout': '결제',
    '/ranking': '랭킹',
  };

  const isDetailPage = location.pathname.startsWith('/product');
  const pageTitle = isDetailPage
    ? '제품 상세'
    : titleMap[location.pathname] ?? '베로로';

  return (
    <div className="app-shell">
      <header className="glass app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', lineHeight: 0 }} aria-label="VeRoRo 홈">
            <img
              src={VERORO_LOGO_SRC}
              alt="VeRoRo"
              style={{ height: '46px', width: 'auto', objectFit: 'contain', display: 'block' }}
            />
          </Link>
          <span style={{
            fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
            color: 'var(--community-tint)', background: 'rgba(124, 111, 156, 0.12)',
            padding: '4px 8px', borderRadius: '999px', flexShrink: 0
          }}>Community</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 0, maxWidth: '48%' }}>
          <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', textAlign: 'right' }}>
            {pageTitle}
          </span>
          {isLoggedIn && (
            <span
              style={{
                marginTop: '2px',
                fontSize: '10px',
                fontWeight: 800,
                color: 'var(--primary-dark)',
                background: 'rgba(250, 204, 21, 0.2)',
                padding: '2px 8px',
                borderRadius: '999px',
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={`${profile.name} (${profile.species === 'Cat' ? '고양이' : '강아지'})`}
            >
              {profile.name}
              {profile.healthConcerns.length > 0 ? ` · ${profile.healthConcerns.slice(0, 2).join(',')}${profile.healthConcerns.length > 2 ? '…' : ''}` : ''}
            </span>
          )}
        </div>
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
