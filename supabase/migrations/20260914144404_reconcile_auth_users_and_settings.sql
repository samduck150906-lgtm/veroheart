-- 관리자 회원 목록에서 빠진 과거 Auth 계정의 public 프로필을 복구하고,
-- 런타임 설정 행이 모두 공개 조회 가능하도록 정합성을 맞춘다.
INSERT INTO public.users (id, nickname, avatar_url, created_at)
SELECT
  au.id,
  COALESCE(
    NULLIF(BTRIM(au.raw_user_meta_data->>'nickname'), ''),
    NULLIF(BTRIM(au.raw_user_meta_data->>'name'), ''),
    NULLIF(BTRIM(au.raw_user_meta_data->>'full_name'), ''),
    NULLIF(SPLIT_PART(COALESCE(au.email, ''), '@', 1), ''),
    'VeRoRo' || LEFT(REPLACE(au.id::text, '-', ''), 6)
  ),
  NULLIF(au.raw_user_meta_data->>'avatar_url', ''),
  au.created_at
FROM auth.users au
WHERE COALESCE(au.is_anonymous, FALSE) = FALSE
  AND COALESCE(au.raw_app_meta_data->>'provider', '') <> 'anonymous'
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(NEW.is_anonymous, FALSE) OR COALESCE(NEW.raw_app_meta_data->>'provider', '') = 'anonymous' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.users (id, nickname, avatar_url, created_at)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(BTRIM(NEW.raw_user_meta_data->>'nickname'), ''),
      NULLIF(BTRIM(NEW.raw_user_meta_data->>'name'), ''),
      NULLIF(BTRIM(NEW.raw_user_meta_data->>'full_name'), ''),
      NULLIF(SPLIT_PART(COALESCE(NEW.email, ''), '@', 1), ''),
      'VeRoRo' || LEFT(REPLACE(NEW.id::text, '-', ''), 6)
    ),
    NULLIF(NEW.raw_user_meta_data->>'avatar_url', ''),
    NEW.created_at
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

INSERT INTO public.app_settings (key, value, is_public, description) VALUES
  ('maintenance_mode', 'false'::jsonb, TRUE, '점검 모드. true 면 사용자 앱에 점검 안내를 노출한다.'),
  ('signup_enabled', 'true'::jsonb, TRUE, '신규 회원 가입 허용 여부.'),
  ('viral_event_visible', 'true'::jsonb, TRUE, '바이럴 이벤트 진입 노출 여부.'),
  ('service_notice', '{"enabled": false, "message": ""}'::jsonb, TRUE, '서비스 공지 배너.'),
  ('phase2_alias_observation_enabled', 'false'::jsonb, TRUE,
    'Phase 2 별칭 리졸버 관찰 모드. 점수·판정에는 영향이 없고 미매칭 큐 적재만 수행한다.')
ON CONFLICT (key) DO UPDATE
  SET is_public = TRUE;;
