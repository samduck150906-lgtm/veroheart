import { Link, useLocation } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { DEFAULT_USER_PET_PROFILE } from '../types';

/**
 * 하단 탭바 — 홈 / 탐색 / (스캔 FAB) / 다이어리 / 마이 펫.
 * 아이콘은 디자인 핸드오프의 인라인 SVG를 그대로 옮겼다 (lucide 대체 아이콘과 형태가 다름).
 */
export default function BottomNav() {
  const location = useLocation();
  const { profile, isLoggedIn } = useStore();
  const tabParam = new URLSearchParams(location.search).get('tab');
  const onProfile = location.pathname === '/profile';
  const onDiary = onProfile && tabParam === 'diary';

  const petTabLabel =
    isLoggedIn && profile.name.trim() && profile.name !== DEFAULT_USER_PET_PROFILE.name
      ? profile.name.length > 5
        ? `${profile.name.slice(0, 4)}…`
        : profile.name
      : '마이 펫';

  const items = [
    {
      path: '/',
      label: '홈',
      active: location.pathname === '/',
      icon: (
        <path d="M4 11l8-7 8 7v8a1 1 0 01-1 1h-4v-6H9v6H5a1 1 0 01-1-1z" strokeLinejoin="round" />
      ),
    },
    {
      path: '/search',
      label: '탐색',
      active: location.pathname.startsWith('/search'),
      icon: (
        <>
          <circle cx="11" cy="11" r="7" />
          <path d="M16.5 16.5L21 21" />
        </>
      ),
    },
    {
      path: '/profile?tab=diary',
      label: '다이어리',
      active: onDiary,
      icon: (
        <>
          <rect x="4" y="3" width="16" height="18" rx="2.5" />
          <path d="M8 8h8M8 12h8M8 16h4" />
        </>
      ),
    },
    {
      path: '/profile',
      label: petTabLabel,
      active: onProfile && !onDiary,
      icon: (
        <>
          <circle cx="12" cy="14" r="4.4" />
          <circle cx="6.4" cy="8.2" r="2.1" />
          <circle cx="17.6" cy="8.2" r="2.1" />
          <circle cx="10" cy="5.6" r="1.9" />
          <circle cx="14" cy="5.6" r="1.9" />
        </>
      ),
    },
  ];

  const renderItem = (item: (typeof items)[number]) => (
    <Link
      key={item.path}
      to={item.path}
      className={item.active ? 'bottom-nav-item bottom-nav-item-active' : 'bottom-nav-item'}
      style={{ color: item.active ? 'var(--vr-ink)' : 'var(--vr-disabled)' }}
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        aria-hidden
      >
        {item.icon}
      </svg>
      <span className="bottom-nav-label">{item.label}</span>
    </Link>
  );

  return (
    <nav className="bottom-nav">
      {renderItem(items[0])}
      {renderItem(items[1])}

      {/* 가운데 스캔 FAB — 앱의 1순위 진입점 */}
      <Link to="/scan" className="scan-fab" aria-label="스캔">
        <span className="scan-fab-badge">
          <svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="#15150F" strokeWidth="2.1" strokeLinecap="round" aria-hidden>
            <path d="M3 7V4h3M21 7V4h-3M3 17v3h3M21 17v3h-3" />
            <path d="M7 9v6M11 9v6M15 9v6M18 9v6" strokeWidth="1.7" />
          </svg>
        </span>
        <span className="scan-fab-label">스캔</span>
      </Link>

      {renderItem(items[2])}
      {renderItem(items[3])}
    </nav>
  );
}
