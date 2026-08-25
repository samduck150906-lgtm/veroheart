-- 20260825120000_enforce_signup_enabled.sql
--
-- 목적: app_settings.signup_enabled = false 일 때 신규 계정 생성 자체를 막는다.
--
-- 배경(2차 QA 에서 확인):
--   가입 차단 스위치가 프론트(src/pages/Login.tsx)에만 걸려 있었다. 앱 UI 는 가입
--   버튼을 잠그지만, anon 키로 supabase.auth.signUp() 을 직접 호출하면 그대로 계정이
--   만들어졌다. anon 키는 프론트 번들에 들어 있으므로 누구나 이 경로를 쓸 수 있다.
--   운영자가 "가입을 닫았다"고 믿는 동안 실제로는 열려 있는 상태였다.
--
-- 방식: auth.users 에 BEFORE INSERT 트리거를 건다.
--   이 프로젝트는 이미 auth.users 에 AFTER INSERT 트리거(on_auth_user_created →
--   handle_new_user)를 쓰고 있어 같은 구조를 따른다. GoTrue 가 어떤 경로로 계정을
--   만들든(이메일 가입 / OAuth 최초 로그인 / admin API) INSERT 는 반드시 여기를
--   지나므로, 클라이언트를 신뢰하지 않고 한 곳에서 막을 수 있다.
--
-- 로그인에는 영향이 없다: 로그인은 auth.users 를 INSERT 하지 않는다(세션만 발급).
--   따라서 가입을 닫아도 기존 사용자는 그대로 로그인한다.
--
-- 실패 방향(fail-open): signup_enabled 행이 없으면 "허용"으로 본다.
--   앱의 DEFAULT_PUBLIC_SETTINGS.signupEnabled 가 true 인 것과 같은 규칙이다.
--   설정 행이 유실됐다고 가입이 통째로 막혀 서비스가 멈추는 편보다 낫다.
--   (막으려면 명시적으로 false 를 넣어야 한다 — 스위치는 켜는 쪽이 아니라 끄는 쪽이다.)
--
-- 되돌리기:
--   DROP TRIGGER IF EXISTS on_auth_user_signup_gate ON auth.users;
--   DROP FUNCTION IF EXISTS public.enforce_signup_enabled();

CREATE OR REPLACE FUNCTION public.enforce_signup_enabled()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enabled JSONB;
BEGIN
  SELECT value INTO v_enabled
  FROM public.app_settings
  WHERE key = 'signup_enabled';

  -- 설정이 없으면 허용(fail-open). 명시적으로 false 일 때만 막는다.
  -- 관리자 콘솔은 JSONB boolean 으로 저장하지만, 과거 값이 문자열 'false' 로
  -- 남아 있을 수 있어 두 형태를 모두 차단 대상으로 본다.
  IF v_enabled IS NULL THEN
    RETURN NEW;
  END IF;

  IF v_enabled = 'false'::jsonb OR v_enabled = '"false"'::jsonb THEN
    RAISE EXCEPTION 'signup_disabled'
      USING
        HINT = '신규 회원 가입이 일시 중단되었습니다.',
        ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enforce_signup_enabled() IS
  'app_settings.signup_enabled 가 false 면 auth.users INSERT 를 거부한다. 로그인은 영향 없음.';

DROP TRIGGER IF EXISTS on_auth_user_signup_gate ON auth.users;
CREATE TRIGGER on_auth_user_signup_gate
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.enforce_signup_enabled();

-- ── 공개 EXECUTE 권한 회수 ──────────────────────────────────────────────────
-- 이 함수는 트리거 전용이라 PostgREST(/rest/v1/rpc/...)로 노출될 이유가 없다.
-- (직접 호출하면 "trigger functions can only be called as triggers" 로 실패하므로
--  악용 경로는 아니지만, SECURITY DEFINER 함수를 공개해 둘 이유도 없다.)
-- 트리거 함수의 EXECUTE 권한은 CREATE TRIGGER 시점에만 검사되므로 동작에는 영향이 없다
-- — 운영 적용 후 실제 INSERT 로 허용/차단 양쪽을 재확인했다.
REVOKE EXECUTE ON FUNCTION public.enforce_signup_enabled() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enforce_signup_enabled() FROM anon;
REVOKE EXECUTE ON FUNCTION public.enforce_signup_enabled() FROM authenticated;
