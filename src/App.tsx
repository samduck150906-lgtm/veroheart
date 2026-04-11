import { useEffect, useState } from 'react';
import { pickSplashTagline } from './copy/marketing';
import { VERORO_LOGO_SRC } from './constants/assets';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useStore } from './store/useStore';
import Layout from './components/Layout';
import Home from './pages/Home';
import Search from './pages/Search';
import Profile from './pages/Profile';
import Detail from './pages/Detail';
import Comparison from './pages/Comparison';
import Cart from './pages/Cart';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Refund from './pages/Refund';
import Login from './pages/Login';
import Ranking from './pages/Ranking';
import Brand from './pages/Brand';
import ViralEvent from './pages/ViralEvent';
import PersonalityQuiz from './pages/Test';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminProducts from './pages/admin/AdminProducts';
import AdminIngredients from './pages/admin/AdminIngredients';
import Notification from './components/Notification';
import AdminAuthGuard from './pages/admin/AdminAuthGuard';
import EntryGate from './components/EntryGate';
import { markEntryGateDone, readEntryGateDone } from './lib/entryGateStorage';
import { isAdminExperience, toggleAdminDesktopMode } from './utils/adminHost';

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
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="search" element={<Search />} />
          <Route path="profile" element={<Profile />} />
          <Route path="comparison" element={<Comparison />} />
          <Route path="cart" element={<Cart />} />
          <Route path="product/:id" element={<Detail />} />
          <Route path="terms" element={<Terms />} />
          <Route path="privacy" element={<Privacy />} />
          <Route path="refund" element={<Refund />} />
          <Route path="ranking" element={<Ranking />} />
          <Route path="brand/:brandName" element={<Brand />} />
          <Route path="event/viral" element={<ViralEvent />} />
          <Route path="event/personality-quiz" element={<PersonalityQuiz />} />
        </Route>

        <Route path="/login" element={<Login />} />

        <Route path="/admin" element={<AdminAuthGuard><AdminLayout /></AdminAuthGuard>}>
          <Route index element={<AdminDashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="ingredients" element={<AdminIngredients />} />
        </Route>
      </Routes>

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
