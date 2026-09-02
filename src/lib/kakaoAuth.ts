/**
 * 카카오 로그인/회원가입.
 *
 * Supabase 의 OAuth 제공자 기능을 그대로 쓴다. 카카오 REST 키와 시크릿은 Supabase
 * 대시보드(Authentication → Providers → Kakao)에만 넣으므로 프론트 번들에는 어떤
 * 카카오 키도 실리지 않는다. 카카오 JavaScript SDK 도 쓰지 않는다.
 *
 * 키 발급 전 단계에서는 `VITE_KAKAO_LOGIN_ENABLED` 를 켜지 않는다. 제공자가 꺼진
 * 상태로 버튼만 노출하면 사용자가 카카오 화면까지 갔다가 오류로 되돌아오기 때문에,
 * 준비되기 전에는 버튼을 '준비 중'으로 잠가 둔다.
 *
 * 운영 전환 절차:
 *  1. 카카오 개발자 콘솔에서 앱 생성 → REST API 키 / Client Secret 발급
 *  2. 카카오 Redirect URI 에 `https://<프로젝트>.supabase.co/auth/v1/callback` 등록
 *  3. Supabase 대시보드 Authentication → Providers → Kakao 활성화 후 키 입력
 *  4. 배포 환경변수에 `VITE_KAKAO_LOGIN_ENABLED=true` 추가 후 재배포
 */
import { supabase, isSupabaseConfigured } from './supabase';

/** OAuth 왕복이 끝난 뒤 Supabase 가 돌려보낼 앱 내 경로 (App.tsx 의 /auth/callback 라우트). */
export const KAKAO_REDIRECT_PATH = '/auth/callback';

/**
 * 카카오 로그인 버튼을 실제로 눌러도 되는 상태인지.
 * 키가 준비되어 Supabase 에서 제공자를 켠 뒤에만 true 로 바꾼다.
 */
export function isKakaoLoginEnabled(): boolean {
  return isSupabaseConfigured && import.meta.env.VITE_KAKAO_LOGIN_ENABLED === 'true';
}

export type KakaoSignInFailureReason =
  | 'not_configured'
  | 'provider_disabled'
  | 'signup_disabled'
  | 'unknown';

export interface KakaoSignInFailure {
  ok: false;
  reason: KakaoSignInFailureReason;
  /** 사용자에게 그대로 보여줄 수 있는 한국어 안내. */
  message: string;
}

/**
 * 실패 정보 또는 null(= 카카오 인증 페이지로 이동을 시작함).
 *
 * 이 프로젝트는 tsconfig 의 strict 가 꺼져 있어 `{ok:true} | {ok:false}` 형태의
 * 판별 유니온이 호출부에서 좁혀지지 않는다. null 로 성공을 표현해 호출부가
 * `if (failure)` 한 줄로 처리하게 한다.
 */
export type KakaoSignInResult = KakaoSignInFailure | null;

/** Supabase 가 돌려준 OAuth 오류 문구를 사용자에게 보여줄 한국어 안내로 옮긴다. */
export function describeKakaoAuthError(raw: string): KakaoSignInFailure {
  const lower = raw.toLowerCase();
  if (lower.includes('provider is not enabled') || lower.includes('unsupported provider')) {
    return {
      ok: false,
      reason: 'provider_disabled',
      message: '카카오 로그인이 아직 준비 중이에요. 이메일로 로그인해 주세요.',
    };
  }
  if (lower.includes('signup_disabled') || lower.includes('signup disabled')) {
    // auth.users 의 enforce_signup_enabled 트리거가 막은 경우.
    // 기존 회원의 카카오 로그인은 계정을 새로 만들지 않으므로 영향을 받지 않는다.
    return {
      ok: false,
      reason: 'signup_disabled',
      message: '현재 신규 회원 가입이 일시 중단되었습니다.',
    };
  }
  return {
    ok: false,
    reason: 'unknown',
    message: raw || '카카오 로그인에 실패했어요. 잠시 후 다시 시도해 주세요.',
  };
}

/**
 * 카카오 인증 페이지로 이동시킨다.
 *
 * 성공하면 브라우저가 카카오로 넘어가므로 이 함수는 사실상 반환되지 않는다.
 * 이동 자체가 시작되지 못했을 때만 실패 정보를 돌려주고, 시작했으면 null 이다.
 */
export async function signInWithKakao(redirectTo?: string): Promise<KakaoSignInResult> {
  if (!isKakaoLoginEnabled()) {
    return {
      ok: false,
      reason: 'not_configured',
      message: '카카오 로그인이 아직 준비 중이에요. 이메일로 로그인해 주세요.',
    };
  }

  const target = redirectTo ?? `${window.location.origin}${KAKAO_REDIRECT_PATH}`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'kakao',
    options: { redirectTo: target },
  });

  if (error) return describeKakaoAuthError(error.message);
  return null;
}
