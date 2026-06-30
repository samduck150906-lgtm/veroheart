import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Search as SearchIcon } from 'lucide-react';
import BottomNav from './BottomNav';
import Footer from './Footer';
import { useStore } from '../store/useStore';

const PAGE_TITLES: Record<string, string> = {
  '/search': '검색',
  '/ranking': '랭킹',
  '/dictionary': '성분사전',
  '/comparison': '비교함',
  '/community': '커뮤니티',
  '/analysis': '분석 리포트',
  '/scan-result': '분석 리포트',
  '/pet-profile': '마이펫',
  '/terms': '이용약관',
  '/privacy': '개인정보처리방침',
  '/refund': '환불정책',
};

function getTitle(pathname: string): string {
  if (pathname.startsWith('/product/')) return '상품 상세';
  return PAGE_TITLES[pathname] ?? '';
}

const BrandPaw = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden style={{ flexShrink: 0 }}>
    <g fill="#3A2E1A">
      <ellipse cx="7" cy="9" rx="1.9" ry="2.5" />
      <ellipse cx="12" cy="7.4" rx="1.9" ry="2.6" />
      <ellipse cx="17" cy="9" rx="1.9" ry="2.5" />
      <path d="M12 11.5c-2.6 0-4.7 1.9-4.7 4.2 0 1.7 1.4 2.6 3 2.6.7 0 1.2-.2 1.7-.2s1 .2 1.7.2c1.6 0 3-.9 3-2.6 0-2.3-2.1-4.2-4.7-4.2z" />
    </g>
  </svg>
);

function HeaderActions({ onSearch, showSearch = true, favoriteCount = 0 }: { onSearch: () => void; showSearch?: boolean; favoriteCount?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
      <Link
        to="/profile?tab=favorites"
        aria-label="찜한 상품"
        style={{ position: 'relative', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
      >
        <span style={{ fontSize: '20px', lineHeight: 1 }}>🐾</span>
        {/* CHANGED: 하드코딩 "2" → 실제 찜 개수, 0개면 숨김 */}
        {favoriteCount > 0 && (
          <span style={{
            position: 'absolute', top: '4px', right: '2px', minWidth: '16px', height: '16px', padding: '0 4px',
            borderRadius: '8px', background: 'var(--ink)', color: '#fff', fontSize: '9.5px', fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
          }}>{favoriteCount > 99 ? '99+' : favoriteCount}</span>
        )}
      </Link>
      {/* CHANGED: 홈에는 본문에 큰 검색바가 있어 헤더 돋보기를 숨겨 중복 제거 (아이콘 정돈). */}
      {showSearch && (
        <button
          onClick={onSearch}
          aria-label="검색"
          style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink)' }}
        >
          <SearchIcon size={22} strokeWidth={2.2} />
        </button>
      )}
    </div>
  );
}

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;
  const favoriteCount = useStore((s) => s.favorites?.length ?? 0);

  const isHome = path === '/';
  // Pages that render their own header / are full-screen
  const noChromeOn = ['/profile', '/login', '/auth', '/scanner'];
  const hideChrome = noChromeOn.some((p) => path === p || path.startsWith(p + '/'));

  const hideFooterOn = ['/auth', '/login', '/scanner'];
  const shouldHideFooter = hideFooterOn.some((p) => path.startsWith(p));

  const title = getTitle(path);

  return (
    <div className="app-shell" style={{ backgroundColor: 'var(--bg-color)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {!hideChrome && (
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 50,
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderBottom: isHome ? '1px solid var(--hairline)' : '1px solid var(--hairline)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '56px', padding: '0 12px 0 16px' }}>
            {isHome ? (
              <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '7px', textDecoration: 'none' }} aria-label="베로로 홈">
                <BrandPaw />
                <span style={{ fontSize: '20px', fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.03em' }}>베로로</span>
              </Link>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
                <button
                  onClick={() => navigate(-1)}
                  aria-label="뒤로"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center', color: 'var(--ink)' }}
                >
                  <ChevronLeft size={26} strokeWidth={2.2} />
                </button>
                <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.02em' }}>{title}</span>
              </div>
            )}
            <HeaderActions onSearch={() => navigate('/search')} showSearch={!isHome} favoriteCount={favoriteCount} />
          </div>

          {/* Home sub-tabs: 홈 / 랭킹 */}
          {isHome && (
            // CHANGED: 활성 탭 밑줄을 텍스트 폭에 정확히 맞춰 정렬(좌측 치우침 해소) (문제 #7).
            <div className="flex px-4">
              <Link to="/" className="relative py-2.5 mr-6 text-[15px] font-semibold text-[#1A1A1A]" style={{ textDecoration: 'none' }}>
                홈
                <span className="absolute left-0 right-0 bottom-0 h-[2px] bg-[#1A1A1A] rounded-full" />
              </Link>
              <Link to="/ranking" className="relative py-2.5 text-[15px] font-semibold text-[#8B95A1]" style={{ textDecoration: 'none' }}>
                랭킹
              </Link>
            </div>
          )}
        </header>
      )}

      {/* CHANGED: 홈은 좌우 패딩을 컴포넌트(px-4/가로 스크롤 풀블리드)가 직접 제어하도록 .container 제외 (문제 #10). */}
      <main className={isHome ? 'app-main' : 'app-main container'} style={{ flex: 1 }}>
        <div className="animate-fade-in" style={{ paddingBottom: '20px' }}>
          <Outlet />
        </div>
      </main>

      {!shouldHideFooter && <Footer />}
      <BottomNav />
    </div>
  );
}
