import { describe, it, expect, beforeEach } from 'vitest';
import {
  ADMIN_SESSION_TTL_MS,
  ADMIN_TOKEN_ISSUED_KEY,
  ADMIN_TOKEN_KEY,
  clearAdminSession,
  readAdminToken,
  storeAdminToken,
} from './adminSession';

describe('adminSession', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('stores and reads a token within the TTL', () => {
    const now = 1_700_000_000_000;
    storeAdminToken('dG9rZW4=', now);
    expect(readAdminToken(now + 60_000)).toBe('dG9rZW4=');
  });

  it('expires the token after the TTL and clears both keys', () => {
    const now = 1_700_000_000_000;
    storeAdminToken('dG9rZW4=', now);

    expect(readAdminToken(now + ADMIN_SESSION_TTL_MS + 1)).toBeNull();
    expect(sessionStorage.getItem(ADMIN_TOKEN_KEY)).toBeNull();
    expect(sessionStorage.getItem(ADMIN_TOKEN_ISSUED_KEY)).toBeNull();
  });

  it('treats a legacy session without an issued timestamp as expired', () => {
    // 구버전은 발급 시각 없이 토큰만 저장했다 — 무기한 유효한 세션이 남지 않게 만료 처리한다.
    sessionStorage.setItem(ADMIN_TOKEN_KEY, 'legacy-token');
    expect(readAdminToken()).toBeNull();
    expect(sessionStorage.getItem(ADMIN_TOKEN_KEY)).toBeNull();
  });

  it('returns null when no session exists', () => {
    expect(readAdminToken()).toBeNull();
  });

  it('clears everything on logout', () => {
    storeAdminToken('dG9rZW4=');
    clearAdminSession();
    expect(sessionStorage.getItem(ADMIN_TOKEN_KEY)).toBeNull();
    expect(sessionStorage.getItem(ADMIN_TOKEN_ISSUED_KEY)).toBeNull();
    expect(readAdminToken()).toBeNull();
  });
});
