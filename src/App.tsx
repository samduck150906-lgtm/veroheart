import NativeAuthListener from './components/NativeAuthListener';
import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import StartupSplash from './components/StartupSplash';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useStore } from './store/useStore';
import Layout from './components/Layout';
import Home from './pages/Home';
import Notification from './components/Notification';
import ErrorBoundary from './components/ErrorBoundary';
import EntryGate from './components/EntryGate';
import { markEntryGateDone, readEntryGateDone } from './lib/entryGateStorage';
import { isAdminExperience, isBlockedAdminRoute, toggleAdminDesktopMode } from './utils/adminHost';

// 첫 진입 화면(Home)만 즉시 로드하고, 나머지 라우트는 코드 스플릿으로 지연 로드한다.
// 관리자 라우트는 일반 사용자 번들에서 완전히 분리된다.
const Search = lazy(() => import('./pages/Search'));
const Profile = lazy(() => import('./pages/Profile'));
const Detail = lazy(() => import('./pages/Detail'));
const Diary = lazy(() => import('./pages/Diary'));
const AnalysisResult = lazy(() => import('./pages/AnalysisResult'));
const Scan = lazy(() => import('./pages/Scan'));
const NewProductScan = lazy(() => import('./pages/NewProductScan'));
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
const AdminCategories = lazy(() => import('./pages/admin/AdminCategories'));
const AdminTrash = lazy(() => import('./pages/admin/AdminTrash'));
const AdminPriceApprovals = lazy(() => import('./pages/admin/AdminPriceApprovals'));
const AdminProductRequests = lazy(() => import('./pages/admin/AdminProductRequests'));
const AdminScanSubmissions = lazy(() => import('./pages/admin/AdminScanSubmissions'));
const AdminMembers = lazy(() => import('./pages/admin/AdminMembers'));
const AdminDiary = lazy(() => import('./pages/admin/AdminDiary'));
const AdminWaitlist = lazy(() => import('./pages/admin/AdminWaitlist'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));
const AdminDataQuality = lazy(() => import('./pages/admin/AdminDataQuality'));
const AdminAuthGuard = lazy(() => import('./pages/admin/AdminAuthGuard'));
const AdminNotFound = lazy(() => import('./pages/admin/AdminNotFound'));

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

function EntryGateRoute({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  if (['/privacy', '/terms', '/account/delete', '/auth/recovery', '/auth/callback'].includes(pathname)) return null;
  return children;
}

const AccountDelete = lazy(() => import('./pages/AccountDelete'));
const PasswordRecovery = lazy(() => import('./pages/PasswordRecovery'));

function Application() {
  const { initApp, isInitializing, isLoggedIn } = useStore();
  const adminMode = typeof window !== 'undefined'
    && isAdminExperience(window.location.hostname, window.location.pathname);
  const [showEntrySplash, setShowEntrySplash] = useState(() => !adminMode);
  const completeEntrySplash = useCallback(() => setShowEntrySplash(false), []);
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
    const refresh = () => { if (document.visibilityState === 'visible') void useStore.getState().refreshCatalog(); };
    const timer = window.setInterval(refresh, 60_000);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [adminMode]);

  useEffect(() => {
    if (!isInitializing && isLoggedIn) {
      markEntryGateDone();
      queueMicrotask(() => setEntryGateOpen(false));
    }
  }, [isInitializing, isLoggedIn]);

  const showSplash = !adminMode && (isInitializing || showEntrySplash);

  if (showSplash) {
    return <StartupSplash onMinimumComplete={completeEntrySplash} />;
  }

  return (
    <BrowserRouter>
      <NativeAuthListener />
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
          <Route path="comparison" element={<Navigate to="/search" replace />} />
          <Route path="diary" element={<Diary />} />
          {/* 구 /cart(장바구니·결제) 경로 제거 — 홈으로 리다이렉트 */}
          <Route path="cart" element={<Navigate to="/" replace />} />
          <Route path="analysis" element={<AnalysisResult />} />
          <Route path="product/:id" element={<Detail />} />
          <Route path="product/:id/:slug" element={<Detail />} />
          <Route path="terms" element={<Terms />} />
          <Route path="privacy" element={<Privacy />} />
          <Route path="account/delete" element={<AccountDelete />} />
          <Route path="auth/recovery" element={<PasswordRecovery />} />
          <Route path="refund" element={<Refund />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* OAuth 리다이렉트 콜백 (앱 크롬 없이 전체 화면 스피너) */}
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Immersive full-screen scanner (앱 헤더/네비 없이 카메라 전체화면) */}
        <Route path="/scan" element={<Scan />} />
        <Route path="/scan/new" element={<NewProductScan />} />

        {/* Admin CMS Routes — Protected */}
        <Route path="/admin" element={<AdminAuthGuard><AdminLayout /></AdminAuthGuard>}>
          <Route index element={<AdminDashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="ingredients" element={<AdminIngredients />} />
          {/* 미매칭 성분은 성분 사전 안의 탭으로 옮겼다. 기존 링크·북마크는 그 탭으로 보낸다. */}
          <Route
            path="unmatched-ingredients"
            element={<Navigate to="/admin/ingredients?tab=unmatched" replace />}
          />
          <Route path="users" element={<AdminMembers />} />
          <Route path="members" element={<Navigate to="/admin/users" replace />} />
          <Route path="diary" element={<AdminDiary />} />
          <Route path="waitlist" element={<AdminWaitlist />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="data-quality" element={<AdminDataQuality />} />
          <Route path="trash" element={<AdminTrash />} />
          <Route path="price-approvals" element={<AdminPriceApprovals />} />
          <Route path="product-requests" element={<AdminProductRequests />} />
          <Route path="scan-submissions" element={<AdminScanSubmissions />} />
          <Route path="*" element={<AdminNotFound />} />
        </Route>
      </Routes>
      </Suspense>
      </ErrorBoundary>

      {!adminMode && entryGateOpen && (
        <EntryGateRoute><div
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
        </div></EntryGateRoute>
      )}
    </BrowserRouter>
  );
}

/** CDN 설정이 지연되거나 우회돼도 공개 앱에서는 관리자 React 트리를 만들지 않는다. */
function App() {
  const blocked = typeof window !== 'undefined'
    && isBlockedAdminRoute(window.location.hostname, window.location.pathname);
  if (blocked) {
    return (
      <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }}>
        <div>
          <h1 style={{ fontSize: 24, marginBottom: 8 }}>페이지를 찾을 수 없습니다.</h1>
          <a href="/">베로로 홈으로 이동</a>
        </div>
      </main>
    );
  }
  return <Application />;
}

export default App;
