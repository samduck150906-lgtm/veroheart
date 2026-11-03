import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { signInWithOAuth, openAuthBrowser } = vi.hoisted(() => ({
  signInWithOAuth: vi.fn(),
  openAuthBrowser: vi.fn(),
}));

vi.mock('./supabase', () => ({
  isSupabaseConfigured: true,
  supabase: { auth: { signInWithOAuth } },
}));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }));
vi.mock('./nativeAuth', () => ({
  getAuthRedirectUrl: () => 'https://veroro-app.netlify.app/auth/callback',
  openAuthBrowser,
}));

import { signInWithKakao } from './kakaoAuth';

describe('Kakao OAuth configuration', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_KAKAO_LOGIN_ENABLED', 'true');
    signInWithOAuth.mockReset();
    openAuthBrowser.mockReset();
  });
  afterEach(() => vi.unstubAllEnvs());

  it('overrides default email scope and returns to the registered web callback', async () => {
    const url = 'https://nlutpmjloryqdomgbqrr.supabase.co/auth/v1/authorize?provider=kakao';
    signInWithOAuth.mockResolvedValue({ data: { url }, error: null });
    expect(await signInWithKakao()).toBeNull();
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: 'kakao',
      options: {
        redirectTo: 'https://veroro-app.netlify.app/auth/callback',
        skipBrowserRedirect: true,
        queryParams: { scope: 'profile_nickname profile_image' },
      },
    });
    expect(openAuthBrowser).toHaveBeenCalledWith(url);
  });

  it('does not navigate when the provider rejects the sign-in request', async () => {
    signInWithOAuth.mockResolvedValue({ data: { url: null }, error: { message: 'provider is not enabled' } });
    expect(await signInWithKakao()).toMatchObject({ reason: 'provider_disabled' });
    expect(openAuthBrowser).not.toHaveBeenCalled();
  });
});
