BEGIN;

CREATE TABLE IF NOT EXISTS public.product_label_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  source_observation_id UUID REFERENCES public.product_observations(id) ON DELETE SET NULL,
  request_id UUID NOT NULL UNIQUE,
  raw_label_text TEXT,
  is_current BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.product_label_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label_set_id UUID NOT NULL REFERENCES public.product_label_sets(id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position BETWEEN 1 AND 200),
  raw_text TEXT NOT NULL CHECK (CHAR_LENGTH(BTRIM(raw_text)) BETWEEN 1 AND 500),
  canonical_ingredient_id UUID REFERENCES public.ingredients(id) ON DELETE SET NULL,
  match_status TEXT NOT NULL DEFAULT 'unmatched'
    CHECK (match_status IN ('matched', 'unmatched', 'ambiguous', 'blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (label_set_id, position)
);

CREATE INDEX IF NOT EXISTS idx_product_label_sets_product_current
  ON public.product_label_sets (product_id, is_current, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_label_items_label_set
  ON public.product_label_items (label_set_id, position);

ALTER TABLE public.product_label_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_label_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.product_label_sets FROM anon, authenticated;
REVOKE ALL ON TABLE public.product_label_items FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.confirm_scan_submission(
  p_submission_id UUID,
  p_user_id UUID,
  p_confirmed_label JSONB,
  p_confirmed_barcode TEXT
)
RETURNS BOOLEAN
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_submission public.product_scan_submissions%ROWTYPE;
BEGIN
  SELECT * INTO current_submission
  FROM public.product_scan_submissions
  WHERE id = p_submission_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN RETURN FALSE; END IF;
  IF current_submission.status = 'submitted' THEN RETURN TRUE; END IF;
  IF current_submission.status <> 'needs_confirmation' THEN RETURN FALSE; END IF;
  IF NULLIF(BTRIM(COALESCE(p_confirmed_label ->> 'name', '')), '') IS NULL
    OR p_confirmed_label ->> 'species' NOT IN ('dog', 'cat', 'all')
    OR p_confirmed_label ->> 'productType' NOT IN ('food', 'treat', 'supplement')
    OR (p_confirmed_barcode IS NOT NULL AND p_confirmed_barcode !~ '^\d{8,14}$')
  THEN
    RETURN FALSE;
  END IF;

  IF p_confirmed_barcode IS NOT NULL
    AND p_confirmed_barcode IS DISTINCT FROM current_submission.scanned_barcode
  THEN
    INSERT INTO public.product_observations (
      scan_submission_id,
      source_type,
      raw_barcode,
      extracted_data,
      package_version
    ) VALUES (
      p_submission_id,
      'other',
      p_confirmed_barcode,
      JSONB_BUILD_OBJECT(
        'kind', 'user_correction',
        'previousBarcode', current_submission.scanned_barcode,
        'confirmedBarcode', p_confirmed_barcode
      ),
      current_submission.extraction_version
    )
    ON CONFLICT (scan_submission_id, source_type) WHERE scan_submission_id IS NOT NULL DO NOTHING;
  END IF;

  UPDATE public.product_scan_submissions
  SET
    confirmed_data = JSONB_BUILD_OBJECT(
      'label', p_confirmed_label,
      'confirmedBarcode', p_confirmed_barcode
    ),
    status = 'submitted',
    submitted_at = NOW()
  WHERE id = p_submission_id;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.publish_community_scan(
  p_submission_id UUID,
  p_user_id UUID,
  p_duplicate_action TEXT,
  p_existing_product_id UUID,
  p_product JSONB
)
RETURNS JSONB
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_submission public.product_scan_submissions%ROWTYPE;
  resolved_id UUID;
  generated_id UUID := gen_random_uuid();
  barcode_value TEXT := NULLIF(BTRIM(p_product ->> 'barcode'), '');
  canonical_key TEXT := NULLIF(BTRIM(p_product ->> 'canonicalProductKey'), '');
  barcode_matches UUID[];
  canonical_matches UUID[];
  final_slug TEXT;
  observation_id UUID;
  label_set_id UUID;
BEGIN
  SELECT * INTO current_submission
  FROM public.product_scan_submissions
  WHERE id = p_submission_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN RETURN JSONB_BUILD_OBJECT('status', 'missing'); END IF;
  IF current_submission.status = 'published' AND current_submission.resolved_product_id IS NOT NULL THEN
    RETURN JSONB_BUILD_OBJECT(
      'status', 'published',
      'productId', current_submission.resolved_product_id
    );
  END IF;
  IF current_submission.status <> 'submitted' THEN
    RETURN JSONB_BUILD_OBJECT('status', 'invalid_state');
  END IF;

  IF NULLIF(BTRIM(COALESCE(p_product ->> 'displayName', '')), '') IS NULL
    OR NULLIF(BTRIM(COALESCE(p_product ->> 'brandName', '')), '') IS NULL
    OR canonical_key IS NULL
    OR p_product ->> 'catalogSource' <> 'community_scan'
    OR p_product ->> 'verificationStatus' <> 'pending'
    OR COALESCE((p_product ->> 'isVisible')::BOOLEAN, FALSE) IS NOT TRUE
  THEN
    RETURN JSONB_BUILD_OBJECT('status', 'invalid_product');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(COALESCE(barcode_value, canonical_key), 0));

  SELECT COALESCE(ARRAY_AGG(id ORDER BY id), ARRAY[]::UUID[])
  INTO barcode_matches
  FROM public.products
  WHERE barcode_value IS NOT NULL
    AND REGEXP_REPLACE(COALESCE(barcode, ''), '\D', '', 'g') = barcode_value;

  SELECT COALESCE(ARRAY_AGG(id ORDER BY id), ARRAY[]::UUID[])
  INTO canonical_matches
  FROM public.products
  WHERE canonical_product_key = canonical_key;

  IF CARDINALITY(barcode_matches) > 1 OR CARDINALITY(canonical_matches) > 1 THEN
    UPDATE public.product_scan_submissions
    SET status = 'needs_review', processing_error_code = 'ambiguous_duplicate'
    WHERE id = p_submission_id;
    RETURN JSONB_BUILD_OBJECT('status', 'needs_review');
  END IF;

  IF CARDINALITY(barcode_matches) = 1 THEN
    resolved_id = barcode_matches[1];
  ELSIF CARDINALITY(canonical_matches) = 1 THEN
    resolved_id = canonical_matches[1];
  ELSIF p_duplicate_action = 'link' AND p_existing_product_id IS NOT NULL THEN
    UPDATE public.product_scan_submissions
    SET status = 'needs_review', processing_error_code = 'stale_duplicate_decision'
    WHERE id = p_submission_id;
    RETURN JSONB_BUILD_OBJECT('status', 'needs_review');
  ELSIF p_duplicate_action = 'create' THEN
    final_slug = NULLIF(BTRIM(p_product ->> 'slug'), '');
    IF final_slug IS NULL THEN final_slug = generated_id::TEXT; END IF;
    IF EXISTS (SELECT 1 FROM public.products WHERE slug = final_slug) THEN
      final_slug = final_slug || '-' || LEFT(generated_id::TEXT, 8);
    END IF;

    INSERT INTO public.products (
      id,
      name,
      display_name,
      normalized_name,
      brand_name,
      normalized_brand_name,
      manufacturer_name,
      product_type,
      target_pet_type,
      barcode,
      canonical_product_key,
      slug,
      catalog_source,
      verification_status,
      is_visible,
      analysis_status,
      last_observed_at
    ) VALUES (
      generated_id,
      p_product ->> 'rawName',
      p_product ->> 'displayName',
      LOWER(REGEXP_REPLACE(p_product ->> 'displayName', '[^0-9A-Za-z가-힣]+', '', 'g')),
      p_product ->> 'brandName',
      LOWER(REGEXP_REPLACE(p_product ->> 'brandName', '[^0-9A-Za-z가-힣]+', '', 'g')),
      p_product ->> 'manufacturerName',
      p_product ->> 'productType',
      p_product ->> 'targetPetType',
      barcode_value,
      canonical_key,
      final_slug,
      'community_scan',
      'pending',
      TRUE,
      CASE
        WHEN JSONB_ARRAY_LENGTH(COALESCE(p_product #> '{label,ingredients}', '[]'::JSONB)) > 0
          THEN 'partial'
        ELSE 'unavailable'
      END,
      NOW()
    );
    resolved_id = generated_id;
  ELSE
    UPDATE public.product_scan_submissions
    SET status = 'needs_review', processing_error_code = 'ambiguous_duplicate'
    WHERE id = p_submission_id;
    RETURN JSONB_BUILD_OBJECT('status', 'needs_review');
  END IF;

  UPDATE public.product_observations
  SET product_id = resolved_id
  WHERE scan_submission_id = p_submission_id;

  SELECT id INTO observation_id
  FROM public.product_observations
  WHERE scan_submission_id = p_submission_id AND source_type = 'user_scan'
  LIMIT 1;

  INSERT INTO public.product_aliases (
    product_id,
    alias_text,
    normalized_alias,
    alias_type,
    is_searchable
  ) VALUES (
    resolved_id,
    p_product ->> 'rawName',
    LOWER(REGEXP_REPLACE(p_product ->> 'rawName', '[^0-9A-Za-z가-힣]+', '', 'g')),
    'source_title',
    TRUE
  )
  ON CONFLICT (product_id, normalized_alias, language_code) DO NOTHING;

  UPDATE public.product_label_sets
  SET is_current = FALSE
  WHERE product_id = resolved_id AND is_current = TRUE;

  INSERT INTO public.product_label_sets (
    product_id,
    source_observation_id,
    request_id,
    raw_label_text,
    is_current
  ) VALUES (
    resolved_id,
    observation_id,
    p_submission_id,
    current_submission.extracted_data #>> '{labelPanels,ingredientText}',
    TRUE
  )
  ON CONFLICT (request_id) DO UPDATE SET request_id = EXCLUDED.request_id
  RETURNING id INTO label_set_id;

  INSERT INTO public.product_label_items (label_set_id, position, raw_text)
  SELECT label_set_id, item.ordinality::INTEGER, BTRIM(item.value)
  FROM JSONB_ARRAY_ELEMENTS_TEXT(
    COALESCE(p_product #> '{label,ingredients}', '[]'::JSONB)
  ) WITH ORDINALITY AS item(value, ordinality)
  WHERE NULLIF(BTRIM(item.value), '') IS NOT NULL
  ON CONFLICT (label_set_id, position) DO NOTHING;

  UPDATE public.product_scan_submissions
  SET
    status = 'published',
    resolved_product_id = resolved_id,
    processing_error_code = NULL,
    published_at = NOW()
  WHERE id = p_submission_id;

  RETURN JSONB_BUILD_OBJECT('status', 'published', 'productId', resolved_id);
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_scan_submission(UUID, UUID, JSONB, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_scan_submission(UUID, UUID, JSONB, TEXT)
  TO service_role;

REVOKE ALL ON FUNCTION public.publish_community_scan(UUID, UUID, TEXT, UUID, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.publish_community_scan(UUID, UUID, TEXT, UUID, JSONB)
  TO service_role;

COMMIT;
