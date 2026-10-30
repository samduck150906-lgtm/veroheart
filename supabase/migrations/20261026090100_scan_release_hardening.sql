BEGIN;

-- Scan state and label evidence are server-owned. Column grants must be revoked
-- explicitly: revoking a table-level grant does not remove prior column grants.
REVOKE INSERT (user_id, scanned_barcode, status, front_image_paths, ingredient_image_paths, nutrition_image_paths, confirmed_data) ON public.product_scan_submissions FROM authenticated;
REVOKE UPDATE (status, front_image_paths, ingredient_image_paths, nutrition_image_paths, confirmed_data) ON public.product_scan_submissions FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.product_scan_submissions FROM anon, authenticated;
DROP POLICY IF EXISTS product_scan_submissions_owner_insert ON public.product_scan_submissions;
DROP POLICY IF EXISTS product_scan_submissions_owner_update ON public.product_scan_submissions;
ALTER TABLE public.product_scan_submissions ADD COLUMN IF NOT EXISTS published_new_product BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.product_scan_submissions ADD COLUMN IF NOT EXISTS evidence_purged_at TIMESTAMPTZ;
ALTER TABLE public.product_scan_submissions ADD COLUMN IF NOT EXISTS evidence_purge_attempted_at TIMESTAMPTZ;
CREATE TABLE IF NOT EXISTS public.scan_evidence_uploads (
  path TEXT PRIMARY KEY,
  submission_id UUID NOT NULL REFERENCES public.product_scan_submissions(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('front', 'ingredient', 'nutrition')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.scan_evidence_uploads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.scan_evidence_uploads FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.scan_evidence_uploads TO service_role;
CREATE INDEX IF NOT EXISTS idx_scan_evidence_upload_submission ON public.scan_evidence_uploads(submission_id);

CREATE OR REPLACE FUNCTION public.register_scan_evidence_upload(p_submission_id UUID, p_user_id UUID, p_category TEXT, p_path TEXT)
RETURNS BOOLEAN LANGUAGE PLPGSQL SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM 1 FROM public.product_scan_submissions WHERE id = p_submission_id AND user_id = p_user_id AND status IN ('draft', 'uploaded', 'needs_confirmation', 'failed') FOR UPDATE;
  IF NOT FOUND OR p_category NOT IN ('front', 'ingredient', 'nutrition') OR NOT public.scan_evidence_paths_valid(p_user_id, p_submission_id, p_category, ARRAY[p_path]) THEN RETURN FALSE; END IF;
  INSERT INTO public.scan_evidence_uploads(path, submission_id, category) VALUES (p_path, p_submission_id, p_category) ON CONFLICT (path) DO NOTHING;
  UPDATE public.product_scan_submissions SET evidence_retention_at = NOW(), evidence_purged_at = NULL, evidence_purge_attempted_at = NULL WHERE id = p_submission_id;
  RETURN TRUE;
END;
$$;
REVOKE ALL ON FUNCTION public.register_scan_evidence_upload(UUID, UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_scan_evidence_upload(UUID, UUID, TEXT, TEXT) TO service_role;

UPDATE storage.buckets SET allowed_mime_types = ARRAY['image/webp', 'image/jpeg', 'image/png'] WHERE id = 'product-scan-evidence';

CREATE OR REPLACE FUNCTION public.scan_evidence_paths_valid(p_user_id UUID, p_submission_id UUID, p_category TEXT, p_paths TEXT[])
RETURNS BOOLEAN LANGUAGE SQL IMMUTABLE SET search_path = '' AS $$
  SELECT COALESCE(BOOL_AND(object_path ~ ('^' || p_user_id::TEXT || '/' || p_submission_id::TEXT || '/' || p_category || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(webp|jpg|png)$')), TRUE)
  FROM UNNEST(COALESCE(p_paths, ARRAY[]::TEXT[])) AS object_path;
$$;
GRANT EXECUTE ON FUNCTION public.scan_evidence_paths_valid(UUID, UUID, TEXT, TEXT[]) TO service_role;

CREATE OR REPLACE FUNCTION public.scan_evidence_objects_exist(p_user_id UUID, p_submission_id UUID, p_front TEXT[], p_ingredient TEXT[], p_nutrition TEXT[])
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT COALESCE(
    CARDINALITY(p_front) BETWEEN 1 AND 10 AND CARDINALITY(p_ingredient) BETWEEN 1 AND 10 AND CARDINALITY(p_nutrition) BETWEEN 1 AND 10
    AND public.scan_evidence_paths_valid(p_user_id, p_submission_id, 'front', p_front)
    AND public.scan_evidence_paths_valid(p_user_id, p_submission_id, 'ingredient', p_ingredient)
    AND public.scan_evidence_paths_valid(p_user_id, p_submission_id, 'nutrition', p_nutrition)
    AND NOT EXISTS (
      SELECT 1 FROM UNNEST(p_front || p_ingredient || p_nutrition) AS evidence_path
      WHERE NOT EXISTS (
        SELECT 1 FROM storage.objects o
        WHERE o.bucket_id = 'product-scan-evidence' AND o.name = evidence_path
          AND o.metadata ->> 'mimetype' = CASE WHEN evidence_path LIKE '%.jpg' THEN 'image/jpeg' WHEN evidence_path LIKE '%.png' THEN 'image/png' ELSE 'image/webp' END
          AND (o.metadata ->> 'size')::BIGINT BETWEEN 1 AND 5242880
      )
    ), FALSE);
$$;
REVOKE ALL ON FUNCTION public.scan_evidence_objects_exist(UUID, UUID, TEXT[], TEXT[], TEXT[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.scan_evidence_objects_exist(UUID, UUID, TEXT[], TEXT[], TEXT[]) TO service_role;

CREATE OR REPLACE FUNCTION public.scan_has_trusted_evidence(p_submission_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT COALESCE((SELECT
    s.extraction_version IS NOT NULL
    AND JSONB_TYPEOF(s.extracted_data -> 'identity') = 'object'
    AND JSONB_TYPEOF(s.extracted_data -> 'ingredients') = 'array'
    AND EXISTS (SELECT 1 FROM public.product_observations o WHERE o.scan_submission_id = s.id AND o.source_type = 'user_scan' AND o.package_version = s.extraction_version AND o.extracted_data = s.extracted_data)
    AND EXISTS (SELECT 1 FROM public.scan_processing_events e WHERE e.submission_id = s.id AND e.event_name = 'extraction_completed')
    AND public.scan_evidence_objects_exist(s.user_id, s.id, s.front_image_paths, s.ingredient_image_paths, s.nutrition_image_paths)
    FROM public.product_scan_submissions s WHERE s.id = p_submission_id), FALSE);
$$;
REVOKE ALL ON FUNCTION public.scan_has_trusted_evidence(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.scan_has_trusted_evidence(UUID) TO service_role;


CREATE OR REPLACE FUNCTION public.claim_scan_processing(
  p_submission_id UUID,
  p_user_id UUID,
  p_front_paths TEXT[],
  p_ingredient_paths TEXT[],
  p_nutrition_paths TEXT[],
  p_extraction_version TEXT
)
RETURNS JSONB
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_submission public.product_scan_submissions%ROWTYPE;
BEGIN
  SELECT *
  INTO current_submission
  FROM public.product_scan_submissions
  WHERE id = p_submission_id
    AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN JSONB_BUILD_OBJECT('kind', 'missing');
  END IF;

  IF current_submission.status = 'needs_confirmation'
    AND SPLIT_PART(current_submission.extraction_version, ':', 1) = SPLIT_PART(p_extraction_version, ':', 1)
    AND current_submission.front_image_paths = p_front_paths
    AND current_submission.ingredient_image_paths = p_ingredient_paths
    AND current_submission.nutrition_image_paths = p_nutrition_paths
    AND current_submission.extracted_data <> '{}'::JSONB
  THEN
    RETURN JSONB_BUILD_OBJECT('kind', 'reused', 'status', current_submission.status);
  END IF;

  IF current_submission.status = 'processing' AND current_submission.updated_at < NOW() - INTERVAL '16 minutes' THEN
    UPDATE public.product_scan_submissions SET status = 'failed', processing_error_code = 'processing_lease_expired' WHERE id = p_submission_id;
    current_submission.status = 'failed';
  END IF;

  IF current_submission.status = 'processing' THEN
    RETURN JSONB_BUILD_OBJECT('kind', 'busy', 'status', current_submission.status);
  END IF;

  IF NOT public.scan_evidence_objects_exist(p_user_id, p_submission_id, p_front_paths, p_ingredient_paths, p_nutrition_paths) THEN
    RAISE EXCEPTION 'scan evidence missing or invalid' USING ERRCODE = '22023';
  END IF;

  IF CARDINALITY(p_front_paths) < 1
    OR CARDINALITY(p_ingredient_paths) < 1
    OR CARDINALITY(p_nutrition_paths) < 1
    OR NULLIF(BTRIM(COALESCE(p_extraction_version, '')), '') IS NULL
  THEN
    RAISE EXCEPTION 'missing scan evidence'
      USING ERRCODE = '22023';
  END IF;

  IF current_submission.status IN ('draft', 'needs_confirmation', 'failed') THEN
    UPDATE public.product_scan_submissions
    SET
      front_image_paths = p_front_paths,
      ingredient_image_paths = p_ingredient_paths,
      nutrition_image_paths = p_nutrition_paths,
      status = 'uploaded',
      processing_error_code = NULL
    WHERE id = p_submission_id;
    current_submission.status = 'uploaded';
  END IF;

  IF current_submission.status <> 'uploaded' THEN
    RETURN JSONB_BUILD_OBJECT('kind', 'busy', 'status', current_submission.status);
  END IF;

  UPDATE public.product_scan_submissions
  SET
    status = 'processing',
    extraction_version = p_extraction_version,
    processing_error_code = NULL,
    extracted_data = '{}'::JSONB, confirmed_data = '{}'::JSONB
  WHERE id = p_submission_id;

  INSERT INTO public.scan_processing_events (submission_id, event_name)
  VALUES (p_submission_id, 'processing_claimed');

  RETURN JSONB_BUILD_OBJECT(
    'kind', 'claimed',
    'submission', JSONB_BUILD_OBJECT(
      'id', current_submission.id,
      'userId', current_submission.user_id,
      'scannedBarcode', current_submission.scanned_barcode,
      'extractionVersion', p_extraction_version,
      'imagePaths', JSONB_BUILD_OBJECT(
        'front', p_front_paths,
        'ingredient', p_ingredient_paths,
        'nutrition', p_nutrition_paths
      )
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_scan_extraction(
  p_submission_id UUID,
  p_extraction_version TEXT,
  p_extraction JSONB,
  p_external_observation JSONB,
  p_warning_code TEXT
)
RETURNS BOOLEAN
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_submission public.product_scan_submissions%ROWTYPE;
  raw_panels TEXT;
BEGIN
  SELECT *
  INTO current_submission
  FROM public.product_scan_submissions
  WHERE id = p_submission_id
  FOR UPDATE;

  IF NOT FOUND THEN RETURN FALSE; END IF;
  IF current_submission.status = 'needs_confirmation'
    AND current_submission.extraction_version = p_extraction_version
  THEN
    RETURN TRUE;
  END IF;
  IF current_submission.status <> 'processing'
    OR current_submission.extraction_version <> p_extraction_version
  THEN
    RETURN FALSE;
  END IF;

  raw_panels = CONCAT_WS(
    E'\n',
    p_extraction #>> '{labelPanels,ingredientText}',
    p_extraction #>> '{labelPanels,nutritionText}',
    p_extraction #>> '{labelPanels,registrationText}'
  );

  INSERT INTO public.product_observations (
    product_id,
    scan_submission_id,
    source_type,
    raw_name,
    raw_brand,
    raw_barcode,
    raw_label_text,
    extracted_data,
    field_confidence,
    package_version
  ) VALUES (
    NULL,
    p_submission_id,
    'user_scan',
    p_extraction #>> '{identity,name}',
    p_extraction #>> '{identity,brand}',
    p_extraction ->> 'printedBarcode',
    raw_panels,
    p_extraction,
    COALESCE(p_extraction -> 'fieldConfidence', '{}'::JSONB),
    p_extraction_version
  )
  ON CONFLICT (scan_submission_id, source_type) WHERE scan_submission_id IS NOT NULL DO UPDATE
  SET raw_name = EXCLUDED.raw_name, raw_brand = EXCLUDED.raw_brand, raw_barcode = EXCLUDED.raw_barcode, raw_label_text = EXCLUDED.raw_label_text, extracted_data = EXCLUDED.extracted_data, field_confidence = EXCLUDED.field_confidence, package_version = EXCLUDED.package_version;

  IF COALESCE((p_external_observation ->> 'found')::BOOLEAN, FALSE) THEN
    INSERT INTO public.product_observations (
      product_id,
      scan_submission_id,
      source_type,
      source_url,
      raw_name,
      raw_brand,
      raw_barcode,
      raw_label_text,
      extracted_data,
      package_version
    ) VALUES (
      NULL,
      p_submission_id,
      'open_pet_food_facts',
      p_external_observation ->> 'sourceUrl',
      p_external_observation ->> 'name',
      p_external_observation ->> 'brands',
      p_external_observation ->> 'barcode',
      p_external_observation ->> 'ingredientsText',
      p_external_observation,
      p_extraction_version
    )
    ON CONFLICT (scan_submission_id, source_type) WHERE scan_submission_id IS NOT NULL DO NOTHING;
  END IF;

  UPDATE public.product_scan_submissions
  SET
    status = 'needs_confirmation',
    extracted_data = p_extraction,
    field_confidence = COALESCE(p_extraction -> 'fieldConfidence', '{}'::JSONB),
    processing_error_code = p_warning_code
  WHERE id = p_submission_id;

  INSERT INTO public.scan_processing_events (submission_id, event_name, safe_error_code)
  VALUES (p_submission_id, 'extraction_completed', p_warning_code);

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.fail_scan_extraction(
  p_submission_id UUID,
  p_extraction_version TEXT,
  p_error_code TEXT
)
RETURNS BOOLEAN
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_error_code !~ '^[a-z0-9_]{1,80}$' THEN
    RAISE EXCEPTION 'invalid scan error code'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.product_scan_submissions
  SET
    status = 'failed',
    processing_error_code = p_error_code
  WHERE id = p_submission_id
    AND status = 'processing'
    AND extraction_version = p_extraction_version;

  IF NOT FOUND THEN RETURN FALSE; END IF;

  INSERT INTO public.scan_processing_events (submission_id, event_name, safe_error_code)
  VALUES (p_submission_id, 'extraction_failed', p_error_code);
  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_scan_processing(
  UUID, UUID, TEXT[], TEXT[], TEXT[], TEXT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_scan_processing(
  UUID, UUID, TEXT[], TEXT[], TEXT[], TEXT
) TO service_role;

REVOKE ALL ON FUNCTION public.complete_scan_extraction(
  UUID, TEXT, JSONB, JSONB, TEXT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_scan_extraction(
  UUID, TEXT, JSONB, JSONB, TEXT
) TO service_role;

REVOKE ALL ON FUNCTION public.fail_scan_extraction(UUID, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fail_scan_extraction(UUID, TEXT, TEXT)
  TO service_role;

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
  IF NOT public.scan_has_trusted_evidence(p_submission_id) THEN RETURN FALSE; END IF;
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
  v_label_set_id UUID;
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

  IF NOT public.scan_has_trusted_evidence(p_submission_id)
    OR p_product -> 'label' IS DISTINCT FROM current_submission.confirmed_data -> 'label'
  THEN RETURN JSONB_BUILD_OBJECT('status', 'untrusted_evidence'); END IF;

  IF NULLIF(BTRIM(COALESCE(p_product ->> 'displayName', '')), '') IS NULL
    OR NULLIF(BTRIM(COALESCE(p_product ->> 'brandName', '')), '') IS NULL
    OR canonical_key IS NULL
    OR p_product ->> 'catalogSource' <> 'community_scan'
    OR p_product ->> 'verificationStatus' <> 'pending'
    OR COALESCE((p_product ->> 'isVisible')::BOOLEAN, FALSE) IS NOT TRUE
  THEN
    RETURN JSONB_BUILD_OBJECT('status', 'invalid_product');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('canonical:' || canonical_key, 0));
  IF barcode_value IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('barcode:' || barcode_value, 0));
  END IF;

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
    -- Runtime nutrition is written only for a product created by this transaction.
    -- Values were mapped from confirmed package components with explicit units;
    -- absent fields stay SQL NULL, with the original label retained as provenance.
    IF COALESCE(p_product #> '{nutrition,profile}', '{}'::JSONB) <> '{}'::JSONB THEN
      INSERT INTO public.nutritional_profiles (product_id, crude_protein, crude_fat, crude_fiber, crude_ash, moisture, calcium, phosphorus)
      VALUES (
        generated_id,
        (p_product #>> '{nutrition,profile,crude_protein}')::NUMERIC,
        (p_product #>> '{nutrition,profile,crude_fat}')::NUMERIC,
        (p_product #>> '{nutrition,profile,crude_fiber}')::NUMERIC,
        (p_product #>> '{nutrition,profile,crude_ash}')::NUMERIC,
        (p_product #>> '{nutrition,profile,moisture}')::NUMERIC,
        (p_product #>> '{nutrition,profile,calcium}')::NUMERIC,
        (p_product #>> '{nutrition,profile,phosphorus}')::NUMERIC
      ) ON CONFLICT (product_id) DO NOTHING;
    END IF;
    IF p_product #>> '{nutrition,kcalPer100g}' IS NOT NULL THEN
      UPDATE public.products SET kcal_per_100g = (p_product #>> '{nutrition,kcalPer100g}')::NUMERIC
      WHERE id = generated_id;
    END IF;
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

  -- Existing products retain their current reviewed label. Store this contribution
  -- as non-current evidence and require review, including duplicate races.
  IF resolved_id <> generated_id THEN
    INSERT INTO public.product_label_sets (product_id, source_observation_id, request_id, raw_label_text, is_current)
    VALUES (resolved_id, observation_id, p_submission_id, current_submission.extracted_data #>> '{labelPanels,ingredientText}', FALSE)
    ON CONFLICT (request_id) DO UPDATE SET request_id = EXCLUDED.request_id
    RETURNING id INTO v_label_set_id;
    INSERT INTO public.product_label_items (label_set_id, position, raw_text)
    SELECT v_label_set_id, item.ordinality::INTEGER, BTRIM(item.value)
    FROM JSONB_ARRAY_ELEMENTS_TEXT(COALESCE(p_product #> '{label,ingredients}', '[]'::JSONB)) WITH ORDINALITY AS item(value, ordinality)
    WHERE NULLIF(BTRIM(item.value), '') IS NOT NULL
    ON CONFLICT (label_set_id, position) DO NOTHING;
    UPDATE public.product_scan_submissions SET status = 'needs_review', resolved_product_id = resolved_id, processing_error_code = 'duplicate_review' WHERE id = p_submission_id;
    RETURN JSONB_BUILD_OBJECT('status', 'needs_review');
  END IF;

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
  RETURNING id INTO v_label_set_id;

  INSERT INTO public.product_label_items (label_set_id, position, raw_text)
  SELECT v_label_set_id, item.ordinality::INTEGER, BTRIM(item.value)
  FROM JSONB_ARRAY_ELEMENTS_TEXT(
    COALESCE(p_product #> '{label,ingredients}', '[]'::JSONB)
  ) WITH ORDINALITY AS item(value, ordinality)
  WHERE NULLIF(BTRIM(item.value), '') IS NOT NULL
  ON CONFLICT (label_set_id, position) DO NOTHING;

  UPDATE public.product_scan_submissions
  SET
    status = 'published',
    published_new_product = TRUE,
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


-- Age all abandoned work from its last state transition. A 30-day inactive scan
-- is cancelled before purge. Failed removals remain queued and rotate behind
-- never-attempted rows, so one failed object cannot starve later submissions.
CREATE OR REPLACE FUNCTION public.ingest_community_scan_ingredient_label(p_submission_id UUID, p_product_id UUID, p_items JSONB)
RETURNS UUID LANGUAGE PLPGSQL SECURITY DEFINER SET search_path = '' AS $$
DECLARE s public.product_scan_submissions%ROWTYPE;
BEGIN
  -- Match the ingestion function's request-then-product lock order.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_submission_id::TEXT, 0));
  PERFORM pg_advisory_xact_lock(hashtextextended(p_product_id::TEXT, 0));
  SELECT * INTO s FROM public.product_scan_submissions WHERE id = p_submission_id;
  IF NOT FOUND OR s.status <> 'published' OR s.published_new_product IS NOT TRUE OR s.resolved_product_id IS DISTINCT FROM p_product_id OR NOT public.scan_has_trusted_evidence(p_submission_id) THEN
    RETURN NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM public.product_ingredient_label_sets WHERE product_id = p_product_id AND is_current AND ingestion_request_id IS DISTINCT FROM p_submission_id) THEN
    RETURN NULL;
  END IF;
  RETURN public.ingest_product_ingredient_label(
    p_submission_id, p_product_id, 'package_image', 'community_scan:' || p_submission_id::TEXT,
    (SELECT STRING_AGG(value, E'\n' ORDER BY ordinality) FROM JSONB_ARRAY_ELEMENTS_TEXT(s.confirmed_data #> '{label,ingredients}') WITH ORDINALITY),
    'ko', p_items
  );
END;
$$;
REVOKE ALL ON FUNCTION public.ingest_community_scan_ingredient_label(UUID, UUID, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ingest_community_scan_ingredient_label(UUID, UUID, JSONB) TO service_role;

CREATE OR REPLACE FUNCTION public.set_scan_evidence_retention_at()
RETURNS TRIGGER LANGUAGE PLPGSQL SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.evidence_retention_at = COALESCE(NEW.published_at, NOW());
    NEW.evidence_purged_at = NULL;
    NEW.evidence_purge_attempted_at = NULL;
  END IF;
  RETURN NEW;
END;
$$;
UPDATE public.product_scan_submissions SET evidence_retention_at = COALESCE(evidence_retention_at, updated_at);
CREATE INDEX IF NOT EXISTS idx_scan_pending_evidence_purge ON public.product_scan_submissions (evidence_purge_attempted_at NULLS FIRST, evidence_retention_at, id) WHERE evidence_purged_at IS NULL;

CREATE OR REPLACE FUNCTION public.claim_expired_scan_evidence(p_submission_id UUID, p_cutoff TIMESTAMPTZ)
RETURNS BOOLEAN LANGUAGE PLPGSQL SECURITY DEFINER SET search_path = '' AS $$
DECLARE s public.product_scan_submissions%ROWTYPE;
BEGIN
  SELECT * INTO s FROM public.product_scan_submissions WHERE id = p_submission_id FOR UPDATE;
  IF NOT FOUND OR s.evidence_purged_at IS NOT NULL OR s.evidence_retention_at >= p_cutoff THEN RETURN FALSE; END IF;
  IF s.status NOT IN ('published', 'rejected', 'cancelled') THEN
    UPDATE public.product_scan_submissions SET status = 'cancelled', processing_error_code = 'scan_expired' WHERE id = p_submission_id;
  END IF;
  UPDATE public.product_scan_submissions SET evidence_retention_at = s.evidence_retention_at, evidence_purge_attempted_at = NOW() WHERE id = p_submission_id;
  RETURN TRUE;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_expired_scan_evidence(UUID, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_expired_scan_evidence(UUID, TIMESTAMPTZ) TO service_role;
COMMIT;
