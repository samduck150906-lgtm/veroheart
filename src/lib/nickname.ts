/**
 * 닉네임 규칙과 중복 확인.
 *
 * 중복 방지는 DB 의 부분 유니크 인덱스(`users_nickname_unique`, 대소문자·공백 무시)가
 * 최종 보증이고, 여기의 확인은 "가입 버튼을 누르기 전에 알려 주기" 위한 것이다.
 * users 테이블을 직접 조회하면 전체 회원 목록이 노출되므로 불리언만 돌려주는
 * `is_nickname_available` RPC(SECURITY DEFINER)를 호출한다.
 */
import { supabase, isSupabaseConfigured } from './supabase';

export const NICKNAME_MIN_LENGTH = 2;
export const NICKNAME_MAX_LENGTH = 20;

/** 형식 검사. 통과하지 못하면 사용자에게 그대로 보여줄 안내를 돌려준다. */
export function validateNickname(value: string): string | null {
  const nickname = value.trim();
  if (!nickname) return '닉네임을 입력해 주세요.';
  if (nickname.length < NICKNAME_MIN_LENGTH) {
    return `닉네임은 ${NICKNAME_MIN_LENGTH}자 이상이어야 해요.`;
  }
  if (nickname.length > NICKNAME_MAX_LENGTH) {
    return `닉네임은 ${NICKNAME_MAX_LENGTH}자까지 쓸 수 있어요.`;
  }
  // 공백과 제어문자만 막는다. 한글·영문·숫자·이모지는 그대로 허용한다.
  if (/\s/.test(nickname)) return '닉네임에는 공백을 넣을 수 없어요.';
  return null;
}

export type NicknameAvailability = 'idle' | 'checking' | 'available' | 'taken' | 'unknown';

/**
 * 중복 여부 확인.
 *
 * 네트워크 실패나 RPC 미배포 환경에서는 'unknown' 을 돌려주고 가입을 막지 않는다.
 * 실제 중복은 DB 인덱스가 잡고, 소셜 가입 경로는 트리거가 접미사를 붙여 처리한다.
 */
export async function checkNicknameAvailable(value: string): Promise<NicknameAvailability> {
  const nickname = value.trim();
  if (validateNickname(nickname)) return 'idle';
  if (!isSupabaseConfigured) return 'unknown';

  try {
    const { data, error } = await supabase.rpc('is_nickname_available', { p_nickname: nickname });
    if (error) return 'unknown';
    return data === true ? 'available' : 'taken';
  } catch {
    return 'unknown';
  }
}
