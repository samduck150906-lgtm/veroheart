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

/* ── 배경 스크롤 잠금 ──────────────────────────────────────────────
 * 바텀시트·모달이 열려 있는 동안 뒤 화면이 따라 스크롤되지 않게 한다.
 *
 * 주의 1: 이 앱의 스크롤 영역은 body 가 아니라 .app-main 이다(#root 는
 *   overflow:hidden). body.overflow 만 건드리면 아무것도 잠기지 않는다.
 *   관리자 데스크톱 모드에서는 #root 높이가 auto 라 body 가 스크롤되므로
 *   두 곳 모두 잠근다.
 * 주의 2: 시트가 겹쳐 열릴 수 있으므로 참조 카운트로 관리한다. 카운트 없이
 *   각자 해제하면 하나가 닫힐 때 아직 열려 있는 시트 뒤가 풀린다.
 */
let scrollLockCount = 0;
let previousBodyOverflow = '';
let previousMainOverflow = '';

export function lockAppScroll(): void {
  scrollLockCount += 1;
  if (scrollLockCount > 1) return;
  if (typeof document === 'undefined') return;

  previousBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';

  const main = getAppScrollEl();
  if (main) {
    previousMainOverflow = main.style.overflow;
    main.style.overflow = 'hidden';
  }
}

export function unlockAppScroll(): void {
  if (scrollLockCount === 0) return;
  scrollLockCount -= 1;
  if (scrollLockCount > 0) return;
  if (typeof document === 'undefined') return;

  document.body.style.overflow = previousBodyOverflow;
  const main = getAppScrollEl();
  if (main) main.style.overflow = previousMainOverflow;
}

/** 테스트 전용 — 잠금 카운트를 초기화한다. */
export function __resetAppScrollLock(): void {
  scrollLockCount = 0;
  previousBodyOverflow = '';
  previousMainOverflow = '';
  if (typeof document !== 'undefined') {
    document.body.style.overflow = '';
    const main = getAppScrollEl();
    if (main) main.style.overflow = '';
  }
}
