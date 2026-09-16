/**
 * 관리자 세션 토큰 보관소.
 *
 * 로그인 입력값 자체는 저장하지 않는다. 서버(admin-write)가 발급한 HMAC 서명
 * 단기 세션만 보관한다. 추가로
 *   - sessionStorage(탭 종료 시 소멸) 에만 저장하고
 *   - 발급 시각을 함께 저장해 TTL 이 지나면 스스로 만료시킨다.
 *
 * 서버도 매 요청마다 서명과 만료시각을 검증한다.
 */

export const ADMIN_TOKEN_KEY = 'vh_admin_auth';
export const ADMIN_TOKEN_ISSUED_KEY = 'vh_admin_auth_issued_at';

/** 관리자 세션 유효 시간 (8시간) */
export const ADMIN_SESSION_TTL_MS = 8 * 60 * 60 * 1000;

function storage(): Storage | null {
  try {
    if (typeof sessionStorage === 'undefined') return null;
    return sessionStorage;
  } catch {
    return null;
  }
}

/** 만료되지 않은 관리자 토큰. 만료됐으면 정리하고 null 을 반환한다. */
export function readAdminToken(now: number = Date.now()): string | null {
  const store = storage();
  if (!store) return null;

  const token = store.getItem(ADMIN_TOKEN_KEY);
  if (!token) return null;

  const issuedRaw = store.getItem(ADMIN_TOKEN_ISSUED_KEY);
  const issuedAt = Number(issuedRaw);
  // 발급 시각이 없거나(구버전 세션) 손상됐으면 만료로 간주한다.
  if (!Number.isFinite(issuedAt) || issuedAt <= 0 || now - issuedAt > ADMIN_SESSION_TTL_MS) {
    clearAdminSession();
    return null;
  }
  return token;
}

export function storeAdminToken(token: string, now: number = Date.now()): void {
  const store = storage();
  if (!store) return;
  store.setItem(ADMIN_TOKEN_KEY, token);
  store.setItem(ADMIN_TOKEN_ISSUED_KEY, String(now));
}

export function clearAdminSession(): void {
  const store = storage();
  if (!store) return;
  store.removeItem(ADMIN_TOKEN_KEY);
  store.removeItem(ADMIN_TOKEN_ISSUED_KEY);
}

/**
 * 관리자 세션이 끊겼을 때 던지는 오류.
 *
 * 화면마다 자기 도메인 문구로 감싸면 안 되는 오류다. 세션이 만료되면 설정·
 * 다이어리·제품 화면이 각각 "설정을 불러오지 못했습니다", "다이어리 기록을
 * 불러오지 못했습니다"를 띄우는데, 실제로 필요한 행동은 다시 로그인하는 것
 * 하나뿐이다. 이 타입으로 구분해 로그인 화면으로 돌려보낸다.
 */
export class AdminSessionExpiredError extends Error {
  constructor(message = '관리자 세션이 만료되었습니다. 다시 로그인해 주세요.') {
    super(message);
    this.name = 'AdminSessionExpiredError';
  }
}

/** 세션 만료를 화면(AdminAuthGuard)에 알리는 이벤트 이름. */
export const ADMIN_SESSION_EXPIRED_EVENT = 'veroro:admin-session-expired';

/**
 * 세션을 정리하고 만료를 알린다.
 *
 * 호출부가 여러 곳(토큰 없음/서버 401)이라 한곳에 모아 둔다. 이벤트를 쓰는 이유는
 * lib 계층이 라우터에 의존하지 않게 하기 위해서다.
 */
export function notifyAdminSessionExpired(): void {
  clearAdminSession();
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent(ADMIN_SESSION_EXPIRED_EVENT));
  }
}
