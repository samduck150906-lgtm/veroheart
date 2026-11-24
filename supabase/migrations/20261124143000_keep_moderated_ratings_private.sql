-- Preserve moderation controls when restoring the account privacy migration.
DROP POLICY IF EXISTS "Users insert own reviews" ON public.reviews;
CREATE POLICY "Users insert own reviews" ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND content = '' AND is_hidden = false);

-- Public ratings must satisfy both moderation and catalog publication rules.
CREATE OR REPLACE VIEW public.product_ratings WITH (security_barrier = true) AS
  SELECT r.id, r.product_id, r.rating, r.created_at, (r.user_id = auth.uid()) AS is_mine
  FROM public.reviews r
  JOIN public.products p ON p.id = r.product_id
  WHERE NOT r.is_hidden
    AND p.is_visible = TRUE
    AND p.verification_status IN ('reviewed', 'verified')
    AND (
      NOT private.hide_unverified_products_enabled()
      OR p.verification_status = 'verified'
    );
