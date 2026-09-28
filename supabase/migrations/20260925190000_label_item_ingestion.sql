BEGIN;

ALTER TABLE public.product_ingredient_label_sets
  ADD COLUMN IF NOT EXISTS ingestion_request_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_ingredient_label_sets_ingestion_request
  ON public.product_ingredient_label_sets(ingestion_request_id)
  WHERE ingestion_request_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.ingest_product_ingredient_label(
  p_request_id UUID,
  p_product_id UUID,
  p_source_type TEXT,
  p_source_reference TEXT,
  p_raw_label_text TEXT,
  p_label_language TEXT,
  p_items JSONB
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_existing_product_id UUID;
  v_label_set_id UUID;
  v_item JSONB;
  v_label_item_id UUID;
  v_status TEXT;
  v_normalized_text TEXT;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'service_role_required' USING ERRCODE = '42501';
  END IF;

  IF p_request_id IS NULL OR p_product_id IS NULL THEN
    RAISE EXCEPTION 'request_and_product_required' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) > 100 THEN
    RAISE EXCEPTION 'invalid_label_items' USING ERRCODE = '22023';
  END IF;
  IF p_source_type NOT IN ('manual', 'manufacturer', 'package_image', 'import', 'other') THEN
    RAISE EXCEPTION 'invalid_source_type' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::TEXT, 0));

  SELECT product_id, id
    INTO v_existing_product_id, v_label_set_id
  FROM public.product_ingredient_label_sets
  WHERE ingestion_request_id = p_request_id;

  IF v_label_set_id IS NOT NULL THEN
    IF v_existing_product_id <> p_product_id THEN
      RAISE EXCEPTION 'request_id_product_mismatch' USING ERRCODE = '23505';
    END IF;
    RETURN v_label_set_id;
  END IF;

  UPDATE public.product_ingredient_label_sets
  SET is_current = FALSE, updated_at = NOW()
  WHERE product_id = p_product_id AND is_current = TRUE;

  INSERT INTO public.product_ingredient_label_sets (
    product_id, raw_label_text, source_type, source_reference, label_language,
    is_current, captured_at, ingestion_request_id
  ) VALUES (
    p_product_id, p_raw_label_text, p_source_type, NULLIF(p_source_reference, ''),
    COALESCE(NULLIF(p_label_language, ''), 'ko'), TRUE, NOW(), p_request_id
  ) RETURNING id INTO v_label_set_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_status := COALESCE(v_item->>'matchStatus', 'unreviewed');
    IF v_status NOT IN ('unreviewed', 'matched', 'ambiguous', 'unmatched', 'ignored') THEN
      RAISE EXCEPTION 'invalid_match_status' USING ERRCODE = '22023';
    END IF;

    v_normalized_text := NULLIF(v_item->>'normalizedText', '');
    INSERT INTO public.product_ingredient_label_items (
      label_set_id, display_order, raw_ingredient_text, normalized_ingredient_text,
      amount_text, percentage, canonical_ingredient_id, match_status,
      match_confidence, parser_metadata
    ) VALUES (
      v_label_set_id,
      (v_item->>'order')::INTEGER,
      v_item->>'rawText',
      v_normalized_text,
      NULLIF(v_item->>'amountText', ''),
      NULLIF(v_item->>'percentage', '')::NUMERIC,
      NULLIF(v_item->>'canonicalIngredientId', '')::UUID,
      v_status,
      CASE WHEN v_status = 'matched' THEN 1 ELSE NULL END,
      COALESCE(v_item->'parserMetadata', '{}'::JSONB)
    ) RETURNING id INTO v_label_item_id;

    IF v_status IN ('unmatched', 'ambiguous') THEN
      INSERT INTO public.canonical_ingredient_review_queue (
        label_item_id, submitted_text, normalized_text, candidate_ingredient_ids
      ) VALUES (
        v_label_item_id,
        v_item->>'rawText',
        v_normalized_text,
        COALESCE(
          ARRAY(SELECT jsonb_array_elements_text(COALESCE(v_item->'candidateCanonicalIds', '[]'::JSONB))::UUID),
          '{}'::UUID[]
        )
      )
      ON CONFLICT (normalized_text)
        WHERE status IN ('pending', 'in_review') AND normalized_text IS NOT NULL
      DO UPDATE SET
        occurrence_count = public.canonical_ingredient_review_queue.occurrence_count + 1,
        last_seen_at = NOW(),
        candidate_ingredient_ids = EXCLUDED.candidate_ingredient_ids,
        updated_at = NOW();
    END IF;
  END LOOP;

  RETURN v_label_set_id;
END;
$$;

REVOKE ALL ON FUNCTION public.ingest_product_ingredient_label(UUID, UUID, TEXT, TEXT, TEXT, TEXT, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ingest_product_ingredient_label(UUID, UUID, TEXT, TEXT, TEXT, TEXT, JSONB)
  TO service_role;

COMMIT;
