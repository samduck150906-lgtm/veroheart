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
      
      {/* Unified Brand Header like Hwahae */}
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
            flexDirection: 'column',
            padding: '12px 20px',
            borderBottom: '1px solid var(--hairline)',
            background: 'var(--surface-trans)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            gap: '12px'
          }}
        >
          {/* Top Row: Left logo, Right language & cart */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {!isHome && (
                <button
                  onClick={() => navigate(-1)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
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
                  style={{ height: '95px', width: 'auto', objectFit: 'contain', display: 'block', margin: '-16px 0' }}
                />
              </Link>
            </div>
            
            {/* Pink dog paw print jelly icon button for Favorites */}
            <button
              onClick={() => navigate('/profile?tab=favorites')}
              style={{
                background: '#FFF2F5',
                border: '2px solid #FFCCD5',
                cursor: 'pointer',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(255, 75, 110, 0.15)',
                transition: 'all 0.2s ease',
                padding: 0
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.08)';
                e.currentTarget.style.background = '#FFE5EC';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.background = '#FFF2F5';
              }}
              title="내가 찜한 상품"
            >
              <span style={{ fontSize: '20px', lineHeight: 1 }}>🐾</span>
            </button>
          </div>

          {/* Search Row like Hwahae */}
          <div 
            onClick={() => navigate('/search')}
            style={{
              width: '100%',
              height: '42px',
              borderRadius: '99px',
              background: '#F3F4F6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 16px',
              cursor: 'pointer',
              border: '1px solid transparent',
              transition: 'all 0.2s ease',
              boxSizing: 'border-box'
            }}
          >
            <span style={{ color: 'var(--ink-faint)', fontSize: '13.5px', fontWeight: 500 }}>
              궁금한 사료나 성분을 검색해 보세요
            </span>
            <span style={{ color: 'var(--ink-soft)', fontSize: '16px' }}>🔍</span>
          </div>

          {/* Navigation Sub-Tabs like Hwahae */}
          {isHome && (
            <div style={{ display: 'flex', gap: '20px', borderBottom: 'none', marginTop: '2px' }}>
              <Link 
                to="/" 
                style={{ 
                  fontSize: '15px', 
                  fontWeight: 700, 
                  color: 'var(--ink)', 
                  paddingBottom: '4px', 
                  borderBottom: '2.5px solid var(--brand-deep)',
                  textDecoration: 'none'
                }}
              >
                홈
              </Link>
              <Link 
                to="/ranking" 
                style={{ 
                  fontSize: '15px', 
                  fontWeight: 600, 
                  color: 'var(--ink-soft)', 
                  paddingBottom: '4px',
                  textDecoration: 'none'
                }}
              >
                랭킹
              </Link>
            </div>
          )}
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
