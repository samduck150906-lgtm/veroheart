import React, { useEffect, useMemo } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  ShoppingBag,
  FlaskConical,
  LayoutDashboard,
  Settings, 
  LogOut,
  Home,
} from 'lucide-react';
import { VERORO_LOGO_SRC } from '../../constants/assets';
import './admin.css';

const AdminLayout: React.FC = () => {
  const location = useLocation();

  const menuItems = useMemo(
    () => [
      { path: '/admin', icon: <LayoutDashboard size={18} />, label: '대시보드' },
      { path: '/admin/products', icon: <ShoppingBag size={18} />, label: '제품 관리' },
      { path: '/admin/ingredients', icon: <FlaskConical size={18} />, label: '성분 관리' },
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
            <p>Commerce Dashboard</p>
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
            className="admin-sidebar-btn"
            onClick={() => {
              sessionStorage.removeItem('vh_admin_auth');
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
            <p>eMarketplace 운영 지표와 데이터를 관리하세요.</p>
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
