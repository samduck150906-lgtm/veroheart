import { useCallback, useMemo, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import BottomNav from './BottomNav';
import Footer from './Footer';
import AppHeader from './AppHeader';
import { resolveRouteChrome } from '../lib/routeChrome';
import { usePublicSettings } from '../lib/publicSettings';

/**
 * 점검 모드 화면.
 *
 * 예전에는 점검 모드가 켜져도 안내 배너만 뜨고 모든 기능이 그대로 열려 있었다.
 * 스위치 이름과 실제 동작이 달라서, 운영자가 점검을 걸어 둔 동안에도 사용자는
 * 계속 데이터를 쓰고 있었다. 이제 사용자 화면은 실제로 막는다.
 *
 * 관리자 콘솔(/admin)은 이 Layout 바깥의 별도 라우트라 영향받지 않는다 —
 * 점검 중에도 관리자는 들어와 설정을 되돌릴 수 있어야 한다.
 */
function MaintenanceScreen() {
  return (
    <div
      role="status"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        minHeight: '60vh',
        padding: '0 28px',
        textAlign: 'center',
      }}
    >
      <span style={{ fontSize: '40px' }} aria-hidden="true">🛠️</span>
      <h1 style={{ margin: 0, fontSize: '19px', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-dark)' }}>
        지금은 서비스 점검 중이에요
      </h1>
      <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.6, color: 'var(--text-muted)' }}>
        점검이 끝나면 바로 다시 열어 드릴게요.
        <br />
        잠시 후 새로고침해 주세요.
      </p>
    </div>
  );
}

export default function Layout() {
  const location = useLocation();
  const chrome = useMemo(
    () => resolveRouteChrome(location.pathname, location.search),
    [location.pathname, location.search]
  );

  // 관리자 콘솔(시스템 설정 → app_settings)에서 켜고 끄는 운영 배너.
  // 설정을 못 읽으면 기본값(모두 꺼짐)이라 배너는 나타나지 않는다.
  const settings = usePublicSettings();

  // 프로토타입의 onScroll: 8px 넘어가면 헤더 그림자, 200px 넘어가면 상세 하단 CTA.
  // 여기서는 헤더 그림자만 셸이 관리하고, 스크롤 값은 하위 화면이 쓸 수 있게 노출한다.
  const [raised, setRaised] = useState(false);
  const raisedRef = useRef(false);
  const onScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    const next = e.currentTarget.scrollTop > 8;
    if (next !== raisedRef.current) {
      raisedRef.current = next;
      setRaised(next);
    }
  }, []);

  // 약관/개인정보/환불은 푸터의 법적 링크가 중복되므로 감춘다. 로그인도 프로토타입과 동일.
  const hideFooterOn = ['/login', '/terms', '/privacy', '/refund', '/product/', '/analysis'];
  const shouldHideFooter = hideFooterOn.some((path) => location.pathname.startsWith(path));

  return (
    <div className="app-shell">
      <AppHeader raised={raised} />

      {settings.serviceNotice.enabled && settings.serviceNotice.message && (
        <div className="app-notice" role="status">
          {settings.serviceNotice.message}
        </div>
      )}

      <main className="app-main container" onScroll={onScroll}>
        {settings.maintenanceMode ? (
          <MaintenanceScreen />
        ) : (
          <>
            <div className="vr-anim-fade">
              <Outlet />
            </div>
            {!shouldHideFooter && <Footer />}
          </>
        )}
      </main>

      {/* 점검 중에는 이동할 곳이 없으므로 하단 네비도 감춘다. */}
      {chrome.nav && !settings.maintenanceMode && <BottomNav />}
    </div>
  );
}
