import React, { useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  ExternalLink,
  FlaskConical,
  Home,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Mail,
  Menu,
  NotebookPen,
  Settings,
  ShoppingBag,
  Users,
  DatabaseZap,
  X,
} from 'lucide-react';
import { clearAdminSession } from '../../lib/adminSession';
import './admin.css';

const AdminLayout: React.FC = () => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const menuItems = useMemo(
    () => [
      { path: '/admin', icon: <LayoutDashboard size={18} />, label: '대시보드' },
      { path: '/admin/products', icon: <ShoppingBag size={18} />, label: '제품 관리' },
      { path: '/admin/ingredients', icon: <FlaskConical size={18} />, label: '성분 관리' },
      { path: '/admin/unmatched-ingredients', icon: <ListChecks size={18} />, label: '미매칭 성분' },
      { path: '/admin/data-quality', icon: <DatabaseZap size={18} />, label: '데이터 품질' },
      { path: '/admin/users', icon: <Users size={18} />, label: '회원 관리' },
      { path: '/admin/diary', icon: <NotebookPen size={18} />, label: '식이 다이어리' },
      { path: '/admin/waitlist', icon: <Mail size={18} />, label: '대기자 명단' },
      { path: '/admin/settings', icon: <Settings size={18} />, label: '시스템 설정' },
    ],
    [],
  );

  useEffect(() => {
    document.body.classList.add('admin-mode');
    const root = document.getElementById('root');
    root?.classList.add('admin-mode');
    return () => {
      document.body.classList.remove('admin-mode');
      root?.classList.remove('admin-mode');
    };
  }, []);

  const activeMenu = menuItems.find((item) =>
    item.path === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(item.path),
  );

  useEffect(() => {
    document.title = `${activeMenu?.label ?? '페이지를 찾을 수 없음'} | VERORO Admin`;
  }, [activeMenu?.label, location.pathname]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);

  return (
    <div className="admin-shell">
      {mobileOpen && (
        <button type="button" className="admin-sidebar-scrim" aria-label="메뉴 닫기" onClick={() => setMobileOpen(false)} />
      )}
      <aside className={`admin-sidebar ${mobileOpen ? 'open' : ''}`} aria-label="관리자 메뉴">
        <div className="admin-logo-wrap">
          <div className="admin-logo-badge" aria-hidden="true">V</div>
          <div className="admin-logo-text">
            <h2>VERORO</h2>
            <p>Admin Console</p>
          </div>
          <button type="button" className="admin-sidebar-close" aria-label="메뉴 닫기" onClick={() => setMobileOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <nav className="admin-nav">
          {menuItems.map((item) => {
            const active = item.path === '/admin'
              ? location.pathname === '/admin'
              : location.pathname.startsWith(item.path);
            return (
              <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)} className={`admin-nav-link ${active ? 'active' : ''}`} aria-current={active ? 'page' : undefined}>
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="admin-sidebar-footer">
          <a href="https://veroro-app.netlify.app/" target="_blank" rel="noreferrer" className="admin-sidebar-btn">
            <Home size={16} />
            <span>서비스 홈 보기</span>
            <ExternalLink size={13} className="admin-sidebar-external" />
          </a>
          <button
            type="button"
            className="admin-sidebar-btn"
            onClick={() => {
              clearAdminSession();
              window.location.reload();
            }}
          >
            <LogOut size={16} />
            <span>로그아웃</span>
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <button type="button" className="admin-menu-button" aria-label="메뉴 열기" onClick={() => setMobileOpen(true)}>
            <Menu size={20} />
          </button>
          <div className="admin-topbar-copy">
            <h1>{activeMenu?.label ?? '관리자 콘솔'}</h1>
            <p>성분 분석·식이 다이어리 서비스의 운영 데이터를 관리하세요.</p>
          </div>
          <div className="admin-profile-chip">
            <div className="admin-profile-avatar">AD</div>
            <div className="admin-profile-meta">
              <strong>관리자</strong>
              <span>인증됨</span>
            </div>
          </div>
        </header>

        <section className="admin-content animate-fade-in">
          <Outlet />
        </section>
      </main>
    </div>
  );
};

export default AdminLayout;
