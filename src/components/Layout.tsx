import { Outlet, useLocation } from 'react-router-dom';
import BottomNav from './BottomNav';

export default function Layout() {
  const location = useLocation();
  const titleMap: Record<string, string> = {
    '/': '베로하트 홈',
    '/search': '스마트 탐색',
    '/comparison': '비교함',
    '/profile': '마이 펫',
  };
  
  // 만약 상세페이지(/product/1 등)라면 뒤로가기 헤더를 보여줄 수 있지만,
  // MVP에서는 공통 헤더로 간단히 처리.
  const isDetailPage = location.pathname.startsWith('/product');

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%', padding: 0 }}>
      {/* Header */}
      <header className="glass" style={{
        position: 'absolute', top: 0, left: 0, right: 0, 
        height: '60px', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 20px', fontWeight: 700, fontSize: '18px'
      }}>
        {isDetailPage ? '제품 상세' : (titleMap[location.pathname] || '베로하트')}
      </header>
      
      {/* Main Content */}
      <main className="page-content container">
        <div className="animate-fade-in" style={{ paddingBottom: '20px' }}>
          <Outlet />
        </div>
      </main>

      {/* Bottom Nav */}
      <BottomNav />
    </div>
  );
}
