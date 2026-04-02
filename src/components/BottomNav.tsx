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
    <nav className="glass" style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      height: '80px', display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      paddingBottom: '20px', borderTop: '1px solid rgba(0,0,0,0.05)', zIndex: 10
    }}>
      {navItems.map(item => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;
        return (
          <Link key={item.path} to={item.path} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            textDecoration: 'none', color: isActive ? 'var(--primary)' : 'var(--text-light)',
            transition: 'color var(--transition-fast)', position: 'relative'
          }}>
            <Icon size={24} style={{ marginBottom: '4px' }} />
            <span style={{ fontSize: '12px', fontWeight: isActive ? 600 : 400 }}>{item.label}</span>
            {item.badge > 0 && (
              <span style={{
                position: 'absolute', top: '-4px', right: '-8px',
                backgroundColor: 'var(--accent)', color: '#fff', fontSize: '10px',
                fontWeight: 'bold', padding: '2px 6px', borderRadius: '10px'
              }}>
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
