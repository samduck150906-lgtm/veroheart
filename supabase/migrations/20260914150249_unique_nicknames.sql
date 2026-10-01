UPDATE public.users
SET nickname = BTRIM(nickname)
WHERE nickname IS NOT NULL AND nickname <> BTRIM(nickname);

CREATE UNIQUE INDEX IF NOT EXISTS users_nickname_unique
  ON public.users (LOWER(BTRIM(nickname)))
  WHERE nickname IS NOT NULL AND BTRIM(nickname) <> '';

COMMENT ON INDEX public.users_nickname_unique IS
  '닉네임은 대소문자·앞뒤공백을 무시하고 중복될 수 없다.';

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

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;;
