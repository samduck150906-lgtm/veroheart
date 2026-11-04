import { beforeEach, describe, expect, it, vi } from 'vitest';
const h = vi.hoisted(() => ({ reset: vi.fn(), otp: vi.fn(), configured: true }));
vi.mock('./supabase', () => ({ get isSupabaseConfigured() { return h.configured; }, supabase: { auth: { resetPasswordForEmail: h.reset, signInWithOtp: h.otp } } }));
vi.mock('./nativeAuth', () => ({ getAuthRedirectUrl: (intent: string) => 'https://app.example.com/auth/callback?intent=' + intent }));
import { requestAccountRecovery, validRecoveryEmail } from './accountRecovery';
beforeEach(() => { vi.clearAllMocks(); h.configured = true; h.reset.mockResolvedValue({ error: null }); h.otp.mockResolvedValue({ error: null }); });
describe('private account recovery', () => {
  it('verifies email ownership without creating a new account', async () => {
    await requestAccountRecovery('id', ' owner@example.com ');
    expect(h.otp).toHaveBeenCalledExactlyOnceWith({ email: 'owner@example.com', options: { shouldCreateUser: false, emailRedirectTo: 'https://app.example.com/auth/callback?intent=account' } });
    expect(h.reset).not.toHaveBeenCalled();
  });
  it('uses a recovery callback for password resets', async () => {
    await requestAccountRecovery('password', 'owner@example.com');
    expect(h.reset).toHaveBeenCalledExactlyOnceWith('owner@example.com', { redirectTo: 'https://app.example.com/auth/callback?intent=recovery' });
    expect(h.otp).not.toHaveBeenCalled();
  });
  it.each(['user_not_found', 'signup_disabled'])('does not disclose recipient existence (%s)', async code => {
    h.otp.mockResolvedValue({ error: { code } });
    await expect(requestAccountRecovery('id', 'unknown@example.com')).resolves.toBeUndefined();
  });
  it('surfaces rate limits and delivery errors without raw details', async () => {
    h.reset.mockResolvedValueOnce({ error: { status: 429 } }).mockResolvedValueOnce({ error: { code: 'email_address_not_authorized', message: 'internal secret' } });
    await expect(requestAccountRecovery('password', 'owner@example.com')).rejects.toThrow('요청이 많습니다');
    await expect(requestAccountRecovery('password', 'owner@example.com')).rejects.toThrow('안내를 보내지 못했습니다');
  });
  it('rejects malformed emails and unconfigured clients before a request', async () => {
    for (const value of ['', 'name', 'a@', 'a b@example.com']) expect(validRecoveryEmail(value)).toBe(false);
    await expect(requestAccountRecovery('id', 'invalid')).rejects.toThrow('올바른 이메일');
    h.configured = false;
    await expect(requestAccountRecovery('id', 'owner@example.com')).rejects.toThrow('연결하지 못했습니다');
    expect(h.otp).not.toHaveBeenCalled();
  });
});
