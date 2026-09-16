import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const h = vi.hoisted(() => ({
  adminWrite: vi.fn(),
  readAdminToken: vi.fn(),
  storeAdminToken: vi.fn(),
  clearAdminSession: vi.fn(),
}));

vi.mock('../../lib/supabase', () => ({ adminWrite: h.adminWrite }));
vi.mock('../../lib/adminSession', () => ({
  readAdminToken: h.readAdminToken,
  storeAdminToken: h.storeAdminToken,
  clearAdminSession: h.clearAdminSession,
  // 세션 만료를 화면에 알리는 이벤트 이름 — 가드가 구독한다.
  ADMIN_SESSION_EXPIRED_EVENT: 'veroro:admin-session-expired',
}));

import AdminAuthGuard from './AdminAuthGuard';

describe('AdminAuthGuard', () => {
  beforeEach(() => {
    h.adminWrite.mockReset();
    h.readAdminToken.mockReset().mockReturnValue(null);
    h.storeAdminToken.mockReset();
    h.clearAdminSession.mockReset();
  });

  afterEach(() => cleanup());

  it('세션 만료 이벤트를 받으면 로그인으로 되돌리고 이유를 밝힌다', async () => {
    // 이 처리가 없으면 화면마다 "설정을 불러오지 못했습니다" 같은 자기 도메인
    // 문구가 떠서, 정작 필요한 행동(재로그인)이 어디에도 드러나지 않는다.
    h.readAdminToken.mockReturnValue('v1.payload.signature');
    h.adminWrite.mockResolvedValue({ ok: true });
    render(<AdminAuthGuard><div>보호된 화면</div></AdminAuthGuard>);
    expect(await screen.findByText('보호된 화면')).toBeTruthy();

    act(() => {
      window.dispatchEvent(new CustomEvent('veroro:admin-session-expired'));
    });

    expect(await screen.findByText('로그인이 만료되었습니다. 다시 로그인해 주세요.')).toBeTruthy();
    expect(screen.queryByText('보호된 화면')).toBeNull();
  });

  it('저장된 세션이 없으면 관리자 로그인을 보여준다', async () => {
    render(<AdminAuthGuard><div>보호된 화면</div></AdminAuthGuard>);
    expect(await screen.findByText('Admin Console')).toBeTruthy();
    expect(screen.queryByText('보호된 화면')).toBeNull();
  });

  it('로그인 성공 후에만 보호된 화면을 연다', async () => {
    h.adminWrite.mockResolvedValue({ ok: true, sessionToken: 'v1.payload.signature' });
    render(<AdminAuthGuard><div>보호된 화면</div></AdminAuthGuard>);
    await screen.findByText('Admin Console');

    fireEvent.change(screen.getByLabelText('관리자 아이디'), { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText('관리자 비밀번호'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByText('인증하기'));

    expect(await screen.findByText('보호된 화면')).toBeTruthy();
    expect(h.adminWrite).toHaveBeenCalledWith('createAdminSession', {}, btoa('admin:secret'));
    expect(h.storeAdminToken).toHaveBeenCalledWith('v1.payload.signature');
  });

  it('저장된 토큰도 서버 재검증에 실패하면 폐기한다', async () => {
    h.readAdminToken.mockReturnValue('stale-token');
    h.adminWrite.mockRejectedValue(new Error('unauthorized'));
    render(<AdminAuthGuard><div>보호된 화면</div></AdminAuthGuard>);

    expect(await screen.findByText('Admin Console')).toBeTruthy();
    await waitFor(() => expect(h.clearAdminSession).toHaveBeenCalled());
    expect(screen.queryByText('보호된 화면')).toBeNull();
  });

  it('구버전 Edge Function과의 배포 순서도 호환한다', async () => {
    h.adminWrite
      .mockRejectedValueOnce(new Error('알 수 없는 action'))
      .mockResolvedValueOnce({ ok: true });
    render(<AdminAuthGuard><div>보호된 화면</div></AdminAuthGuard>);
    await screen.findByText('Admin Console');

    fireEvent.change(screen.getByLabelText('관리자 아이디'), { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText('관리자 비밀번호'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByText('인증하기'));

    expect(await screen.findByText('보호된 화면')).toBeTruthy();
    expect(h.adminWrite).toHaveBeenNthCalledWith(2, 'verifyAdmin', {}, btoa('admin:secret'));
  });
});
