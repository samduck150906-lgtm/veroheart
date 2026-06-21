// @ts-nocheck
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
import Scanner from './pages/Scanner';
import Community from './pages/Community';
import Ranking from './pages/Ranking';
import Comparison from './pages/Comparison';
import AnalysisResult from './pages/AnalysisResult';
import ScanResult from './pages/ScanResult';
import PetProfilePage from './pages/PetProfile';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Refund from './pages/Refund';
import Login from './pages/Login';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminProducts from './pages/admin/AdminProducts';
import AdminIngredients from './pages/admin/AdminIngredients';
import AdminSettings from './pages/admin/AdminSettings';
import AdminAnalysis from './pages/admin/AdminAnalysis';
import AdminSponsors from './pages/admin/AdminSponsors';
import Membership from './pages/Membership';
import Notification from './components/Notification';
import AdminAuthGuard from './pages/admin/AdminAuthGuard';
import { isAdminExperience, toggleAdminDesktopMode } from './utils/adminHost';
import { ThemeProvider } from './theme/ThemeProvider';
import IngredientDictionary from './pages/IngredientDictionary';
import PersonalityQuiz from './pages/Test';
import ViralEvent from './pages/ViralEvent';
import NotFound from './pages/NotFound';
import Brand from './pages/Brand';
import CommunityPost from './pages/CommunityPost';
import KnowledgeIngredients from './pages/KnowledgeIngredients';
import KnowledgeNutrients from './pages/KnowledgeNutrients';
import AuthCallback from './pages/AuthCallback';

function App() {
  const { initApp, isInitializing, isLoggedIn } = useStore();
  const [splashLine] = useState(() => pickSplashTagline());
  const adminMode = typeof window !== 'undefined'
    && isAdminExperience(window.location.hostname, window.location.pathname);
  const [showEntrySplash, setShowEntrySplash] = useState(() => !adminMode);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    if (typeof document !== 'undefined' && 'fonts' in document) {
      document.fonts.ready.then(() => setFontsLoaded(true)).catch(() => setFontsLoaded(true));
    } else {
      setFontsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!adminMode) return;
    if (typeof window === 'undefined') return;
    if (window.location.pathname.startsWith('/admin')) return;
    window.location.replace(`/admin${window.location.search}${window.location.hash}`);
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

  const showSplash = !adminMode && (isInitializing || showEntrySplash || !fontsLoaded);

  if (showSplash) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
        height: '100vh', background: '#F7F4EE', padding: '32px 24px', textAlign: 'center',
        boxSizing: 'border-box',
      }}>
        <img
          src={VERORO_LOGO_SRC}
          alt="VeRoRo"
          style={{ height: '128px', width: 'auto', objectFit: 'contain', marginBottom: '26px', display: 'block' }}
          onError={e => { e.currentTarget.style.display = 'none'; }}
        />
        <div style={{
          width: 72, height: 72, borderRadius: 22,
          background: 'linear-gradient(135deg, #F5C518 0%, #E8A800 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 20, boxShadow: '0 8px 24px rgba(245,197,24,0.3)',
          fontSize: 36,
        }}>🐾</div>
        <p style={{ color: '#191F28', fontSize: '17px', fontWeight: 700, lineHeight: 1.55, maxWidth: '280px', margin: '0 0 8px' }}>베로로</p>
        <p style={{ color: '#8B95A1', fontSize: '14px', fontWeight: 500, margin: '0 0 28px' }}>{splashLine}</p>
        <div style={{ width: '36px', height: '36px', border: '3px solid rgba(245,197,24,0.3)', borderTopColor: '#F5C518', borderRadius: '50%', animation: 'spin 0.85s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Notification />
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="search" element={<Search />} />
              <Route path="scanner" element={<Scanner />} />
              <Route path="community" element={<Community />} />
              <Route path="community/:postId" element={<CommunityPost />} />
              <Route path="auth" element={<Login />} />
              <Route path="login" element={<Login />} />
              <Route path="profile" element={<Profile />} />
              <Route path="comparison" element={<Comparison />} />
              <Route path="ranking" element={<Ranking />} />
              <Route path="dictionary" element={<IngredientDictionary />} />
              <Route path="knowledge/ingredients" element={<KnowledgeIngredients />} />
              <Route path="knowledge/nutrients" element={<KnowledgeNutrients />} />
              {/* <Route path="cart" element={<Cart />} /> */}
              {/* <Route path="checkout" element={<Checkout />} /> */}
              {/* <Route path="success" element={<Success />} /> */}
              {/* <Route path="fail" element={<Fail />} /> */}
              <Route path="product/:id" element={<Detail />} />
              <Route path="detail/:id" element={<Detail />} />
              <Route path="auth/callback" element={<AuthCallback />} />
              <Route path="analysis" element={<AnalysisResult />} />
              <Route path="scan-result" element={<ScanResult />} />
              <Route path="pet-profile" element={<PetProfilePage />} />
              <Route path="brand/:brandName" element={<Brand />} />
              <Route path="event/personality-quiz" element={<PersonalityQuiz />} />
              <Route path="event/viral" element={<ViralEvent />} />
              <Route path="membership" element={<Membership />} />
              <Route path="terms" element={<Terms />} />
              <Route path="privacy" element={<Privacy />} />
              <Route path="refund" element={<Refund />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          
          {/* Admin CMS Routes — Protected */}
          <Route path="/admin" element={<AdminAuthGuard><AdminLayout /></AdminAuthGuard>}>
            <Route index element={<AdminDashboard />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="ingredients" element={<AdminIngredients />} />
            <Route path="analysis" element={<AdminAnalysis />} />
            <Route path="sponsors" element={<AdminSponsors />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
