import React, { useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  ExternalLink,
  FlaskConical,
  Home,
  LayoutDashboard,
  LayoutList,
  LogOut,
  Mail,
  Menu,
  NotebookPen,
  Settings,
  ShoppingBag,
  Trash2,
  Users,
  DatabaseZap,
  X,
} from 'lucide-react';
import { clearAdminSession } from '../../lib/adminSession';
import './admin.css';

/** 메뉴 이름만으로는 뭘 하는 곳인지 알기 어려운 화면이 있어 한 줄로 설명한다. */
const MENU_DESCRIPTIONS: Record<string, string> = {
  '/admin': '오늘의 등록 현황과 처리해야 할 운영 항목을 한눈에 봅니다.',
  '/admin/products': '앱에 노출되는 제품을 등록·수정하고 노출 여부와 상단 고정을 관리합니다.',
  '/admin/categories': '앱 홈·검색에 보이는 카테고리와 그 순서를 직접 관리합니다.',
  '/admin/ingredients': '성분 사전을 관리하고, 사전에 없어 매칭되지 않은 원료명을 검수합니다.',
  '/admin/data-quality': '원재료·영양정보·바코드·이미지가 빠진 제품을 공식 출처로 채워 넣는 작업 목록입니다.',
  '/admin/users': '가입한 회원을 조회하고 필요하면 탈퇴 처리합니다.',
  '/admin/diary': '보호자가 앱에 기록한 급여 일지입니다. 운영 확인용 읽기 전용 목록입니다.',
  '/admin/waitlist': '출시 알림을 신청한 사전 등록자 명단입니다.',
  '/admin/trash': '삭제한 제품·성분을 되살릴 수 있는 안전망입니다. 영구 삭제 전까지 보관됩니다.',
  '/admin/settings': '점검 모드·가입 허용 등 앱 전체에 적용되는 스위치입니다.',
};

const AdminLayout: React.FC = () => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const menuItems = useMemo(
    () => [
      { path: '/admin', icon: <LayoutDashboard size={18} />, label: '대시보드' },
      { path: '/admin/products', icon: <ShoppingBag size={18} />, label: '제품 관리' },
      { path: '/admin/categories', icon: <LayoutList size={18} />, label: '카테고리 관리' },
      // 미매칭 성분은 성분 사전 안의 탭으로 옮겼다(같은 사전을 두 곳에서 관리하지 않는다).
      { path: '/admin/ingredients', icon: <FlaskConical size={18} />, label: '성분 관리' },
      { path: '/admin/data-quality', icon: <DatabaseZap size={18} />, label: '데이터 품질' },
      { path: '/admin/users', icon: <Users size={18} />, label: '회원 관리' },
      { path: '/admin/diary', icon: <NotebookPen size={18} />, label: '식이 다이어리' },
      { path: '/admin/waitlist', icon: <Mail size={18} />, label: '대기자 명단' },
      { path: '/admin/trash', icon: <Trash2 size={18} />, label: '휴지통' },
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
            <p>{MENU_DESCRIPTIONS[activeMenu?.path ?? ''] ?? '성분 분석·식이 다이어리 서비스의 운영 데이터를 관리하세요.'}</p>
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
