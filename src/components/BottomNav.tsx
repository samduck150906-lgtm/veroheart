import { Link, useLocation } from 'react-router-dom';
import { Home, Search, ScanLine, User, UtensilsCrossed } from 'lucide-react';
import { useStore } from '../store/useStore';
import { DEFAULT_USER_PET_PROFILE } from '../types';

export default function BottomNav() {
  const location = useLocation();
  const { profile, isLoggedIn } = useStore();
  const tabParam = new URLSearchParams(location.search).get('tab');
  const onProfile = location.pathname === '/profile';
  const onDiary = onProfile && tabParam === 'diary';

  const profileTabLabel =
    isLoggedIn &&
    profile.name.trim() &&
    profile.name !== DEFAULT_USER_PET_PROFILE.name
      ? profile.name.length > 5
        ? `${profile.name.slice(0, 4)}…`
        : profile.name
      : '마이 펫';

  const navItems = [
    { path: '/', label: '홈', icon: Home, active: location.pathname === '/' },
    { path: '/search', label: '탐색', icon: Search, active: location.pathname.startsWith('/search') },
    { path: '/profile?tab=diary', label: '다이어리', icon: UtensilsCrossed, active: onDiary },
    { path: '/profile', label: profileTabLabel, icon: User, active: onProfile && !onDiary },
  ];

  const renderItem = (item: (typeof navItems)[number]) => {
    const Icon = item.icon;
    const isActive = item.active;
    return (
      <Link
        key={item.path}
        to={item.path}
        className={isActive ? 'bottom-nav-item bottom-nav-item-active' : 'bottom-nav-item'}
      >
        <div className="bottom-nav-icon-wrap">
          <Icon size={22} strokeWidth={isActive ? 2.25 : 2} style={{ transition: 'color 0.15s ease' }} />
        </div>
        <span className="bottom-nav-label">{item.label}</span>
      </Link>
    );
  };

  return (
    <nav className="glass-nav bottom-nav bottom-nav-community">
      {renderItem(navItems[0])}
      {renderItem(navItems[1])}

      {/* 중앙 스캔 FAB — 앱의 1순위 기능 진입점 */}
      <Link to="/scan" className="scan-fab" aria-label="스캔">
        <ScanLine size={26} strokeWidth={2.5} />
        <span className="scan-fab-label">스캔</span>
      </Link>

      {renderItem(navItems[2])}
      {renderItem(navItems[3])}
    </nav>
  );
}
