/** 라우트별 헤더 형태 — 프로토타입의 showLogoHeader / showBackHeader 분기와 동일 */
export type HeaderKind = 'logo' | 'back' | 'none';

interface RouteChrome {
  header: HeaderKind;
  /** 로고 헤더 우측 상단의 보조 라벨 (headerSub) */
  sub?: string;
  /** 뒤로 헤더 가운데 제목 (pageTitle) */
  title?: string;
  /** 하단 탭바 노출 여부 (showNav) */
  nav: boolean;
}

/**
 * 경로 → 화면 크롬 매핑.
 * 프로토타입은 단일 컴포넌트 안의 route 상태로 분기하지만, 실제 앱은 라우터를 쓰므로
 * pathname 기준으로 같은 표를 재현한다.
 */
export function resolveRouteChrome(pathname: string, search: string): RouteChrome {
  const diaryTab = new URLSearchParams(search).get('tab') === 'diary';

  if (pathname === '/') return { header: 'logo', sub: '', nav: true };
  if (pathname.startsWith('/search')) return { header: 'logo', sub: '탐색', nav: true };
  if (pathname.startsWith('/comparison')) return { header: 'logo', sub: '비교함', nav: true };
  if (pathname.startsWith('/profile')) {
    return diaryTab
      ? { header: 'logo', sub: '다이어리', nav: true }
      : { header: 'logo', sub: '마이 펫', nav: true };
  }
  if (pathname.startsWith('/product/')) return { header: 'back', title: '', nav: false };
  if (pathname.startsWith('/analysis')) return { header: 'back', title: '분석 리포트', nav: false };
  if (pathname.startsWith('/brand/')) return { header: 'back', title: '', nav: false };
  if (pathname.startsWith('/login')) return { header: 'back', title: '로그인', nav: false };
  if (pathname.startsWith('/event/personality-quiz')) return { header: 'back', title: '성향 테스트', nav: false };
  if (pathname.startsWith('/event/')) return { header: 'back', title: '이벤트', nav: false };
  if (pathname.startsWith('/terms')) return { header: 'back', title: '약관', nav: false };
  if (pathname.startsWith('/privacy')) return { header: 'back', title: '개인정보', nav: false };
  if (pathname.startsWith('/refund')) return { header: 'back', title: '환불 정책', nav: false };
  return { header: 'back', title: '', nav: false };
}
