-- 공개 프로필과 SECURITY DEFINER 객체를 최소권한으로 정리한다.
-- 리뷰 작성자의 닉네임은 유지하되, 리뷰를 쓰지 않은 전체 가입자 목록은 anon에
-- 노출하지 않는다. 관리자 회원 조회는 service_role 기반 admin-write를 계속 쓴다.

BEGIN;

DROP POLICY IF EXISTS "Anyone can view public profile" ON public.users;
DROP POLICY IF EXISTS "Review authors have public profiles" ON public.users;
CREATE POLICY "Review authors have public profiles" ON public.users
  FOR SELECT
  TO anon, authenticated
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1
      FROM public.reviews AS r
      WHERE r.user_id = users.id
    )
  );

-- anon은 리뷰 임베딩에 필요한 공개 표시 컬럼만 읽을 수 있다.
REVOKE SELECT ON TABLE public.users FROM anon;
GRANT SELECT (id, nickname, avatar_url) ON TABLE public.users TO anon;

-- 기존 사용자는 프로필 전체를 본인 RLS 범위에서 읽고 수정해야 한다.
GRANT SELECT, UPDATE ON TABLE public.users TO authenticated;

-- 뷰 소유자 권한으로 RLS를 우회하지 않도록 호출자 권한으로 평가한다.
ALTER VIEW IF EXISTS public.products_with_compatibility SET (security_invoker = true);
ALTER VIEW IF EXISTS public.community_posts_with_counts SET (security_invoker = true);

-- Auth 트리거는 외부 RPC가 아니라 트리거에서만 실행된다.
ALTER FUNCTION public.handle_new_user() SET search_path = '';
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- 기존 관리자 RPC도 검색 경로를 고정한다. 실행권한은 service_role에만 남긴다.
ALTER FUNCTION public.admin_replace_product_ingredients(UUID, JSONB) SET search_path = '';
REVOKE ALL ON FUNCTION public.admin_replace_product_ingredients(UUID, JSONB)
  FROM PUBLIC, anon, authenticated;

COMMIT;
