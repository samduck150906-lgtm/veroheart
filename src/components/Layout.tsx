import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { Bell, Search } from 'lucide-react';
import BottomNav from './BottomNav';
import Footer from './Footer';
import ThemeToggle from './ThemeToggle';
import { VERORO_LOGO_SRC } from '../constants/assets';
import { useStore } from '../store/useStore';
export default function Layout() {
  const navigate = useNavigate();
  const { profile, isLoggedIn } = useStore();
  const location = useLocation();
  const hideFooterOn = ['/login'];
  const shouldHideFooter = hideFooterOn.some((path) => location.pathname.startsWith(path));
  // 상품 상세는 하단에 고정 액션 바(StickyCtaBar)를 쓰므로 전역 BottomNav를 숨겨
  // 액션 버튼이 네비게이션에 가려지지 않게 한다.
  const hideBottomNavOn = ['/product/'];
  const shouldHideBottomNav = hideBottomNavOn.some((path) => location.pathname.startsWith(path));

  return (
    <div className="app-shell">
      <header className="glass app-header app-header-community">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', lineHeight: 0 }} aria-label="VeRoRo 홈">
              <img
                src={VERORO_LOGO_SRC}
                alt="VeRoRo"
                style={{ height: '42px', width: '42px', objectFit: 'contain', display: 'block', borderRadius: '14px' }}
              />
            </Link>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <button
              type="button"
              className="app-icon-button"
              onClick={() => navigate('/search')}
              aria-label="검색"
            >
              <Search size={18} />
            </button>
            <ThemeToggle />
            <button
              type="button"
              className="app-icon-button"
              aria-label="알림"
            >
              <Bell size={18} />
            </button>
          </div>
        </div>

        {isLoggedIn && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
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
        {!shouldHideFooter && <Footer />}
      </main>

      {!shouldHideBottomNav && <BottomNav />}
    </div>
  );
}
