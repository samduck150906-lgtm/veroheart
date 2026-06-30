import { Link, useLocation } from 'react-router-dom';
import { Home, Search, User } from 'lucide-react';
import { useStore } from '../store/useStore';
import { DEFAULT_USER_PET_PROFILE } from '../types';

export default function BottomNav() {
  const location = useLocation();

  const hideOn = ['/login', '/auth'];
  if (hideOn.some((p) => location.pathname === p || location.pathname.startsWith(p + '/'))) {
    return null;
  }

  const navItems = [
    { path: '/', label: '홈', icon: Home, badge: 0, isFab: false },
    { path: '/search', label: '검색', icon: Search, badge: 0, isFab: false },
    { path: '/profile', label: profileTabLabel, icon: User, badge: 0, isFab: false },
  ];

  return (
    <nav className="bottom-nav-bar">
      {items.map(({ path, label, Icon }) => {
        const active = isActive(path);
        return (
          <Link key={path} to={path} className="tab-item" aria-label={label}>
            {Icon ? (
              <Icon size={22} strokeWidth={active ? 2.4 : 2} color={active ? 'var(--brand-deep)' : 'var(--ink-400)'} />
            ) : (
              <span style={{ color: active ? 'var(--brand-deep)' : 'var(--ink-400)' }}><PawIcon active={active} /></span>
            )}
            <span className="tab-label" style={{ color: active ? 'var(--brand-deep)' : 'var(--ink-400)' }}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
