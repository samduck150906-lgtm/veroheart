// @ts-nocheck
import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import Notification from './components/Notification';
import AdminAuthGuard from './pages/admin/AdminAuthGuard';
import { isAdminExperience, toggleAdminDesktopMode } from './utils/adminHost';
import { ThemeProvider } from './theme/ThemeProvider';
import IngredientDictionary from './pages/IngredientDictionary';
import PersonalityQuiz from './pages/Test';
import ViralEvent from './pages/ViralEvent';
import NotFound from './pages/NotFound';

function App() {
  const { initApp } = useStore();
  const [mvpLoggedIn] = useState(() => localStorage.getItem('mvp_logged_in') === 'true');
  const adminMode = typeof window !== 'undefined'
    && isAdminExperience(window.location.hostname, window.location.pathname);

  useEffect(() => {
    toggleAdminDesktopMode(adminMode);
    return () => toggleAdminDesktopMode(false);
  }, [adminMode]);

  useEffect(() => {
    if (!adminMode) return;
    if (typeof window === 'undefined') return;
    if (window.location.pathname.startsWith('/admin')) return;
    const nextUrl = `/admin${window.location.search}${window.location.hash}`;
    window.location.replace(nextUrl);
  }, [adminMode]);

  useEffect(() => {
    try { initApp(); } catch(e) { /* ignore supabase errors in MVP */ }
  }, [initApp]);

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Notification />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/auth" element={<Login />} />

          <Route path="/" element={mvpLoggedIn ? <Layout /> : <Navigate to="/login" replace />}>
            <Route index element={<Home />} />
            <Route path="search" element={<Search />} />
            <Route path="scanner" element={<Scanner />} />
            <Route path="community" element={<Community />} />
            <Route path="profile" element={<Profile />} />
            <Route path="comparison" element={<Comparison />} />
            <Route path="ranking" element={<Ranking />} />
            <Route path="dictionary" element={<IngredientDictionary />} />
            <Route path="product/:id" element={<Detail />} />
            <Route path="analysis" element={<AnalysisResult />} />
            <Route path="scan-result" element={<ScanResult />} />
            <Route path="pet-profile" element={<PetProfilePage />} />
            <Route path="event/personality-quiz" element={<PersonalityQuiz />} />
            <Route path="event/viral" element={<ViralEvent />} />
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
            <Route path="settings" element={<AdminSettings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
