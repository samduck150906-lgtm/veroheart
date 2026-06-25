import { Link, useLocation } from 'react-router-dom';
import { Home, Search, MessageCircle } from 'lucide-react';

const PawIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
    <g fill={active ? 'var(--brand-deep)' : 'currentColor'}>
      <ellipse cx="7" cy="9" rx="1.9" ry="2.5" />
      <ellipse cx="12" cy="7.4" rx="1.9" ry="2.6" />
      <ellipse cx="17" cy="9" rx="1.9" ry="2.5" />
      <path d="M12 11.5c-2.6 0-4.7 1.9-4.7 4.2 0 1.7 1.4 2.6 3 2.6.7 0 1.2-.2 1.7-.2s1 .2 1.7.2c1.6 0 3-.9 3-2.6 0-2.3-2.1-4.2-4.7-4.2z" />
    </g>
  </svg>
);

export default function BottomNav() {
  const location = useLocation();

  const hideOn = ['/login', '/auth'];
  if (hideOn.some((p) => location.pathname === p || location.pathname.startsWith(p + '/'))) {
    return null;
  }

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const items = [
    { path: '/', label: '홈', Icon: Home },
    { path: '/search', label: '검색', Icon: Search },
    { path: '/community', label: '커뮤니티', Icon: MessageCircle },
    { path: '/profile', label: '마이', Icon: null as null },
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
