import { useCallback, useMemo, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import BottomNav from './BottomNav';
import Footer from './Footer';
import AppHeader from './AppHeader';
import { resolveRouteChrome } from '../lib/routeChrome';
import { usePublicSettings } from '../lib/publicSettings';

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

      {settings.maintenanceMode && (
        <div className="app-notice app-notice-warning" role="status">
          현재 서비스 점검 중이에요. 일부 기능이 일시적으로 동작하지 않을 수 있어요.
        </div>
      )}
      {!settings.maintenanceMode && settings.serviceNotice.enabled && settings.serviceNotice.message && (
        <div className="app-notice" role="status">
          {settings.serviceNotice.message}
        </div>
      )}

      <main className="app-main container" onScroll={onScroll}>
        <div className="vr-anim-fade">
          <Outlet />
        </div>
        {!shouldHideFooter && <Footer />}
      </main>

      {chrome.nav && <BottomNav />}
    </div>
  );
}
