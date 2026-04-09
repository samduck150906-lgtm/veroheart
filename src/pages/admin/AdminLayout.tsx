import React, { useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  ShoppingBag, 
  FlaskConical, 
  LayoutDashboard, 
  Settings, 
  ChevronRight,
  LogOut,
  Package,
} from 'lucide-react';
import { VERORO_LOGO_SRC } from '../../constants/assets';
import { toggleAdminDesktopMode } from '../../utils/adminHost';

const AdminLayout: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    toggleAdminDesktopMode(true);
    return () => toggleAdminDesktopMode(false);
  }, []);

  const menuItems = [
    { path: '/admin', icon: <LayoutDashboard size={20} />, label: '대시보드' },
    { path: '/admin/products', icon: <ShoppingBag size={20} />, label: '제품 관리' },
    { path: '/admin/ingredients', icon: <FlaskConical size={20} />, label: '성분 관리' },
    { path: '/admin/settings', icon: <Settings size={20} />, label: '시스템 설정' },
  ];

  return (
    <div className="admin-container">
      <aside className="admin-sidebar">
        <div className="admin-logo">
          <img src={VERORO_LOGO_SRC} alt="VeRoRo" className="admin-logo-img" />
          <div className="logo-text">
            <small>Admin Console</small>
          </div>
        </div>

        <nav className="admin-nav">
          {menuItems.map((item) => (
            <Link 
              key={item.path} 
              to={item.path} 
              className={`admin-nav-item ${location.pathname === item.path ? 'active' : ''}`}
            >
              <span className="item-icon">{item.icon}</span>
              <span className="item-label">{item.label}</span>
              {location.pathname === item.path && <ChevronRight size={16} className="active-arrow" />}
            </Link>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <Link to="/" className="back-to-site">
            <Package size={20} />
            <span>메인 사이트로</span>
          </Link>
          <button className="logout-btn">
            <LogOut size={20} />
            <span>로그아웃</span>
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <div className="header-title">
            <h1>{menuItems.find(item => item.path === location.pathname)?.label || '관리자'}</h1>
            <p>오늘의 운영 현황을 확인하고 관리하세요.</p>
          </div>
          <div className="header-actions">
            <div className="user-profile">
              <div className="avatar">AD</div>
              <div className="info">
                <span className="name">관리자</span>
                <span className="role">Super Admin</span>
              </div>
            </div>
          </div>
        </header>
        
        <section className="admin-content">
          <Outlet />
        </section>
      </main>

      <style>{`
        .admin-container {
          display: flex;
          min-height: 100vh;
          min-width: 1280px;
          width: 100%;
          background: linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%);
          color: #1e293b;
          font-family: 'Inter', sans-serif;
        }

        .admin-sidebar {
          width: 296px;
          min-width: 296px;
          background: rgba(255, 255, 255, 0.96);
          border-right: 1px solid #dbe3f1;
          display: flex;
          flex-direction: column;
          position: sticky;
          top: 0;
          height: 100vh;
          z-index: 100;
          box-shadow: 24px 0 48px rgba(15, 23, 42, 0.06);
          backdrop-filter: blur(18px);
        }

        .admin-logo {
          padding: 32px 24px 24px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 10px;
        }

        .admin-logo-img {
          height: 32px;
          width: auto;
          object-fit: contain;
          display: block;
        }

        .logo-text small {
          font-size: 0.75rem;
          color: #6366f1;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .admin-nav {
          flex: 1;
          padding: 0 18px;
        }

        .admin-nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 15px 16px;
          margin-bottom: 8px;
          border-radius: 16px;
          color: #64748b;
          text-decoration: none;
          transition: all 0.2s ease;
          position: relative;
          border: 1px solid transparent;
        }

        .admin-nav-item:hover {
          background-color: #eef2ff;
          color: #312e81;
          border-color: #c7d2fe;
        }

        .admin-nav-item.active {
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
          color: #ffffff;
          box-shadow: 0 18px 32px rgba(99, 102, 241, 0.32);
        }

        .item-label {
          font-weight: 700;
          font-size: 0.95rem;
        }

        .active-arrow {
          margin-left: auto;
        }

        .admin-sidebar-footer {
          padding: 24px 18px 26px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .back-to-site, .logout-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          border-radius: 14px;
          font-size: 0.875rem;
          font-weight: 700;
          color: #64748b;
          text-decoration: none;
          background: #fff;
          border: none;
          cursor: pointer;
          width: 100%;
          transition: all 0.2s;
          box-shadow: inset 0 0 0 1px #e2e8f0;
        }

        .back-to-site:hover, .logout-btn:hover {
          background-color: #eef2ff;
          color: #312e81;
        }

        .admin-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .admin-header {
          min-height: 96px;
          padding: 24px 40px;
          background: rgba(255, 255, 255, 0.92);
          border-bottom: 1px solid #dbe3f1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          backdrop-filter: blur(18px);
          position: sticky;
          top: 0;
          z-index: 40;
        }

        .header-title h1 {
          font-size: 2rem;
          font-weight: 900;
          color: #1e293b;
          margin: 0;
        }

        .header-title p {
          font-size: 0.95rem;
          color: #64748b;
          margin: 6px 0 0 0;
        }

        .user-profile {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 14px;
          background: #ffffff;
          border-radius: 999px;
          border: 1px solid #dbe3f1;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
        }

        .avatar {
          width: 32px;
          height: 32px;
          background: #6366f1;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 700;
        }

        .info {
          display: flex;
          flex-direction: column;
        }

        .info .name {
          font-size: 0.8125rem;
          font-weight: 600;
          color: #1e293b;
        }

        .info .role {
          font-size: 0.6875rem;
          color: #64748b;
        }

        .admin-content {
          padding: 32px 40px 40px;
          overflow-y: auto;
          flex: 1;
        }
      `}</style>
    </div>
  );
};

export default AdminLayout;
