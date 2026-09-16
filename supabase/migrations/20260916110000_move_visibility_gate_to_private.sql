-- 게이트 판정 함수를 PostgREST 노출 스키마 밖으로 옮긴다
--
-- 20260916100000 에서 public 에 만들었는데, 그러면
-- /rest/v1/rpc/hide_unverified_products_enabled 로 누구나 호출할 수 있다
-- (SECURITY DEFINER 라 더 민감하다. Supabase security advisor 도 지적한다).
--
-- 정책이 이 함수를 부르려면 anon 에게 EXECUTE 가 있어야 하므로 권한은 회수할
-- 수 없다. 대신 노출되지 않는 스키마로 옮기면 PostgREST 는 라우팅하지 않고
-- 정책은 그대로 호출할 수 있다.

CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO anon, authenticated;

CREATE OR REPLACE FUNCTION private.hide_unverified_products_enabled()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT (value)::jsonb = 'true'::jsonb
     FROM public.app_settings
     WHERE key = 'hide_unverified_products'),
    FALSE
  );
$$;

REVOKE ALL ON FUNCTION private.hide_unverified_products_enabled() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.hide_unverified_products_enabled() TO anon, authenticated;

DROP POLICY IF EXISTS "Public can view visible products" ON public.products;

CREATE POLICY "Public can view visible products"
  ON public.products FOR SELECT TO anon, authenticated
  USING (
    is_visible = true
    AND (
      NOT private.hide_unverified_products_enabled()
      OR verification_status = 'verified'
    )
  );

DROP FUNCTION IF EXISTS public.hide_unverified_products_enabled();
