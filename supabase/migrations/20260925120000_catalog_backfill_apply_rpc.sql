BEGIN;

CREATE OR REPLACE FUNCTION public.apply_catalog_backfill_candidate(
  p_product_id UUID,
  p_source_name TEXT,
  p_source_brand_name TEXT,
  p_source_last_observed_at TIMESTAMPTZ,
  p_artifact_generated_at TIMESTAMPTZ,
  p_display_name TEXT,
  p_normalized_name TEXT,
  p_brand_name TEXT,
  p_normalized_brand_name TEXT,
  p_canonical_product_key TEXT,
  p_slug TEXT,
  p_raw_alias TEXT,
  p_normalized_alias TEXT
)
RETURNS TABLE (
  applied BOOLEAN,
  reason TEXT
)
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_product public.products%ROWTYPE;
BEGIN
  SELECT *
  INTO current_product
  FROM public.products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'missing-product'::TEXT;
    RETURN;
  END IF;

  IF COALESCE(current_product.name, '') <> COALESCE(p_source_name, '')
    OR COALESCE(current_product.brand_name, '') <> COALESCE(p_source_brand_name, '')
    OR current_product.last_observed_at IS DISTINCT FROM p_source_last_observed_at
    OR current_product.last_observed_at > p_artifact_generated_at
  THEN
    RETURN QUERY SELECT FALSE, 'stale-source'::TEXT;
    RETURN;
  END IF;

  IF NULLIF(BTRIM(COALESCE(current_product.display_name, '')), '') IS NOT NULL
    OR NULLIF(BTRIM(COALESCE(current_product.normalized_name, '')), '') IS NOT NULL
    OR NULLIF(BTRIM(COALESCE(current_product.normalized_brand_name, '')), '') IS NOT NULL
    OR NULLIF(BTRIM(COALESCE(current_product.canonical_product_key, '')), '') IS NOT NULL
    OR NULLIF(BTRIM(COALESCE(current_product.slug, '')), '') IS NOT NULL
  THEN
    RETURN QUERY SELECT FALSE, 'clean-fields-present'::TEXT;
    RETURN;
  END IF;

  IF NULLIF(BTRIM(COALESCE(p_display_name, '')), '') IS NULL
    OR NULLIF(BTRIM(COALESCE(p_normalized_name, '')), '') IS NULL
    OR NULLIF(BTRIM(COALESCE(p_brand_name, '')), '') IS NULL
    OR NULLIF(BTRIM(COALESCE(p_normalized_brand_name, '')), '') IS NULL
    OR NULLIF(BTRIM(COALESCE(p_canonical_product_key, '')), '') IS NULL
    OR NULLIF(BTRIM(COALESCE(p_slug, '')), '') IS NULL
    OR NULLIF(BTRIM(COALESCE(p_raw_alias, '')), '') IS NULL
    OR NULLIF(BTRIM(COALESCE(p_normalized_alias, '')), '') IS NULL
  THEN
    RETURN QUERY SELECT FALSE, 'incomplete-candidate'::TEXT;
    RETURN;
  END IF;

  UPDATE public.products
  SET
    display_name = BTRIM(p_display_name),
    normalized_name = BTRIM(p_normalized_name),
    brand_name = BTRIM(p_brand_name),
    normalized_brand_name = BTRIM(p_normalized_brand_name),
    canonical_product_key = BTRIM(p_canonical_product_key),
    slug = BTRIM(p_slug)
  WHERE id = p_product_id;

  INSERT INTO public.product_aliases (
    product_id,
    alias_text,
    normalized_alias,
    language_code,
    alias_type,
    is_searchable
  ) VALUES (
    p_product_id,
    BTRIM(p_raw_alias),
    BTRIM(p_normalized_alias),
    'ko',
    'source_title',
    TRUE
  )
  ON CONFLICT (product_id, normalized_alias, language_code) DO UPDATE
  SET
    alias_text = EXCLUDED.alias_text,
    alias_type = 'source_title',
    is_searchable = TRUE;

  RETURN QUERY SELECT TRUE, 'applied'::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_catalog_backfill_candidate(
  UUID, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.apply_catalog_backfill_candidate(
  UUID, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
) TO service_role;

COMMIT;
