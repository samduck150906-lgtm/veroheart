import { lazy, Suspense, useEffect, useState } from 'react';
import { pickSplashTagline } from './copy/marketing';
import { VERORO_LOGO_SRC } from './constants/assets';
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
const Cart = lazy(() => import('./pages/Cart'));
const AnalysisResult = lazy(() => import('./pages/AnalysisResult'));
const Scan = lazy(() => import('./pages/Scan'));
const Ranking = lazy(() => import('./pages/Ranking'));
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
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
        height: '100vh', background: 'var(--bg-gradient)', padding: '32px 24px', textAlign: 'center',
        boxSizing: 'border-box',
      }}>
        <img
          src={VERORO_LOGO_SRC}
          alt="VeRoRo"
          style={{ height: '128px', width: 'auto', objectFit: 'contain', marginBottom: '26px', display: 'block' }}
        />
        <p style={{
          color: 'var(--text-dark)', fontSize: '15px', fontWeight: 600, lineHeight: 1.55, maxWidth: '320px', margin: '0 0 28px',
        }}>
          {splashLine}
        </p>
        <div style={{ width: '36px', height: '36px', border: '3px solid rgba(250, 204, 21, 0.3)', borderTopColor: 'var(--primary-dark)', borderRadius: '50%', animation: 'spin 0.85s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
          <Route path="ranking" element={<Ranking />} />
          {/* 인증 페이지는 Login으로 일원화 — 구 /auth 링크·북마크는 /login으로 리다이렉트 */}
          <Route path="auth" element={<Navigate to="/login" replace />} />
          <Route path="login" element={<Login />} />
          <Route path="brand/:brandName" element={<Brand />} />
          <Route path="event/viral" element={<ViralEvent />} />
          <Route path="event/personality-quiz" element={<Test />} />
          <Route path="profile" element={<Profile />} />
          <Route path="comparison" element={<Comparison />} />
          <Route path="cart" element={<Cart />} />
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
            background: 'var(--bg-gradient)',
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
