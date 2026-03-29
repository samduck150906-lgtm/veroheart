import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  ShoppingBag, 
  FlaskConical, 
  LayoutDashboard, 
  Settings, 
  ChevronRight,
  LogOut,
  Package,
  ShieldCheck
} from 'lucide-react';

const AdminLayout: React.FC = () => {
  const location = useLocation();

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
          <ShieldCheck className="logo-icon" size={32} />
          <div className="logo-text">
            <span>VERO HEART</span>
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
          background-color: #f8fafc;
          color: #1e293b;
          font-family: 'Inter', sans-serif;
        }

        .admin-sidebar {
          width: 280px;
          background: #ffffff;
          border-right: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          position: sticky;
          top: 0;
          height: 100vh;
          z-index: 100;
        }

        .admin-logo {
          padding: 32px 24px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .logo-icon {
          color: #6366f1;
        }

        .logo-text span {
          display: block;
          font-weight: 800;
          font-size: 1.25rem;
          letter-spacing: -0.025em;
          color: #1e293b;
        }

        .logo-text small {
          font-size: 0.75rem;
          color: #64748b;
          font-weight: 500;
        }

        .admin-nav {
          flex: 1;
          padding: 0 16px;
        }

        .admin-nav-item {
          display: flex;
          align-items: center;
          padding: 12px 16px;
          margin-bottom: 4px;
          border-radius: 12px;
          color: #64748b;
          text-decoration: none;
          transition: all 0.2s ease;
          position: relative;
        }

        .admin-nav-item:hover {
          background-color: #f1f5f9;
          color: #1e293b;
        }

        .admin-nav-item.active {
          background-color: #6366f1;
          color: #ffffff;
          box-shadow: 0 10px 15px -3px rgba(99, 102, 241, 0.3);
        }

        .item-icon {
          margin-right: 12px;
        }

        .item-label {
          font-weight: 500;
          font-size: 0.9375rem;
        }

        .active-arrow {
          margin-left: auto;
        }

        .admin-sidebar-footer {
          padding: 24px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .back-to-site, .logout-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 500;
          color: #64748b;
          text-decoration: none;
          background: none;
          border: none;
          cursor: pointer;
          width: 100%;
          transition: all 0.2s;
        }

        .back-to-site:hover, .logout-btn:hover {
          background-color: #f1f5f9;
          color: #1e293b;
        }

        .admin-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .admin-header {
          height: 100px;
          padding: 0 40px;
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .header-title h1 {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
        }

        .header-title p {
          font-size: 0.875rem;
          color: #64748b;
          margin: 4px 0 0 0;
        }

        .user-profile {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 6px 12px;
          background: #f8fafc;
          border-radius: 50px;
          border: 1px solid #e2e8f0;
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
          padding: 40px;
          overflow-y: auto;
          flex: 1;
        }

        @media (max-width: 1024px) {
          .admin-sidebar {
            width: 80px;
          }
          .logo-text, .item-label, .active-arrow, .back-to-site span, .logout-btn span, .info {
            display: none;
          }
          .admin-logo, .admin-nav-item, .admin-sidebar-footer {
            justify-content: center;
            padding: 20px;
          }
          .item-icon {
            margin-right: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminLayout;
