import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Trophy, User, ShoppingBag } from 'lucide-react';
import { useStore } from '../store/useStore';
import { DEFAULT_USER_PET_PROFILE } from '../types';

export default function BottomNav() {
  const location = useLocation();
  const { cart, profile, isLoggedIn } = useStore();
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const profileTabLabel =
    isLoggedIn &&
    profile.name.trim() &&
    profile.name !== DEFAULT_USER_PET_PROFILE.name
      ? profile.name.length > 5
        ? `${profile.name.slice(0, 4)}…`
        : profile.name
      : '마이 펫';

  const navItems = [
    { path: '/', label: '홈', icon: Home, badge: 0 },
    { path: '/search', label: '탐색', icon: Search, badge: 0 },
    { path: '/cart', label: '장바구니', icon: ShoppingBag, badge: cartCount },
    { path: '/ranking', label: '랭킹', icon: Trophy, badge: 0 },
    { path: '/profile', label: profileTabLabel, icon: User, badge: 0 },
  ];

  return (
    <nav className="glass-nav bottom-nav bottom-nav-community">
      {navItems.map(item => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            className={isActive ? 'bottom-nav-item bottom-nav-item-active' : 'bottom-nav-item'}
          >
            <div className="bottom-nav-icon-wrap">
              <Icon
                size={22}
                strokeWidth={isActive ? 2.25 : 2}
                style={{ transition: 'color 0.15s ease' }}
              />
              {item.badge > 0 && (
                <span className="bottom-nav-badge">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </div>
            <span className="bottom-nav-label">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
