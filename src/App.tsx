import { lazy, Suspense, useEffect, useState } from 'react';
import { pickSplashTagline } from './copy/marketing';
import Wordmark from './components/Wordmark';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import Layout from './components/Layout';
import Home from './pages/Home';
import Notification from './components/Notification';
import ErrorBoundary from './components/ErrorBoundary';
import EntryGate from './components/EntryGate';
import { markEntryGateDone, readEntryGateDone } from './lib/entryGateStorage';
import { isAdminExperience, toggleAdminDesktopMode } from './utils/adminHost';

// 첫 진입 화면(Home)만 즉시 로드하고, 나머지 라우트는 코드 스플릿으로 지연 로드한다.
// 관리자 라우트는 일반 사용자 번들에서 완전히 분리된다.
const Search = lazy(() => import('./pages/Search'));
const Profile = lazy(() => import('./pages/Profile'));
const Detail = lazy(() => import('./pages/Detail'));
const Comparison = lazy(() => import('./pages/Comparison'));
const AnalysisResult = lazy(() => import('./pages/AnalysisResult'));
const Scan = lazy(() => import('./pages/Scan'));
const Brand = lazy(() => import('./pages/Brand'));
const Login = lazy(() => import('./pages/Login'));
const ViralEvent = lazy(() => import('./pages/ViralEvent'));
const Test = lazy(() => import('./pages/Test'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Refund = lazy(() => import('./pages/Refund'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts'));
const AdminIngredients = lazy(() => import('./pages/admin/AdminIngredients'));
const AdminUnmatched = lazy(() => import('./pages/admin/AdminUnmatched'));
const AdminMembers = lazy(() => import('./pages/admin/AdminMembers'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));
const AdminAuthGuard = lazy(() => import('./pages/admin/AdminAuthGuard'));

/** 라우트 전환 중 표시할 최소 로딩 인디케이터 — 레이아웃 시프트 없이 중앙에 고정 */
function RouteFallback() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
      <div
        className="vero-spin"
        style={{ width: '32px', height: '32px', border: '3px solid rgba(250, 204, 21, 0.3)', borderTopColor: 'var(--primary-dark)', borderRadius: '50%' }}
      />
    </div>
  );
}

function App() {
  const { initApp, isInitializing, isLoggedIn } = useStore();
  const [splashLine] = useState(() => pickSplashTagline());
  const adminMode = typeof window !== 'undefined'
    && isAdminExperience(window.location.hostname, window.location.pathname);
  const [showEntrySplash, setShowEntrySplash] = useState(() => !adminMode);
  const [entryGateOpen, setEntryGateOpen] = useState(() => (adminMode ? false : !readEntryGateDone()));

  useEffect(() => {
    if (!adminMode) return;
    if (typeof window === 'undefined') return;
    if (window.location.pathname.startsWith('/admin')) return;
    const nextUrl = `/admin${window.location.search}${window.location.hash}`;
    window.location.replace(nextUrl);
  }, [adminMode]);

  useEffect(() => {
    toggleAdminDesktopMode(adminMode);
    return () => toggleAdminDesktopMode(false);
  }, [adminMode]);

  useEffect(() => {
    initApp();
  }, [initApp]);

  useEffect(() => {
    if (adminMode) return;
    const timer = window.setTimeout(() => setShowEntrySplash(false), 1200);
    return () => window.clearTimeout(timer);
  }, [adminMode]);

  useEffect(() => {
    if (!isInitializing && isLoggedIn) {
      markEntryGateDone();
      queueMicrotask(() => setEntryGateOpen(false));
    }
  }, [isInitializing, isLoggedIn]);

  const showSplash = !adminMode && (isInitializing || showEntrySplash);

  if (showSplash) {
    // 스플래시 — 잉크 배경 위 워드마크, 하단에 노란 점 3개가 순차 펄스 (프로토타입 Splash)
    return (
      <div style={{
        position: 'absolute', inset: 0, zIndex: 80, background: '#15150F',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '18px',
      }}>
        <div className="vr-anim-up">
          <Wordmark height={44} />
        </div>
        <div className="vr-anim-fade" style={{ fontSize: '14.5px', fontWeight: 700, color: '#A5A596', letterSpacing: '-0.01em', textAlign: 'center', padding: '0 24px' }}>
          {splashLine}
        </div>
        <div style={{ position: 'absolute', bottom: '44px', display: 'flex', gap: '5px' }}>
          {[0, 0.15, 0.3].map((delay) => (
            <div
              key={delay}
              style={{
                width: '6px', height: '6px', borderRadius: '50%', background: '#FFD90A',
                animation: `vPulse 1s ${delay}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Notification />
      <ErrorBoundary>
      <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="search" element={<Search />} />
          {/* 구 /ranking(인기·랭킹) 경로는 제거 — 검색으로 리다이렉트 */}
          <Route path="ranking" element={<Navigate to="/search" replace />} />
          {/* 인증 페이지는 Login으로 일원화 — 구 /auth 링크·북마크는 /login으로 리다이렉트 */}
          <Route path="auth" element={<Navigate to="/login" replace />} />
          <Route path="login" element={<Login />} />
          <Route path="brand/:brandName" element={<Brand />} />
          <Route path="event/viral" element={<ViralEvent />} />
          <Route path="event/personality-quiz" element={<Test />} />
          <Route path="profile" element={<Profile />} />
          <Route path="comparison" element={<Comparison />} />
          {/* 구 /cart(장바구니·결제) 경로 제거 — 홈으로 리다이렉트 */}
          <Route path="cart" element={<Navigate to="/" replace />} />
          <Route path="analysis" element={<AnalysisResult />} />
          <Route path="product/:id" element={<Detail />} />
          <Route path="terms" element={<Terms />} />
          <Route path="privacy" element={<Privacy />} />
          <Route path="refund" element={<Refund />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* OAuth 리다이렉트 콜백 (앱 크롬 없이 전체 화면 스피너) */}
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Immersive full-screen scanner (앱 헤더/네비 없이 카메라 전체화면) */}
        <Route path="/scan" element={<Scan />} />

        {/* Admin CMS Routes — Protected */}
        <Route path="/admin" element={<AdminAuthGuard><AdminLayout /></AdminAuthGuard>}>
          <Route index element={<AdminDashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="ingredients" element={<AdminIngredients />} />
          <Route path="unmatched-ingredients" element={<AdminUnmatched />} />
          <Route path="members" element={<AdminMembers />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
      </Routes>
      </Suspense>
      </ErrorBoundary>

      {!adminMode && entryGateOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            maxWidth: '480px',
            margin: '0 auto',
          }}
        >
          <EntryGate
            onBrowse={() => {
              markEntryGateDone();
              setEntryGateOpen(false);
            }}
            onDismissForLogin={() => setEntryGateOpen(false)}
          />
        </div>
      )}
    </BrowserRouter>
  );
}

export default App;
