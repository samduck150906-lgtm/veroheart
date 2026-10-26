import { afterEach, describe, expect, it, vi } from 'vitest';
import { Capacitor } from '@capacitor/core';
import { isKakaoLoginEnabled, signInWithKakao } from './kakaoAuth';
vi.mock('./supabase', () => ({ isSupabaseConfigured: true, supabase: { auth: {} } }));
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });
describe('native social login release policy', () => {
  it('keeps native Kakao disabled even when the web provider is enabled', async () => {
    vi.stubEnv('VITE_KAKAO_LOGIN_ENABLED', 'true');
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    expect(isKakaoLoginEnabled()).toBe(false);
    await expect(signInWithKakao()).resolves.toMatchObject({ ok: false, reason: 'not_configured' });
  });
  it('allows the configured web provider', () => {
    vi.stubEnv('VITE_KAKAO_LOGIN_ENABLED', 'true');
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
    expect(isKakaoLoginEnabled()).toBe(true);
  });
});
