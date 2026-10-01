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

REVOKE SELECT ON TABLE public.users FROM anon;
GRANT SELECT (id, nickname, avatar_url) ON TABLE public.users TO anon;

GRANT SELECT, UPDATE ON TABLE public.users TO authenticated;

ALTER VIEW IF EXISTS public.products_with_compatibility SET (security_invoker = true);
ALTER VIEW IF EXISTS public.community_posts_with_counts SET (security_invoker = true);

ALTER FUNCTION public.handle_new_user() SET search_path = '';
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

ALTER FUNCTION public.admin_replace_product_ingredients(UUID, JSONB) SET search_path = '';
REVOKE ALL ON FUNCTION public.admin_replace_product_ingredients(UUID, JSONB)
  FROM PUBLIC, anon, authenticated;;
