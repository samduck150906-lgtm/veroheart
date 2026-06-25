import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, MessageCircle, ScanLine } from 'lucide-react';

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
  const navigate = useNavigate();

  const hideOn = ['/login', '/auth', '/scanner'];
  if (hideOn.some((p) => location.pathname === p || location.pathname.startsWith(p + '/'))) {
    return null;
  }

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const sideItems = [
    { path: '/', label: '홈', Icon: Home },
    { path: '/search', label: '검색', Icon: Search },
  ];
  const rightItems = [
    { path: '/community', label: '커뮤니티', Icon: MessageCircle },
    { path: '/profile', label: '마이', Icon: null as null },
  ];

  return (
    <nav className="bottom-nav-bar">
      {sideItems.map(({ path, label, Icon }) => {
        const active = isActive(path);
        return (
          <Link key={path} to={path} className="tab-item" aria-label={label}>
            <Icon size={22} strokeWidth={active ? 2.4 : 2} color={active ? 'var(--brand-deep)' : 'var(--ink-400)'} />
            <span className="tab-label" style={{ color: active ? 'var(--brand-deep)' : 'var(--ink-400)' }}>{label}</span>
          </Link>
        );
      })}

      {/* Center Scanner FAB */}
      <button
        type="button"
        className="tab-fab"
        aria-label="성분 분석"
        onClick={() => navigate('/scanner')}
        style={{ position: 'relative' }}
      >
        <span className="tab-fab-btn" style={{ background: isActive('/scanner') ? 'var(--brand-deep)' : 'var(--brand)' }}>
          <ScanLine size={26} strokeWidth={2.4} color="#241B00" />
        </span>
        {/* CHANGED: 중앙 버튼 의미가 불명확해 "성분분석" 라벨 추가 (문제 #8) */}
        <span
          className="tab-label"
          style={{ position: 'absolute', left: 0, right: 0, bottom: 7, textAlign: 'center', color: 'var(--brand-deep)', fontWeight: 800 }}
        >
          성분분석
        </span>
      </button>

      {rightItems.map(({ path, label, Icon }) => {
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
