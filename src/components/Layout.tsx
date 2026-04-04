import { Outlet, useLocation, Link } from 'react-router-dom';
import { Search, ShoppingBag, GitCompare, ChevronRight, Sparkles } from 'lucide-react';
import BottomNav from './BottomNav';
import Footer from './Footer';
import { VERORO_LOGO_SRC } from '../constants/assets';
import { useStore } from '../store/useStore';

export default function Layout() {
  const location = useLocation();
  const { cart, comparisonList, profile } = useStore();
  const pageMeta: Record<string, { title: string; subtitle: string }> = {
    '/': {
      title: '오늘의 맞춤 큐레이션',
      subtitle: `${profile.name}에게 맞는 성분·리뷰·랭킹을 한 번에 확인해보세요.`,
    },
    '/search': {
      title: '성분 기준 탐색',
      subtitle: '카테고리, 고민, 가격대를 조합해 빠르게 좁혀보세요.',
    },
    '/comparison': {
      title: '비교함',
      subtitle: '후보 제품을 한 화면에서 비교해 최종 결정하세요.',
    },
    '/profile': {
      title: '마이 펫',
      subtitle: '프로필, 찜, 주문, 분석 리포트를 한 곳에서 관리하세요.',
    },
    '/cart': {
      title: '장바구니',
      subtitle: '담아둔 제품을 확인하고 결제까지 이어서 진행하세요.',
    },
    '/checkout': {
      title: '안전 결제',
      subtitle: '배송 정보와 결제 수단을 확인한 뒤 안전하게 주문하세요.',
    },
    '/ranking': {
      title: '랭킹',
      subtitle: '많이 찾는 제품과 평점 좋은 제품을 빠르게 살펴보세요.',
    },
  };

  const isDetailPage = location.pathname.startsWith('/product');
  const meta = isDetailPage
    ? {
        title: '제품 상세',
        subtitle: '성분, 리뷰, 적합도를 확인하고 구매를 결정해보세요.',
      }
    : pageMeta[location.pathname] ?? {
        title: '베로로',
        subtitle: '반려동물 맞춤 쇼핑 경험',
      };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        width: '100%',
        position: 'relative',
      }}
    >
      <header
        className="glass"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 30,
          padding: '14px 20px 18px',
          borderBottomLeftRadius: '24px',
          borderBottomRightRadius: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, textDecoration: 'none' }} aria-label="VeRoRo 홈">
            <img
              src={VERORO_LOGO_SRC}
              alt="VeRoRo"
              style={{ height: '28px', width: 'auto', objectFit: 'contain', display: 'block' }}
            />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--primary-dark)' }}>for mindful pet parents</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)' }}>성분 기반 반려동물 쇼핑</div>
            </div>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Link
              to="/comparison"
              aria-label="비교함"
              style={{
                position: 'relative',
                width: '42px',
                height: '42px',
                borderRadius: '14px',
                display: 'grid',
                placeItems: 'center',
                color: 'var(--text-dark)',
                background: '#fff',
                border: '1px solid rgba(232, 90, 60, 0.12)',
                textDecoration: 'none',
              }}
            >
              <GitCompare size={18} />
              {comparisonList.length > 0 && (
                <span className="ui-count-badge">{comparisonList.length}</span>
              )}
            </Link>
            <Link
              to="/cart"
              aria-label="장바구니"
              style={{
                position: 'relative',
                width: '42px',
                height: '42px',
                borderRadius: '14px',
                display: 'grid',
                placeItems: 'center',
                color: 'var(--text-dark)',
                background: '#fff',
                border: '1px solid rgba(232, 90, 60, 0.12)',
                textDecoration: 'none',
              }}
            >
              <ShoppingBag size={18} />
              {cart.length > 0 && (
                <span className="ui-count-badge">{cart.length > 99 ? '99+' : cart.length}</span>
              )}
            </Link>
          </div>
        </div>

        <div className="ui-hero-panel" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span className="ui-badge ui-badge-soft">
              <Sparkles size={14} />
              맞춤 탐색
            </span>
          </div>
          <h1 style={{ fontSize: '23px', lineHeight: 1.28, marginBottom: '8px', fontWeight: 900, color: 'var(--text-dark)' }}>
            {meta.title}
          </h1>
          <p style={{ fontSize: '14px', color: '#5B5F68', lineHeight: 1.55, marginBottom: '14px' }}>
            {meta.subtitle}
          </p>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <Link
              to="/search"
              className="ui-search-shortcut"
              style={{ flex: 1, textDecoration: 'none' }}
            >
              <Search size={17} />
              <span style={{ flex: 1 }}>제품명, 브랜드, 성분으로 검색</span>
              <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </header>

      <main className="page-content container">
        <div className="animate-fade-in" style={{ paddingTop: '20px', paddingBottom: '20px' }}>
          <Outlet />
        </div>
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
}
