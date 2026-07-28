import { Outlet, useLocation, Link } from 'react-router-dom';
import BottomNav from './BottomNav';
import Footer from './Footer';
import ThemeToggle from './ThemeToggle';
import { VERORO_LOGO_SRC } from '../constants/assets';
import { usePublicSettings } from '../lib/publicSettings';

export default function Layout() {
  const location = useLocation();
  const settings = usePublicSettings();
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

      {/* 관리자 콘솔(시스템 설정)에서 켜는 운영 배너 */}
      {settings.maintenanceMode && (
        <div className="app-notice app-notice-warning" role="status">
          현재 서비스 점검 중이에요. 일부 기능이 일시적으로 동작하지 않을 수 있어요.
        </div>
      )}
      {!settings.maintenanceMode && settings.serviceNotice.enabled && settings.serviceNotice.message && (
        <div className="app-notice" role="status">
          {settings.serviceNotice.message}
        </div>
      )}

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
