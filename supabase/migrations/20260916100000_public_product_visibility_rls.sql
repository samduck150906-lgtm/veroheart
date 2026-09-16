-- 사용자에게 보이는 제품을 서버(RLS)에서 정한다
--
-- 지금까지 "비노출 제품 숨기기"와 "검수대기 제품 숨기기"는 클라이언트가 쿼리에
-- 조건을 붙여서 했다. anon 키는 공개된 값이라, 조건을 붙이지 않고 PostgREST 를
-- 직접 부르면 비노출·검수대기 제품이 그대로 나왔다. 화면에서만 숨긴 셈이다.
--
-- 이 마이그레이션은 그 판단을 정책으로 옮긴다. 조건을 붙이지 않아도 서버가
-- 걸러 낸다.
--
-- 선행 작업: 관리자 화면의 제품 조회를 service_role(admin-products-read Edge
-- Function)로 옮겼다. 그러지 않으면 정책을 조이는 순간 관리자가 비노출·검수대기
-- 제품을 볼 수 없게 되는데, 정작 그 제품들을 관리하는 것이 관리자 화면의 일이다.

-- 검수 게이트는 app_settings 의 런타임 설정이다. 정책에서 읽어야 하는데
-- app_settings 자체에 공개 SELECT 가 없으므로 SECURITY DEFINER 로 감싼다.
-- STABLE 이라 한 쿼리 안에서 반복 평가되지 않는다.
CREATE OR REPLACE FUNCTION public.hide_unverified_products_enabled()
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

REVOKE ALL ON FUNCTION public.hide_unverified_products_enabled() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hide_unverified_products_enabled() TO anon, authenticated;

-- 기존 정책은 USING (true) 였다 — 모든 제품이 누구에게나 보였다.
DROP POLICY IF EXISTS "Anyone can view products" ON public.products;

CREATE POLICY "Public can view visible products"
  ON public.products FOR SELECT TO anon, authenticated
  USING (
    -- 관리자가 내린 제품은 언제나 안 보인다.
    is_visible = true
    -- 검수 게이트가 켜져 있을 때만 검수 완료 제품으로 더 좁힌다.
    -- 지금은 꺼져 있다(459개 전부 '검수 대기'라 켜면 앱이 빈다).
    -- 일괄 '검수 완료' 처리로 채운 뒤 관리자 설정에서 켜면 그 즉시 서버가 적용한다.
    AND (
      NOT public.hide_unverified_products_enabled()
      OR verification_status = 'verified'
    )
  );

-- service_role 은 RLS 를 우회하므로 관리자 경로(Edge Function)는 영향받지 않는다.
