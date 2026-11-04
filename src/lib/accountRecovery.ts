import { supabase, isSupabaseConfigured } from './supabase';
import { getAuthRedirectUrl } from './nativeAuth';

export type AccountRecoveryMode = 'id' | 'password';
export const KAKAO_ACCOUNT_HELP =
  'https://cs.kakao.com/helps_html/1073209953';
export const KAKAO_PASSWORD_HELP =
  'https://cs.kakao.com/helps_html/1073209954';

export function validRecoveryEmail(value: string): boolean {
  return (
    value.trim().length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
  );
}

/** No public account lookup: an email owner must follow a one-time link. */
export async function requestAccountRecovery(
  mode: AccountRecoveryMode,
  value: string,
): Promise<void> {
  const email = value.trim();
  if (!validRecoveryEmail(email))
    throw new Error('올바른 이메일 주소를 입력해 주세요.');
  if (!isSupabaseConfigured)
    throw new Error(
      '계정 찾기에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.',
    );
  const { error } =
    mode === 'password'
      ? await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: getAuthRedirectUrl('recovery'),
        })
      : await supabase.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: false,
            emailRedirectTo: getAuthRedirectUrl('account'),
          },
        });
  if (!error) return;
  // An unknown recipient receives the same acknowledgement as a known recipient.
  if (['user_not_found', 'signup_disabled'].includes(error.code ?? '')) return;
  if (
    error.status === 429 ||
    ['over_email_send_rate_limit', 'over_request_rate_limit'].includes(
      error.code ?? '',
    )
  ) {
    throw new Error('요청이 많습니다. 잠시 기다린 뒤 다시 시도해 주세요.');
  }
  throw new Error(
    '안내를 보내지 못했습니다. 잠시 후 다시 시도하거나 고객센터로 문의해 주세요.',
  );
}
