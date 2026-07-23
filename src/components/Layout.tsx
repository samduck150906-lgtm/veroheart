import { Outlet, useLocation, Link } from 'react-router-dom';
import BottomNav from './BottomNav';
import Footer from './Footer';
import ThemeToggle from './ThemeToggle';
import { VERORO_LOGO_SRC } from '../constants/assets';

export default function Layout() {
  const location = useLocation();
  const hideFooterOn = ['/login'];
  const shouldHideFooter = hideFooterOn.some((path) => location.pathname.startsWith(path));
  // 상품 상세는 하단 고정 액션 바(StickyCtaBar)를 쓰므로 전역 BottomNav를 숨긴다.
  const hideBottomNavOn = ['/product/'];
  const shouldHideBottomNav = hideBottomNavOn.some((path) => location.pathname.startsWith(path));

  return (
    <div className="app-shell">
      <header className="glass app-header app-header-community">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', lineHeight: 0 }} aria-label="VeRoRo 홈">
            <img
              src={VERORO_LOGO_SRC}
              alt="VeRoRo"
              style={{ height: '32px', width: 'auto', objectFit: 'contain', display: 'block' }}
            />
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="app-main container">
        <div className="animate-fade-in" style={{ paddingBottom: '20px' }}>
          <Outlet />
        </div>
        {!shouldHideFooter && <Footer />}
      </main>

      {!shouldHideBottomNav && <BottomNav />}
    </div>
  );
}
