import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useStore } from './store/useStore';
import Layout from './components/Layout';
import Home from './pages/Home';
import Search from './pages/Search';
import Profile from './pages/Profile';
import Detail from './pages/Detail';
import Comparison from './pages/Comparison';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Success from './pages/Success';
import Fail from './pages/Fail';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Refund from './pages/Refund';
import Login from './pages/Login';
import Ranking from './pages/Ranking';
import Brand from './pages/Brand';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminProducts from './pages/admin/AdminProducts';
import AdminIngredients from './pages/admin/AdminIngredients';
import Notification from './components/Notification';
import AdminAuthGuard from './pages/admin/AdminAuthGuard';

function App() {
  const { initApp, isInitializing } = useStore();
  
  useEffect(() => {
    initApp();
  }, [initApp]);

  if (isInitializing) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--background)' }}>
        <p style={{ color: 'var(--primary-dark)', fontSize: '18px', fontWeight: 600 }}>베로하트 로딩중...</p>
      </div>
    );
  }

  return (
    <>
      <Notification />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="search" element={<Search />} />
            <Route path="profile" element={<Profile />} />
            <Route path="comparison" element={<Comparison />} />
            <Route path="cart" element={<Cart />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="success" element={<Success />} />
            <Route path="fail" element={<Fail />} />
            <Route path="product/:id" element={<Detail />} />
            <Route path="terms" element={<Terms />} />
            <Route path="privacy" element={<Privacy />} />
            <Route path="refund" element={<Refund />} />
            <Route path="ranking" element={<Ranking />} />
            <Route path="brand/:brandName" element={<Brand />} />
          </Route>
        
        {/* Login (no Layout wrapper) */}
        <Route path="/login" element={<Login />} />

        {/* Admin CMS Routes — Protected */}
        <Route path="/admin" element={<AdminAuthGuard><AdminLayout /></AdminAuthGuard>}>
          <Route index element={<AdminDashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="ingredients" element={<AdminIngredients />} />
        </Route>
      </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
