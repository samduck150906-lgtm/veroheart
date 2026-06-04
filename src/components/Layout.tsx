import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import BottomNav from './BottomNav';
import Footer from './Footer';
import { VERORO_LOGO_SRC } from '../constants/assets';

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const hideFooterOn = ['/auth'];
  const shouldHideFooter = hideFooterOn.some((path) => location.pathname.startsWith(path));

  const isHome = location.pathname === '/';
  const isProfile = location.pathname === '/profile';

  return (
    <div className="app-shell" style={{ backgroundColor: 'var(--bg-color)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Unified Brand Header - Centered Large Logo Only */}
      {isProfile ? (
        // Profile has its own built-in profile card and tabs, so we skip the global header
        null
      ) : (
        <header
          className="glass"
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '76px',
            padding: '0 16px',
            borderBottom: '1px solid var(--hairline)',
            background: 'var(--surface-trans)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
          {!isHome && (
            <button
              onClick={() => navigate(-1)}
              style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--ink)'
              }}
            >
              <ArrowLeft size={22} />
            </button>
          )}

          <Link to="/" style={{ display: 'flex', alignItems: 'center', lineHeight: 0 }} aria-label="베로로 홈">
            <img
              src={VERORO_LOGO_SRC}
              alt="VeRoRo"
              style={{ height: '56px', width: 'auto', objectFit: 'contain', display: 'block', borderRadius: '12px' }}
            />
          </Link>
        </header>
      )}

      <main className="app-main container" style={{ flex: 1 }}>
        <div className="animate-fade-in" style={{ paddingBottom: '20px' }}>
          <Outlet />
        </div>
      </main>

      {!shouldHideFooter && <Footer />}
      <BottomNav />
    </div>
  );
}
