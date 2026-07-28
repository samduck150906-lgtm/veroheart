import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import type { AdminSettingRow } from '../../lib/adminApi';

const h = vi.hoisted(() => ({ fetchSettings: vi.fn(), saveSettings: vi.fn() }));

vi.mock('../../lib/adminApi', () => ({
  fetchSettings: h.fetchSettings,
  saveSettings: h.saveSettings,
}));

vi.mock('../../store/useNotification', () => ({
  notify: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

import AdminSettings from './AdminSettings';

const ROWS: AdminSettingRow[] = [
  { key: 'maintenance_mode', value: false, description: null, updatedAt: null, updatedBy: null },
  { key: 'signup_enabled', value: true, description: null, updatedAt: null, updatedBy: null },
  { key: 'viral_event_visible', value: true, description: null, updatedAt: null, updatedBy: null },
  {
    key: 'phase2_alias_observation_enabled',
    value: false,
    description: null,
    updatedAt: null,
    updatedBy: null,
  },
  {
    key: 'service_notice',
    value: { enabled: false, message: '' },
    description: null,
    updatedAt: null,
    updatedBy: null,
  },
];

describe('AdminSettings', () => {
  beforeEach(() => {
    h.fetchSettings.mockReset().mockResolvedValue(ROWS);
    h.saveSettings.mockReset().mockResolvedValue(1);
  });

  afterEach(() => cleanup());

  it('서버에 저장된 현재 설정을 불러온다', async () => {
    render(<AdminSettings />);
    await waitFor(() => expect(h.fetchSettings).toHaveBeenCalled());
    expect(screen.getByText('점검 모드')).toBeTruthy();
    // signup_enabled=true → 활성화됨 토글이 존재
    expect(screen.getAllByText('활성화됨').length).toBeGreaterThan(0);
  });

  it('변경 전에는 저장 버튼이 잠겨 있다', async () => {
    render(<AdminSettings />);
    const button = await screen.findByText('변경사항 없음');
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(h.saveSettings).not.toHaveBeenCalled();
  });

  it('변경한 값만 서버에 저장한다', async () => {
    render(<AdminSettings />);
    await screen.findByText('점검 모드');

    // 점검 모드 토글 (false → true)
    const toggles = screen.getAllByRole('button', { pressed: false });
    fireEvent.click(toggles[0]);

    fireEvent.click(await screen.findByText('변경사항 저장'));
    await waitFor(() => expect(h.saveSettings).toHaveBeenCalledTimes(1));
    expect(h.saveSettings).toHaveBeenCalledWith({ maintenance_mode: true });
  });

  it('Phase 2 관찰 모드는 기본 비활성으로 표시된다', async () => {
    render(<AdminSettings />);
    const card = (await screen.findByText('Phase 2 별칭 관찰 모드')).closest('article');
    expect(card?.textContent).toContain('비활성화됨');
    expect(card?.textContent).toContain('점수·위험도 판정에는 영향이 없습니다');
  });

  it('배포 환경에서만 바꿀 수 있는 값은 토글이 아니라 읽기 전용으로 안내한다', async () => {
    render(<AdminSettings />);
    expect(await screen.findByText('배포 환경에서만 변경 가능')).toBeTruthy();
    expect(screen.getByText('VITE_SUPABASE_ANON_KEY')).toBeTruthy();
  });

  it('설정 조회 실패 시 마이그레이션 안내와 재시도를 보여준다', async () => {
    h.fetchSettings.mockRejectedValue(new Error('relation "app_settings" does not exist'));
    render(<AdminSettings />);

    expect(await screen.findByText('설정을 불러오지 못했습니다.')).toBeTruthy();
    expect(screen.getByText(/20260728140000_admin_console_operations\.sql/)).toBeTruthy();
  });
});
