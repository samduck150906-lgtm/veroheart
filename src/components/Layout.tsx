import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { Bell, Search, ArrowLeft } from 'lucide-react';
import BottomNav from './BottomNav';
import Footer from './Footer';
import { VERORO_LOGO_SRC } from '../constants/assets';
import { useStore } from '../store/useStore';
import { notify } from '../store/useNotification';


function PetContextBand({ profile, isLoggedIn, navigate }: { profile: any; isLoggedIn: boolean; navigate: any }) {
  if (!isLoggedIn) {
    return (
      <div style={{
        margin: '8px 16px 0',
        padding: '16px 16px 18px',
        borderRadius: 22, background: 'var(--brand-tint)', border: '1px solid var(--brand-line)',
        display: 'flex', alignItems: 'center', gap: 13,
      }}>
        <div style={{ position: 'relative', width: 54, height: 54, flexShrink: 0 }}>
          <div style={{ position: 'absolute', inset: -3, borderRadius: 999,
            background: 'conic-gradient(from 210deg, var(--brand), var(--brand-deep), var(--brand))' }} />
          <div style={{ position: 'absolute', inset: 0, borderRadius: 999, overflow: 'hidden', border: '2px solid var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF', fontSize: '28px' }}>
            🐾
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 12.5, color: 'var(--brand-deep)', letterSpacing: 0.2 }}>Pet Nutrition Curation</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em', marginTop: 1 }}>
            베로로에 오신 것을 환영해요
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            <span 
              onClick={() => navigate('/auth')}
              style={{ fontSize: 11, fontWeight: 700, color: 'var(--brand-deep)', cursor: 'pointer',
                padding: '2px 10px', borderRadius: 999, background: 'var(--surface)', border: '1px solid var(--brand-line)' }}
            >
              로그인하고 맞춤 분석 시작하기
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      margin: '8px 16px 0',
      padding: '16px 16px 18px',
      borderRadius: 22, background: 'var(--brand-tint)', border: '1px solid var(--brand-line)',
      display: 'flex', alignItems: 'center', gap: 13,
    }}>
      <div style={{ position: 'relative', width: 54, height: 54, flexShrink: 0 }}>
        <div style={{ position: 'absolute', inset: -3, borderRadius: 999,
          background: 'conic-gradient(from 210deg, var(--brand), var(--brand-deep), var(--brand))' }} />
        <div style={{ position: 'absolute', inset: 0, borderRadius: 999, overflow: 'hidden', border: '2px solid var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF', fontSize: '28px' }}>
          {profile.species === 'Cat' ? '🐱' : '🐶'}
        </div>
        <span style={{ position: 'absolute', bottom: 1, right: 1, width: 12, height: 12, borderRadius: 999,
          background: 'var(--safe)', border: '2px solid var(--surface)' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 12.5, color: 'var(--brand-deep)', letterSpacing: 0.2 }}>Pet Nutrition Curation</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {profile.name}를 위한 오늘의 큐레이션
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          {[profile.species === 'Cat' ? '고양이' : '강아지', `${profile.age || 0}세`, `${profile.weightKg || 0}kg`].map((t) => (
            <span key={t} style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-soft)',
              padding: '2px 8px', borderRadius: 999, background: 'var(--surface)', border: '1px solid var(--brand-line)' }}>{t}</span>
          ))}
        </div>
      </div>
      <button 
        onClick={() => notify.info('알림 기능은 곧 제공될 예정이에요')}
        style={{ flexShrink: 0, width: 38, height: 38, borderRadius: 999, cursor: 'pointer',
          background: 'var(--surface)', border: '1px solid var(--brand-line)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Bell size={18} color="var(--ink-soft)" />
      </button>
    </div>
  );
}

export default function Layout() {
  const navigate = useNavigate();
  const { profile, isLoggedIn } = useStore();
  const location = useLocation();
  
  const hideFooterOn = ['/auth'];
  const shouldHideFooter = hideFooterOn.some((path) => location.pathname.startsWith(path));
  
  const titleMap: Record<string, string> = {
    '/': '검색',
    '/search': '검색',
    '/scanner': '성분 스캐너',
    '/community': '커뮤니티',
    '/comparison': '비교함',
    '/profile': '마이 펫',
    '/cart': '장바구니',
    '/ranking': '랭킹',
  };

  const isDetailPage = location.pathname.startsWith('/product');
  const pageTitle = isDetailPage
    ? '제품 상세'
    : titleMap[location.pathname] ?? '베로로';

  const isHome = location.pathname === '/' || location.pathname === '/search';
  const isProfile = location.pathname === '/profile';

  return (
    <div className="app-shell" style={{ backgroundColor: 'var(--bg-color)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Dynamic Header */}
      {isHome ? (
        <PetContextBand profile={profile} isLoggedIn={isLoggedIn} navigate={navigate} />
      ) : isProfile ? (
        // Profile has its own embedded header, so we skip the global header
        null
      ) : (
        <header
          className="glass"
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            height: '56px',
            padding: '0 16px',
            borderBottom: '1px solid var(--hairline)',
            background: 'var(--surface-trans)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px',
              marginRight: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--ink)'
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--ink)', flex: 1 }}>
            {pageTitle}
          </span>
          <Link to="/" style={{ display: 'flex', alignItems: 'center' }} aria-label="베로로 홈">
            <img
              src={VERORO_LOGO_SRC}
              alt="VeRoRo"
              style={{ height: '28px', width: '28px', objectFit: 'contain', borderRadius: '8px' }}
            />
          </Link>
        </header>
      )}

      <main className="app-main container" style={{ flex: 1 }}>
        <div className="animate-fade-in" style={{ paddingBottom: '20px' }}>
          <Outlet />
        </div>
      </main>

      {!shouldHideFooter && <Footer />}
      <BottomNav />
    </div>
  );
}
