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
  FOR EACH ROW EXECUTE FUNCTION public.enforce_signup_enabled();;
