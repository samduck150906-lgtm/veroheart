import { describe, expect, it } from 'vitest';
import { describeKakaoAuthError, isKakaoLoginEnabled, KAKAO_REDIRECT_PATH } from './kakaoAuth';

describe('kakaoAuth', () => {
  it('키가 없는 기본 환경에서는 버튼을 열지 않는다', () => {
    // VITE_KAKAO_LOGIN_ENABLED 를 켜기 전까지는 카카오 화면으로 보내지 않는다.
    expect(isKakaoLoginEnabled()).toBe(false);
  });

  it('앱 안의 콜백 라우트로 돌아온다', () => {
    // App.tsx 의 /auth/callback 라우트와 어긋나면 로그인 후 404 로 떨어진다.
    expect(KAKAO_REDIRECT_PATH).toBe('/auth/callback');
  });

  it('제공자가 꺼져 있으면 준비 중이라고 안내한다', () => {
    for (const raw of ['Unsupported provider: provider is not enabled', 'Unsupported provider']) {
      const failure = describeKakaoAuthError(raw);
      expect(failure.reason).toBe('provider_disabled');
      expect(failure.message).toContain('준비 중');
    }
  });

  it('가입 잠금은 이메일 가입과 같은 문구로 안내한다', () => {
    // auth.users 의 enforce_signup_enabled 트리거가 올린 오류.
    const failure = describeKakaoAuthError('Database error saving new user: signup_disabled');
    expect(failure.reason).toBe('signup_disabled');
    expect(failure.message).toBe('현재 신규 회원 가입이 일시 중단되었습니다.');
  });

  it('모르는 오류는 원문을 남기되 빈 문자열은 기본 안내로 대체한다', () => {
    expect(describeKakaoAuthError('network unreachable')).toMatchObject({
      reason: 'unknown',
      message: 'network unreachable',
    });
    expect(describeKakaoAuthError('').message).toContain('카카오 로그인에 실패');
  });
});
