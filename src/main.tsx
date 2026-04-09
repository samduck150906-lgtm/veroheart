import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import App from './App.tsx';
import './index.css';
import { isAdminHostname } from './utils/adminHost';

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  const adminMode = isAdminHostname(window.location.hostname);
  document.body.classList.toggle('admin-host-mode', adminMode);
  document.documentElement.classList.toggle('admin-host-mode', adminMode);
  document.getElementById('root')?.classList.toggle('admin-host-mode', adminMode);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>,
);
