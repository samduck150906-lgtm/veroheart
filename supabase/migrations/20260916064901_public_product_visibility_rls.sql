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

DROP POLICY IF EXISTS "Anyone can view products" ON public.products;

CREATE POLICY "Public can view visible products"
  ON public.products FOR SELECT TO anon, authenticated
  USING (
    is_visible = true
    AND (
      NOT public.hide_unverified_products_enabled()
      OR verification_status = 'verified'
    )
  );;
