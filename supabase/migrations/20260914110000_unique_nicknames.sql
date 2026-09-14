-- 가입 시 사용자가 고른 닉네임을 그대로 보존하고, 중복을 막는다.
--
-- 지금까지 닉네임은 아무 제약이 없어 같은 이름이 여러 개 생길 수 있었고,
-- 관리자 회원 관리에서 누가 누구인지 구분되지 않았다.
--
-- 하드 제약(유니크 인덱스)과 가입 경로의 안내를 함께 둔다:
--   - 이메일 가입: 폼에서 is_nickname_available() 로 미리 확인한다.
--   - 소셜 가입(카카오 등): 미리 물어볼 수 없으므로 트리거가 충돌 시 짧은 접미사를
--     붙여 가입 자체가 실패하지 않게 한다. 사용자는 나중에 바꿀 수 있다.

BEGIN;

-- 공백만 다른 값이 서로 다른 닉네임으로 남지 않도록 먼저 정리한다.
UPDATE public.users
SET nickname = BTRIM(nickname)
WHERE nickname IS NOT NULL AND nickname <> BTRIM(nickname);

CREATE UNIQUE INDEX IF NOT EXISTS users_nickname_unique
  ON public.users (LOWER(BTRIM(nickname)))
  WHERE nickname IS NOT NULL AND BTRIM(nickname) <> '';

COMMENT ON INDEX public.users_nickname_unique IS
  '닉네임은 대소문자·앞뒤공백을 무시하고 중복될 수 없다.';

/**
 * 가입 폼이 anon 으로 호출하는 닉네임 사용 가능 여부 확인.
 *
 * users 테이블을 직접 읽게 하면 전체 회원 목록이 노출되므로, 불리언 하나만
 * 돌려주는 SECURITY DEFINER 함수로 감싼다.
 */
CREATE OR REPLACE FUNCTION public.is_nickname_available(p_nickname TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_name TEXT := LOWER(BTRIM(COALESCE(p_nickname, '')));
BEGIN
  IF v_name = '' OR LENGTH(v_name) < 2 OR LENGTH(v_name) > 20 THEN
    RETURN FALSE;
  END IF;
  RETURN NOT EXISTS (
    SELECT 1 FROM public.users AS u
    WHERE LOWER(BTRIM(u.nickname)) = v_name
      AND u.id IS DISTINCT FROM auth.uid()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.is_nickname_available(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_nickname_available(TEXT) TO anon, authenticated;

/**
 * 신규 회원 프로필 생성.
 *
 * 사용자가 가입할 때 고른 닉네임(raw_user_meta_data.nickname)을 최우선으로 쓰고,
 * 이미 쓰이는 이름이면 가입을 실패시키는 대신 짧은 접미사를 붙인다. 소셜 로그인은
 * 가입 전에 닉네임을 물어볼 수 없어서, 여기서 막으면 로그인 자체가 끊긴다.
 */
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_desired TEXT;
  v_candidate TEXT;
  v_suffix INTEGER := 0;
BEGIN
  IF COALESCE(NEW.is_anonymous, FALSE)
     OR COALESCE(NEW.raw_app_meta_data->>'provider', '') = 'anonymous' THEN
    RETURN NEW;
  END IF;

  v_desired := COALESCE(
    NULLIF(BTRIM(NEW.raw_user_meta_data->>'nickname'), ''),
    NULLIF(BTRIM(NEW.raw_user_meta_data->>'name'), ''),
    NULLIF(BTRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(SPLIT_PART(COALESCE(NEW.email, ''), '@', 1), ''),
    'VeRoRo' || LEFT(REPLACE(NEW.id::text, '-', ''), 6)
  );
  v_desired := LEFT(v_desired, 20);
  v_candidate := v_desired;

  WHILE EXISTS (
    SELECT 1 FROM public.users AS u WHERE LOWER(BTRIM(u.nickname)) = LOWER(v_candidate)
  ) AND v_suffix < 50 LOOP
    v_suffix := v_suffix + 1;
    v_candidate := LEFT(v_desired, 16) || v_suffix::text;
  END LOOP;

  INSERT INTO public.users (id, nickname, avatar_url, created_at)
  VALUES (
    NEW.id,
    v_candidate,
    NULLIF(NEW.raw_user_meta_data->>'avatar_url', ''),
    NEW.created_at
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

COMMIT;
