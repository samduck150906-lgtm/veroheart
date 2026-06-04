import { Link, useLocation } from 'react-router-dom';
import { Home, Search, User } from 'lucide-react';
import { useStore } from '../store/useStore';
import { DEFAULT_USER_PET_PROFILE } from '../types';

export default function BottomNav() {
  const location = useLocation();
  const { profile, isLoggedIn } = useStore();

  const profileTabLabel =
    isLoggedIn &&
    profile.name.trim() &&
    profile.name !== DEFAULT_USER_PET_PROFILE.name
      ? profile.name.length > 5
        ? `${profile.name.slice(0, 4)}…`
        : profile.name
      : '마이펫';

  const navItems = [
    { path: '/', label: '홈', icon: Home, badge: 0, isFab: false },
    { path: '/search', label: '검색', icon: Search, badge: 0, isFab: false },
    { path: '/profile', label: profileTabLabel, icon: User, badge: 0, isFab: false },
  ];

  return (
    <nav className="glass-nav bottom-nav bottom-nav-community">
      {navItems.map(item => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;

        if (item.isFab) {
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`bottom-nav-fab-wrap ${isActive ? 'bottom-nav-fab-active' : ''}`}
              aria-label={item.label}
            >
              <div className="bottom-nav-fab">
                <Icon
                  size={24}
                  strokeWidth={2.5}
                  color="#FFFFFF"
                />
              </div>
              <span className="bottom-nav-label fab-label">
                {item.label}
              </span>
            </Link>
          );
        }

        return (
          <Link
            key={item.path}
            to={item.path}
            className={isActive ? 'bottom-nav-item bottom-nav-item-active' : 'bottom-nav-item'}
            aria-label={item.label}
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
