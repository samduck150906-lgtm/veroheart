import { describe, it, expect, vi } from 'vitest';

vi.mock('./supabase', () => ({
  isSupabaseConfigured: false,
  supabase: { from: () => ({ select: () => Promise.resolve({ data: null, error: null }) }) },
}));

import {
  DEFAULT_PUBLIC_SETTINGS,
  __resetPublicSettingsCache,
  loadPublicSettings,
  mapSettingsRows,
} from './publicSettings';

describe('publicSettings', () => {
  it('DB 값을 앱 설정으로 매핑한다', () => {
    const settings = mapSettingsRows([
      { key: 'maintenance_mode', value: true },
      { key: 'signup_enabled', value: false },
      { key: 'viral_event_visible', value: false },
      { key: 'service_notice', value: { enabled: true, message: '점검 예정' } },
      { key: 'phase2_alias_observation_enabled', value: false },
    ]);

    expect(settings.maintenanceMode).toBe(true);
    expect(settings.signupEnabled).toBe(false);
    expect(settings.viralEventVisible).toBe(false);
    expect(settings.serviceNotice).toEqual({ enabled: true, message: '점검 예정' });
    expect(settings.phase2AliasObservationEnabled).toBe(false);
  });

  it('행이 없으면 서비스가 열려 있는 기본값을 쓴다', () => {
    const settings = mapSettingsRows([]);
    expect(settings).toEqual(DEFAULT_PUBLIC_SETTINGS);
    expect(settings.signupEnabled).toBe(true);
    expect(settings.maintenanceMode).toBe(false);
  });

  it('Phase 2 관찰 기본값은 꺼짐이다', () => {
    expect(DEFAULT_PUBLIC_SETTINGS.phase2AliasObservationEnabled).toBe(false);
  });

  it('잘못된 형태의 공지 값도 안전하게 처리한다', () => {
    expect(mapSettingsRows([{ key: 'service_notice', value: 'oops' }]).serviceNotice).toEqual({
      enabled: false,
      message: '',
    });
  });

  it('Supabase 미설정 환경에서는 기본값을 돌려주고 예외를 던지지 않는다', async () => {
    __resetPublicSettingsCache();
    await expect(loadPublicSettings()).resolves.toEqual(DEFAULT_PUBLIC_SETTINGS);
  });
});
