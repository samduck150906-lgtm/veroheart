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
