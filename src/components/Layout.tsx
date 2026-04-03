import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import BottomNav from './BottomNav';
import Footer from './Footer';
import { VERORO_LOGO_SRC } from '../constants/assets';
import { useStore } from '../store/useStore';
import { ArrowLeft, ShoppingBag } from 'lucide-react';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { cart } = useStore();

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
  const isBrandPage = location.pathname.startsWith('/brand');
  const isSubPage = isDetailPage || isBrandPage ||
    ['/comparison', '/cart', '/checkout', '/success', '/fail', '/terms', '/privacy', '/refund'].includes(location.pathname);

  const pageTitle = isDetailPage
    ? '제품 상세'
    : isBrandPage
    ? '브랜드'
    : titleMap[location.pathname] ?? '베로로';

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%', padding: 0 }}>
      <header className="glass" style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: '60px', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', fontWeight: 700, fontSize: '18px'
      }}>
        {/* Left side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
          {isSubPage ? (
            <button
              onClick={() => navigate(-1)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '36px', height: '36px', borderRadius: '12px',
                background: 'rgba(43, 38, 36, 0.06)', border: 'none', cursor: 'pointer',
                color: 'var(--text-dark)', flexShrink: 0,
                transition: 'background var(--transition-fast)',
              }}
              aria-label="뒤로 가기"
            >
              <ArrowLeft size={18} strokeWidth={2.5} />
            </button>
          ) : (
            <Link to="/" style={{ display: 'flex', alignItems: 'center', lineHeight: 0 }} aria-label="VeRoRo 홈">
              <img
                src={VERORO_LOGO_SRC}
                alt="VeRoRo"
                style={{ height: '28px', width: 'auto', objectFit: 'contain', display: 'block' }}
              />
            </Link>
          )}
          {!isSubPage && (
            <span style={{
              fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
              color: 'var(--community-tint)', background: 'rgba(124, 111, 156, 0.12)',
              padding: '4px 8px', borderRadius: '999px', flexShrink: 0
            }}>Community</span>
          )}
        </div>

        {/* Center title */}
        <span style={{
          fontSize: '15px', fontWeight: 700, color: 'var(--text-dark)',
          position: 'absolute', left: '50%', transform: 'translateX(-50%)',
          maxWidth: '42%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
        }}>
          {isSubPage ? pageTitle : ''}
        </span>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end', flex: 1 }}>
          {location.pathname !== '/cart' && (
            <Link
              to="/cart"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '36px', height: '36px', borderRadius: '12px',
                background: cartCount > 0 ? 'rgba(255, 107, 74, 0.1)' : 'transparent',
                position: 'relative', textDecoration: 'none',
                transition: 'background var(--transition-fast)',
              }}
              aria-label={`장바구니 ${cartCount}개`}
            >
              <ShoppingBag size={20} color={cartCount > 0 ? 'var(--primary-dark)' : 'var(--text-muted)'} />
              {cartCount > 0 && (
                <span style={{
                  position: 'absolute', top: '-2px', right: '-2px',
                  backgroundColor: 'var(--accent)',
                  color: '#fff', fontSize: '10px', fontWeight: 800,
                  width: '18px', height: '18px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  lineHeight: 1, border: '2px solid rgba(255, 251, 248, 0.92)',
                  animation: 'bounceIn 0.4s var(--transition-bounce)',
                }}>
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </Link>
          )}
        </div>
      </header>

      <main className="page-content container">
        <div className="animate-fade-in" style={{ paddingBottom: '20px' }}>
          <Outlet />
        </div>
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
}
