import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';
import { isAdminExperience, toggleAdminDesktopMode } from './utils/adminHost';

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  const adminMode = isAdminExperience(window.location.hostname, window.location.pathname);
  toggleAdminDesktopMode(adminMode);

  // 새 배포로 이전 빌드의 청크가 삭제되면 동적 import 가 404 로 실패한다.
  // (예: 검색→상품 이동 중 supabase 청크 로드 실패) Vite 의 preloadError 를 받아
  // 최신 빌드로 한 번 새로고침한다. 10초 내 재발 시엔 무한 루프 방지를 위해 건너뛴다.
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    const KEY = 'vero:last-chunk-reload';
    const now = Date.now();
    const last = Number(window.sessionStorage.getItem(KEY) || 0);
    if (now - last < 10_000) return;
    window.sessionStorage.setItem(KEY, String(now));
    window.location.reload();
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <HelmetProvider>
        <App />
      </HelmetProvider>
    </ErrorBoundary>
  </StrictMode>,
);
