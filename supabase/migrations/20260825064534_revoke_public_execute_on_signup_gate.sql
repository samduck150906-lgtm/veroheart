-- enforce_signup_enabled 는 트리거 전용 함수다. PostgREST 로 노출될 이유가 없어
-- 공개 EXECUTE 권한을 회수한다.
-- (트리거 함수의 EXECUTE 권한은 CREATE TRIGGER 시점에만 검사되므로 트리거 동작에는
--  영향이 없다. 적용 직후 실제 INSERT 로 재확인한다.)
REVOKE EXECUTE ON FUNCTION public.enforce_signup_enabled() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enforce_signup_enabled() FROM anon;
REVOKE EXECUTE ON FUNCTION public.enforce_signup_enabled() FROM authenticated;;
