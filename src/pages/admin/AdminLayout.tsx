import React, { useEffect, useMemo } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  ShoppingBag,
  FlaskConical,
  LayoutDashboard,
  Settings,
  LogOut,
  Home,
  ListChecks,
  Users,
} from 'lucide-react';
import { VERORO_LOGO_SRC } from '../../constants/assets';
import { clearAdminSession } from '../../lib/adminSession';
import './admin.css';

const AdminLayout: React.FC = () => {
  const location = useLocation();

  const menuItems = useMemo(
    () => [
      { path: '/admin', icon: <LayoutDashboard size={18} />, label: '대시보드' },
      { path: '/admin/products', icon: <ShoppingBag size={18} />, label: '제품 관리' },
      { path: '/admin/ingredients', icon: <FlaskConical size={18} />, label: '성분 관리' },
      { path: '/admin/unmatched-ingredients', icon: <ListChecks size={18} />, label: '미매칭 성분' },
      { path: '/admin/members', icon: <Users size={18} />, label: '회원 관리' },
      { path: '/admin/settings', icon: <Settings size={18} />, label: '시스템 설정' },
    ],
    []
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
    item.path === '/admin'
      ? location.pathname === '/admin'
      : location.pathname.startsWith(item.path)
  );

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-logo-wrap">
          <div className="admin-logo-badge">
            <img src={VERORO_LOGO_SRC} alt="VeRoRo" />
          </div>
          <div className="admin-logo-text">
            <h2>VeRoRo Admin</h2>
            <p>Operations Console</p>
          </div>
        </div>

        <nav className="admin-nav">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`admin-nav-link ${
                item.path === '/admin'
                  ? location.pathname === '/admin'
                    ? 'active'
                    : ''
                  : location.pathname.startsWith(item.path)
                  ? 'active'
                  : ''
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <Link to="/" className="admin-sidebar-btn">
            <Home size={16} />
            <span>서비스 홈으로</span>
          </Link>
          <button
            type="button"
            className="admin-sidebar-btn"
            onClick={() => {
              // 토큰과 발급 시각을 함께 지운다(부분 삭제로 세션이 남지 않게).
              clearAdminSession();
              window.location.reload();
            }}
          >
            <LogOut size={16} />
            <span>관리자 로그아웃</span>
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <h1>{activeMenu?.label ?? '관리자 콘솔'}</h1>
            <p>성분 분석·식이 다이어리 서비스의 운영 데이터를 관리하세요.</p>
          </div>
          <div className="admin-profile-chip">
            <div className="admin-profile-avatar">AD</div>
            <div className="admin-profile-meta">
              <strong>관리자</strong>
              <span>Super Admin</span>
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
