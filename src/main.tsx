import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import App from './App.tsx';
import './index.css';
import { isAdminExperience, toggleAdminDesktopMode } from './utils/adminHost';

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  const adminMode = isAdminExperience(window.location.hostname, window.location.pathname);
  toggleAdminDesktopMode(adminMode);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>,
);
