BEGIN;

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
    AND current_submission.extraction_version = p_extraction_version
    AND current_submission.extracted_data <> '{}'::JSONB
  THEN
    RETURN JSONB_BUILD_OBJECT('kind', 'reused', 'status', current_submission.status);
  END IF;

  IF current_submission.status = 'processing' THEN
    RETURN JSONB_BUILD_OBJECT('kind', 'busy', 'status', current_submission.status);
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
    processing_error_code = NULL
  WHERE id = p_submission_id;

  INSERT INTO public.scan_processing_events (submission_id, event_name)
  VALUES (p_submission_id, 'processing_claimed');

  RETURN JSONB_BUILD_OBJECT(
    'kind', 'claimed',
    'submission', JSONB_BUILD_OBJECT(
      'id', current_submission.id,
      'userId', current_submission.user_id,
      'scannedBarcode', current_submission.scanned_barcode,
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
  ON CONFLICT (scan_submission_id, source_type) WHERE scan_submission_id IS NOT NULL DO NOTHING;

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

COMMIT;
