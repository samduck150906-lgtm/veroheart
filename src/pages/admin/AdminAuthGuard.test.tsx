import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

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
