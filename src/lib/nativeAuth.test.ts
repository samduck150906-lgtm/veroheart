import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Capacitor } from '@capacitor/core';
import { completeAuthCallback, getAuthRedirectUrl, readAuthCallback, toNativeCallbackUrl } from './nativeAuth';

const { exchangeCodeForSession } = vi.hoisted(() => ({ exchangeCodeForSession: vi.fn() }));
vi.mock('./supabase', () => ({ supabase: { auth: { exchangeCodeForSession } } }));

beforeEach(() => {
  vi.stubEnv('VITE_PUBLIC_APP_URL', 'https://app.example.com');
  vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
  exchangeCodeForSession.mockReset();
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe('native auth callback trust boundary', () => {
  it('requests public HTTPS redirects, preserving recovery and native return intent', () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    expect(getAuthRedirectUrl('recovery')).toBe('https://app.example.com/auth/callback?intent=recovery&native=1');
  });
  it('accepts only the exact registered native callback', () => {
    expect(readAuthCallback('com.veroro.app://auth/callback?code=abc')).toMatchObject({ code: 'abc', intent: 'signin' });
    for (const url of ['evil://auth/callback?code=abc', 'com.veroro.app://evil/callback?code=abc', 'com.veroro.app://auth/other?code=abc', 'https://evil.example/auth/callback?code=abc', 'https://app.example.com/other?code=abc', 'com.veroro.app://user@auth/callback?code=abc']) {
      expect(readAuthCallback(url)).toBeNull();
    }
  });
  it('rejects implicit tokens and ambiguous credentials', () => {
    expect(readAuthCallback('https://app.example.com/auth/callback#access_token=token&refresh_token=token')).toBeNull();
    expect(readAuthCallback('https://app.example.com/auth/callback?code=a&code=b')).toBeNull();
    expect(readAuthCallback('https://app.example.com/auth/callback?code=a&next=https://evil.example')).toMatchObject({ code: 'a', intent: 'signin' });
  });
  it('forwards only recognized callback parameters to the native app', () => {
    expect(toNativeCallbackUrl('https://app.example.com/auth/callback?code=abc&intent=recovery&native=1&next=https://evil.example'))
      .toBe('com.veroro.app://auth/callback?code=abc&intent=recovery');
  });
  it('exchanges the PKCE code before reporting authenticated recovery', async () => {
    exchangeCodeForSession.mockResolvedValue({ data: { session: { user: { id: 'owner' } }, redirectType: 'recovery' }, error: null });
    await expect(completeAuthCallback('com.veroro.app://auth/callback?code=recovery-code&intent=recovery')).resolves.toEqual({ intent: 'recovery' });
    expect(exchangeCodeForSession).toHaveBeenCalledWith('recovery-code');
  });
  it('shares a single exchange across duplicate native events / StrictMode effects', async () => {
    exchangeCodeForSession.mockResolvedValue({ data: { session: { user: { id: 'owner' } } }, error: null });
    await Promise.all([completeAuthCallback('com.veroro.app://auth/callback?code=dedup'), completeAuthCallback('com.veroro.app://auth/callback?code=dedup')]);
    expect(exchangeCodeForSession).toHaveBeenCalledTimes(1);
  });
  it('does not authenticate an empty callback using an unrelated existing session', async () => {
    await expect(completeAuthCallback('https://app.example.com/auth/callback')).rejects.toThrow();
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });
  it('surfaces exchange failure without treating it as success', async () => {
    exchangeCodeForSession.mockResolvedValue({ data: { session: null }, error: { message: 'Code expired' } });
    await expect(completeAuthCallback('com.veroro.app://auth/callback?code=expired')).rejects.toThrow();
  });
});
