import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Trophy, User, ShoppingBag } from 'lucide-react';
import { useStore } from '../store/useStore';

export default function BottomNav() {
  const location = useLocation();
  const { cart } = useStore();

  const navItems = [
    { path: '/', label: '홈', icon: Home, badge: 0 },
    { path: '/search', label: '탐색', icon: Search, badge: 0 },
    { path: '/cart', label: '장바구니', icon: ShoppingBag, badge: cart.length },
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
          <Link key={item.path} to={item.path} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textDecoration: 'none',
            color: isActive ? 'var(--primary-dark)' : 'var(--text-light)',
            transition: 'color var(--transition-fast)',
            position: 'relative',
            minWidth: '52px',
            padding: '8px 4px',
            borderRadius: '16px',
            background: isActive ? 'rgba(255, 107, 74, 0.12)' : 'transparent',
          }}>
            <Icon size={22} strokeWidth={isActive ? 2.5 : 2} style={{ marginBottom: '2px' }} />
            <span style={{ fontSize: '10px', fontWeight: isActive ? 700 : 500, letterSpacing: '-0.02em' }}>{item.label}</span>
            {item.badge > 0 && (
              <span style={{
                position: 'absolute',
                top: '2px',
                right: '4px',
                backgroundColor: 'var(--accent)',
                color: '#fff',
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: '10px',
                minWidth: '18px',
                textAlign: 'center',
                lineHeight: 1.2,
              }}>
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
