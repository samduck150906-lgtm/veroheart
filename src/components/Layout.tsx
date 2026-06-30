import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import BottomNav from './BottomNav';
import Footer from './Footer';
import { useStore } from '../store/useStore';
export default function Layout() {
  const navigate = useNavigate();
  const { profile, isLoggedIn, cart, favorites } = useStore();
  const location = useLocation();
  const hideFooterOn = ['/auth'];
  const shouldHideFooter = hideFooterOn.some((path) => location.pathname.startsWith(path));

  const isHome = location.pathname === '/';

  return (
    <div className="app-shell">
      <header className="glass app-header app-header-community">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', lineHeight: 0 }} aria-label="VeRoRo 홈">
            <img
              src={VERORO_LOGO_SRC}
              alt="VeRoRo"
              style={{ height: '42px', width: '42px', objectFit: 'contain', display: 'block', borderRadius: '14px' }}
            />
          </Link>

          <button
            type="button"
            className="app-icon-button"
            onClick={() => navigate('/search')}
            aria-label="찜기록"
          >
            <Heart size={18} fill={favorites.length > 0 ? 'currentColor' : 'none'} />
          </button>
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
