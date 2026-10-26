-- Visibility records an administrator's intent; review status authorizes public
-- publication. Preserve both stored fields and require both at read time.
BEGIN;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view visible products" ON public.products;
CREATE POLICY "Public can view visible products"
  ON public.products FOR SELECT TO anon, authenticated
  USING (
    is_visible = TRUE
    AND verification_status IN ('reviewed', 'verified')
    AND (
      NOT private.hide_unverified_products_enabled()
      OR verification_status = 'verified'
    )
  );

-- Permissive policies are ORed together. Keep the full gate restrictive too, so
-- another legacy/new permissive policy cannot publish pending or hidden rows,
-- or bypass the optional verified-only setting. service_role still bypasses RLS.
DROP POLICY IF EXISTS products_publication_required ON public.products;
CREATE POLICY products_publication_required
  ON public.products AS RESTRICTIVE FOR SELECT TO anon, authenticated
  USING (
    is_visible = TRUE
    AND verification_status IN ('reviewed', 'verified')
    AND (
      NOT private.hide_unverified_products_enabled()
      OR verification_status = 'verified'
    )
  );

-- Existing permissive evidence policies must not disclose unpublished products
-- through direct REST reads. These subqueries use the caller's product RLS.
DROP POLICY IF EXISTS product_aliases_publication_required ON public.product_aliases;
CREATE POLICY product_aliases_publication_required
  ON public.product_aliases AS RESTRICTIVE FOR SELECT TO anon, authenticated
  USING (
    is_searchable = TRUE
    AND EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_aliases.product_id)
  );

DROP POLICY IF EXISTS product_ingredients_publication_required ON public.product_ingredients;
CREATE POLICY product_ingredients_publication_required
  ON public.product_ingredients AS RESTRICTIVE FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_ingredients.product_id));

DROP POLICY IF EXISTS nutritional_profiles_publication_required ON public.nutritional_profiles;
CREATE POLICY nutritional_profiles_publication_required
  ON public.nutritional_profiles AS RESTRICTIVE FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = nutritional_profiles.product_id));

DROP POLICY IF EXISTS analysis_results_publication_required ON public.analysis_results;
CREATE POLICY analysis_results_publication_required
  ON public.analysis_results AS RESTRICTIVE FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = analysis_results.product_id));

DROP POLICY IF EXISTS product_ingredient_label_sets_publication_required ON public.product_ingredient_label_sets;
CREATE POLICY product_ingredient_label_sets_publication_required
  ON public.product_ingredient_label_sets AS RESTRICTIVE FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_ingredient_label_sets.product_id));

DROP POLICY IF EXISTS product_ingredient_label_items_publication_required ON public.product_ingredient_label_items;
CREATE POLICY product_ingredient_label_items_publication_required
  ON public.product_ingredient_label_items AS RESTRICTIVE FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.product_ingredient_label_sets label_set
    WHERE label_set.id = product_ingredient_label_items.label_set_id
  ));

-- This intentional owner-privileged view publishes only rating fields while the
-- underlying review text remains owner-only. Owner privileges bypass product
-- RLS, so repeat the full publication gate explicitly in the public projection.
CREATE OR REPLACE VIEW public.product_ratings WITH (security_barrier = true) AS
  SELECT r.id, r.product_id, r.rating, r.created_at, (r.user_id = auth.uid()) AS is_mine
  FROM public.reviews r
  JOIN public.products p ON p.id = r.product_id
  WHERE p.is_visible = TRUE
    AND p.verification_status IN ('reviewed', 'verified')
    AND (
      NOT private.hide_unverified_products_enabled()
      OR p.verification_status = 'verified'
    );

-- search_catalog_products is SECURITY INVOKER and products_with_compatibility
-- is security_invoker=true; both inherit the restrictive products policy above.
-- Observations, raw scan label sets/items, and reanalysis results remain private.
-- Owner-only reviews, favorites, history, and other private records are preserved.

COMMIT;
