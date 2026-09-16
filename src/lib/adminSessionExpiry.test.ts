import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ADMIN_SESSION_EXPIRED_EVENT,
  AdminSessionExpiredError,
  ADMIN_SESSION_TTL_MS,
  notifyAdminSessionExpired,
  readAdminToken,
  storeAdminToken,
} from './adminSession';

/**
 * 관리자 세션이 만료되면 화면마다 자기 도메인 문구로 오류를 띄우던 문제를 막는다.
 * ("설정을 불러오지 못했습니다" — 실제로 필요한 행동은 재로그인 하나뿐이다)
 */
describe('관리자 세션 만료', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('TTL 안에서는 토큰을 그대로 돌려준다', () => {
    const issued = Date.now();
    storeAdminToken('v1.aaa.bbb', issued);
    expect(readAdminToken(issued + ADMIN_SESSION_TTL_MS - 1000)).toBe('v1.aaa.bbb');
  });

  it('TTL 이 지나면 토큰을 비우고 null 을 준다', () => {
    const issued = Date.now();
    storeAdminToken('v1.aaa.bbb', issued);
    expect(readAdminToken(issued + ADMIN_SESSION_TTL_MS + 1)).toBeNull();
    // 만료된 토큰은 저장소에서도 지워져 다음 호출에 다시 쓰이지 않는다.
    expect(sessionStorage.getItem('vh_admin_auth')).toBeNull();
  });

  it('발급 시각이 없는 구버전 세션은 만료로 본다', () => {
    sessionStorage.setItem('vh_admin_auth', 'v1.aaa.bbb');
    expect(readAdminToken()).toBeNull();
  });

  it('만료를 알리면 세션을 지우고 이벤트를 쏜다', () => {
    storeAdminToken('v1.aaa.bbb');
    const listener = vi.fn();
    window.addEventListener(ADMIN_SESSION_EXPIRED_EVENT, listener);
    notifyAdminSessionExpired();
    window.removeEventListener(ADMIN_SESSION_EXPIRED_EVENT, listener);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem('vh_admin_auth')).toBeNull();
  });

  it('만료 오류는 일반 오류와 구분되는 타입이다', () => {
    const error = new AdminSessionExpiredError();
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('AdminSessionExpiredError');
    expect(error.message).toContain('다시 로그인');
  });
});
