import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Trophy, User, ShoppingBag } from 'lucide-react';
import { useStore } from '../store/useStore';

export default function BottomNav() {
  const location = useLocation();
  const { cart } = useStore();
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const navItems = [
    { path: '/', label: '홈', icon: Home, badge: 0 },
    { path: '/search', label: '탐색', icon: Search, badge: 0 },
    { path: '/cart', label: '장바구니', icon: ShoppingBag, badge: cartCount },
    { path: '/ranking', label: '랭킹', icon: Trophy, badge: 0 },
    { path: '/profile', label: '마이 펫', icon: User, badge: 0 },
  ];

  return (
    <nav
      className="glass-nav bottom-nav"
    >
      {navItems.map(item => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none',
              color: isActive ? 'var(--primary-dark)' : 'var(--text-light)',
              transition: 'all var(--transition-fast)',
              position: 'relative',
              minWidth: '52px',
              padding: '8px 4px',
              borderRadius: '20px',
              background: isActive
                ? 'linear-gradient(145deg, rgba(250, 204, 21, 0.22), rgba(254, 240, 138, 0.42))'
                : 'transparent',
            }}
          >
            <div style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '2px',
            }}>
              <Icon
                size={22}
                strokeWidth={isActive ? 2.5 : 2}
                style={{
                  transition: 'transform var(--transition-bounce)',
                  transform: isActive ? 'scale(1.1)' : 'scale(1)',
                }}
              />
              {item.badge > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-6px',
                  right: '-8px',
                  backgroundColor: 'var(--accent)',
                  color: '#fff',
                  fontSize: '9px',
                  fontWeight: 800,
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1,
                  border: '1.5px solid rgba(255, 255, 255, 0.96)',
                  animation: 'bounceIn 0.4s ease',
                }}>
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </div>
            <span style={{
              fontSize: '10px',
              fontWeight: isActive ? 700 : 500,
              letterSpacing: '-0.02em',
              transition: 'all var(--transition-fast)',
              opacity: isActive ? 1 : 0.7,
            }}>
              {item.label}
            </span>
            {isActive && (
              <span style={{
                position: 'absolute',
                bottom: '-4px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '4px',
                height: '4px',
                borderRadius: '50%',
                background: 'var(--primary)',
              }} />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
