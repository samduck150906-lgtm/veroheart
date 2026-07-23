// 앱 스크롤 컨테이너 헬퍼.
// 이 앱은 window 가 아니라 .app-main(overflow-y:auto)이 유일한 스크롤 영역이다.
// (src/index.css "App shell: one scroll area (main)") 따라서 window.scrollTo /
// window.scrollY 는 동작하지 않는다. 스크롤 조작은 반드시 이 헬퍼를 통한다.

export function getAppScrollEl(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  return document.querySelector<HTMLElement>('.app-main');
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** 현재 스크롤 위치(px). 컨테이너가 없으면 window 폴백. */
export function getAppScrollTop(): number {
  const el = getAppScrollEl();
  if (el) return el.scrollTop;
  return typeof window !== 'undefined' ? window.scrollY || 0 : 0;
}

/**
 * 앱 스크롤 컨테이너를 최상단으로 이동.
 * reduced-motion 사용자는 애니메이션 없이 즉시 이동한다.
 * @param smooth 부드러운 스크롤 여부(기본 true). reduced-motion 이면 강제 즉시.
 */
export function scrollAppToTop(smooth = true): void {
  const behavior: ScrollBehavior = !smooth || prefersReducedMotion() ? 'auto' : 'smooth';
  const el = getAppScrollEl();
  if (el) {
    el.scrollTo({ top: 0, behavior });
    return;
  }
  if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior });
}
