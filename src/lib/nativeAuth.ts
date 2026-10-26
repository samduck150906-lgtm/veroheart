import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { supabase } from './supabase';
import { getPublicOrigin, publicUrl } from './publicUrls';

export type AuthIntent = 'signin' | 'recovery';
const NATIVE_CALLBACK = 'com.veroro.app://auth/callback';

export function getAuthRedirectUrl(intent: AuthIntent = 'signin'): string {
  const url = new URL(publicUrl('/auth/callback'));
  if (intent === 'recovery') url.searchParams.set('intent', intent);
  if (Capacitor.isNativePlatform()) url.searchParams.set('native', '1');
  return url.href;
}

interface AuthCallbackData {
  code: string | null;
  error: string | null;
  intent: AuthIntent;
  native: boolean;
}

/** Only PKCE codes from the registered endpoint are accepted, never bearer tokens. */
export function readAuthCallback(raw: string): AuthCallbackData | null {
  try {
    const url = new URL(raw);
    const isNative = url.protocol === 'com.veroro.app:' && url.host === 'auth' && url.pathname === '/callback';
    const isPublic = url.origin === getPublicOrigin() && url.pathname === '/auth/callback';
    if ((!isNative && !isPublic) || url.username || url.password) return null;
    const params = url.searchParams;
    const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
    if (params.has('access_token') || hash.has('access_token') || params.has('refresh_token') || hash.has('refresh_token')) return null;
    if (params.getAll('code').length > 1 || params.getAll('intent').length > 1) return null;
    const code = params.get('code');
    const error = params.get('error_description') || params.get('error') || hash.get('error_description') || hash.get('error');
    if ((!code && !error) || (code && (code.length > 2048 || /\s/.test(code)))) return null;
    return { code, error, intent: params.get('intent') === 'recovery' ? 'recovery' : 'signin', native: params.get('native') === '1' };
  } catch { return null; }
}

/** Forward the one-time code, never an arbitrary next URL or token fragment. */
export function toNativeCallbackUrl(raw: string): string | null {
  const callback = readAuthCallback(raw);
  if (!callback) return null;
  const url = new URL(NATIVE_CALLBACK);
  if (callback.code) url.searchParams.set('code', callback.code);
  if (callback.error) url.searchParams.set('error_description', callback.error);
  if (callback.intent === 'recovery') url.searchParams.set('intent', 'recovery');
  return url.href;
}

let lastExchange: { code: string; created: number; promise: Promise<{ intent: AuthIntent }> } | null = null;

export async function completeAuthCallback(raw: string): Promise<{ intent: AuthIntent }> {
  const callback = readAuthCallback(raw);
  if (!callback) throw new Error('올바른 인증 링크가 아닙니다. 이메일 또는 로그인을 다시 요청해 주세요.');
  if (callback.error) throw new Error('인증이 취소되었거나 실패했습니다. 다시 시도해 주세요.');
  if (!callback.code) throw new Error('인증 코드가 없습니다. 다시 로그인해 주세요.');
  if (lastExchange?.code === callback.code && Date.now() - lastExchange.created < 30_000) return lastExchange.promise;
  const promise = (async () => {
    const { data, error } = await supabase.auth.exchangeCodeForSession(callback.code!);
    if (error || !data.session) throw new Error('인증 링크가 만료되었거나 요청한 기기와 다릅니다. 이 기기에서 다시 요청해 주세요.');
    return { intent: ('redirectType' in data && data.redirectType === 'recovery') || callback.intent === 'recovery' ? 'recovery' as const : 'signin' as const };
  })();
  lastExchange = { code: callback.code, created: Date.now(), promise };
  return promise;
}

export async function openAuthBrowser(raw: string): Promise<void> {
  const url = new URL(raw);
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('안전한 인증 주소가 아닙니다.');
  if (Capacitor.isNativePlatform()) await Browser.open({ url: url.href });
  else window.location.assign(url.href);
}
