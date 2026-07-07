// 테마 관리 — 'system'(기기 설정 따름) / 'light' / 'dark'.
// data-theme 속성은 index.html 인라인 스크립트가 먼저 적용(무플래시)하고,
// 여기서는 사용자 토글과 시스템 변경 구독을 담당한다.

export type ThemeMode = 'system' | 'light' | 'dark';

const KEY = 'vh_theme';

export function getThemeMode(): ThemeMode {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    /* ignore */
  }
  return 'system';
}

export function prefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false;
}

/** 실제 적용될 다크 여부 */
export function resolveDark(mode: ThemeMode = getThemeMode()): boolean {
  return mode === 'dark' || (mode === 'system' && prefersDark());
}

export function applyTheme(mode: ThemeMode) {
  const dark = resolveDark(mode);
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
}

export function setThemeMode(mode: ThemeMode) {
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    /* ignore */
  }
  applyTheme(mode);
}

/** system → light → dark → system 순환 */
export function cycleThemeMode(): ThemeMode {
  const order: ThemeMode[] = ['system', 'light', 'dark'];
  const next = order[(order.indexOf(getThemeMode()) + 1) % order.length];
  setThemeMode(next);
  return next;
}

/** 시스템 테마 변경 구독 — mode가 'system'일 때만 반영. cleanup 함수 반환 */
export function subscribeSystemTheme(onChange: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = () => {
    if (getThemeMode() === 'system') {
      applyTheme('system');
      onChange();
    }
  };
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}
