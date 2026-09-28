BEGIN;

INSERT INTO public.analysis_engine_versions (
  version, status, description, ruleset_checksum, released_at
) VALUES (
  'ingredient-match-v1',
  'active',
  'Exact canonical and reviewed-alias ingredient readiness analysis',
  'ingredient-match-v1',
  NOW()
)
ON CONFLICT (version) DO UPDATE SET
  status = 'active',
  description = EXCLUDED.description,
  ruleset_checksum = EXCLUDED.ruleset_checksum,
  released_at = COALESCE(public.analysis_engine_versions.released_at, EXCLUDED.released_at),
  updated_at = NOW();

CREATE TABLE IF NOT EXISTS public.ingredient_reanalysis_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  engine_version_id UUID NOT NULL REFERENCES public.analysis_engine_versions(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL CHECK (BTRIM(reason) <> ''),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  lease_expires_at TIMESTAMPTZ,
  error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE (product_id, engine_version_id)
);

CREATE TABLE IF NOT EXISTS public.product_ingredient_analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  engine_version_id UUID NOT NULL REFERENCES public.analysis_engine_versions(id) ON DELETE RESTRICT,
  label_set_id UUID REFERENCES public.product_ingredient_label_sets(id) ON DELETE SET NULL,
  readiness_status TEXT NOT NULL
    CHECK (readiness_status IN ('unavailable', 'partial', 'ready', 'blocked')),
  result JSONB NOT NULL,
  result_checksum TEXT NOT NULL CHECK (BTRIM(result_checksum) <> ''),
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, engine_version_id)
);

CREATE INDEX IF NOT EXISTS idx_ingredient_reanalysis_queue_claim
  ON public.ingredient_reanalysis_queue (status, lease_expires_at, created_at)
  WHERE status IN ('pending', 'processing', 'failed');

ALTER TABLE public.ingredient_reanalysis_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_ingredient_analysis_results ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.enqueue_ingredient_reanalysis(
  p_normalized_terms TEXT[],
  p_canonical_ingredient_ids UUID[],
  p_engine_version_id UUID,
  p_reason TEXT
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'service_role_required' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.analysis_engine_versions
    WHERE id = p_engine_version_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'active_engine_version_required' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.ingredient_reanalysis_queue (
    product_id, engine_version_id, reason
  )
  SELECT DISTINCT label_sets.product_id, p_engine_version_id, p_reason
  FROM public.product_ingredient_label_sets AS label_sets
  JOIN public.product_ingredient_label_items AS label_items
    ON label_items.label_set_id = label_sets.id
  WHERE label_sets.is_current = TRUE
    AND (
      label_items.normalized_ingredient_text = ANY(COALESCE(p_normalized_terms, '{}'::TEXT[]))
      OR label_items.canonical_ingredient_id = ANY(COALESCE(p_canonical_ingredient_ids, '{}'::UUID[]))
    )
  ON CONFLICT (product_id, engine_version_id) DO UPDATE SET
    reason = EXCLUDED.reason,
    status = 'pending',
    attempt_count = 0,
    lease_expires_at = NULL,
    error_code = NULL,
    completed_at = NULL,
    updated_at = NOW()
  WHERE public.ingredient_reanalysis_queue.status = 'failed'
    OR EXCLUDED.reason LIKE 'ingredient_review:%'
    OR EXCLUDED.reason LIKE 'rule_change:%'
    OR NOT EXISTS (
      SELECT 1
      FROM public.product_ingredient_analysis_results AS analysis_result
      JOIN public.product_ingredient_label_sets AS current_label
        ON current_label.product_id = EXCLUDED.product_id
       AND current_label.is_current = TRUE
      WHERE analysis_result.product_id = EXCLUDED.product_id
        AND analysis_result.engine_version_id = EXCLUDED.engine_version_id
        AND analysis_result.label_set_id = current_label.id
    );
  GET DIAGNOSTICS v_count = ROW_COUNT;

  UPDATE public.products
  SET analysis_status = 'partial'
  WHERE id IN (
    SELECT product_id FROM public.ingredient_reanalysis_queue
    WHERE engine_version_id = p_engine_version_id
      AND status IN ('pending', 'processing', 'failed')
  );
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_canonical_ingredient_review(
  p_review_queue_id UUID,
  p_canonical_ingredient_id UUID,
  p_alias_text TEXT,
  p_evidence_source_id UUID,
  p_resolution_note TEXT,
  p_actor TEXT,
  p_engine_version_id UUID
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_normalized TEXT;
  v_enqueued INTEGER;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'service_role_required' USING ERRCODE = '42501';
  END IF;
  IF BTRIM(COALESCE(p_resolution_note, '')) = '' OR BTRIM(COALESCE(p_actor, '')) = '' THEN
    RAISE EXCEPTION 'review_note_and_actor_required' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.canonical_ingredient_evidence
    WHERE canonical_ingredient_id = p_canonical_ingredient_id
      AND source_id = p_evidence_source_id
      AND reviewed_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'reviewed_evidence_required' USING ERRCODE = '22023';
  END IF;

  SELECT normalized_text INTO v_normalized
  FROM public.canonical_ingredient_review_queue
  WHERE id = p_review_queue_id AND status IN ('pending', 'in_review')
  FOR UPDATE;
  IF v_normalized IS NULL THEN
    RAISE EXCEPTION 'review_queue_item_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.canonical_ingredient_aliases
    WHERE normalized_alias = v_normalized
      AND canonical_ingredient_id <> p_canonical_ingredient_id
  ) THEN
    RAISE EXCEPTION 'alias_collision' USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.canonical_ingredient_aliases (
    canonical_ingredient_id, alias_text, normalized_alias, language_code, alias_type
  ) VALUES (
    p_canonical_ingredient_id, p_alias_text, v_normalized, 'ko', 'label'
  ) ON CONFLICT (normalized_alias, language_code) DO NOTHING;

  UPDATE public.product_ingredient_label_items AS label_items
  SET canonical_ingredient_id = p_canonical_ingredient_id,
      match_status = 'matched',
      match_confidence = 1,
      updated_at = NOW()
  FROM public.product_ingredient_label_sets AS label_sets
  WHERE label_items.label_set_id = label_sets.id
    AND label_sets.is_current = TRUE
    AND label_items.normalized_ingredient_text = v_normalized;

  UPDATE public.canonical_ingredient_review_queue
  SET status = 'resolved',
      resolution_ingredient_id = p_canonical_ingredient_id,
      resolution_note = p_resolution_note,
      resolved_at = NOW(),
      updated_at = NOW()
  WHERE id = p_review_queue_id;

  SELECT public.enqueue_ingredient_reanalysis(
    ARRAY[v_normalized], ARRAY[]::UUID[],
    p_engine_version_id, 'ingredient_review:' || p_review_queue_id::TEXT
  ) INTO v_enqueued;

  INSERT INTO public.admin_audit_log (
    actor, action, target_table, target_id, detail
  ) VALUES (
    p_actor, 'resolveCanonicalIngredient', 'canonical_ingredient_review_queue',
    p_review_queue_id::TEXT,
    jsonb_build_object(
      'canonicalIngredientId', p_canonical_ingredient_id,
      'evidenceSourceId', p_evidence_source_id,
      'engineVersionId', p_engine_version_id,
      'enqueuedProducts', v_enqueued,
      'resolutionNote', p_resolution_note
    )
  );
  RETURN v_enqueued;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_ingredient_reanalysis_batch(
  p_limit INTEGER DEFAULT 100,
  p_lease_seconds INTEGER DEFAULT 300
) RETURNS SETOF public.ingredient_reanalysis_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'service_role_required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  WITH candidates AS (
    SELECT id
    FROM public.ingredient_reanalysis_queue
    WHERE attempt_count < 5
      AND (
        status IN ('pending', 'failed')
        OR (status = 'processing' AND lease_expires_at < NOW())
      )
    ORDER BY created_at, id
    LIMIT LEAST(GREATEST(p_limit, 1), 100)
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.ingredient_reanalysis_queue AS queue
  SET status = 'processing',
      attempt_count = queue.attempt_count + 1,
      lease_expires_at = NOW() + MAKE_INTERVAL(secs => LEAST(GREATEST(p_lease_seconds, 30), 900)),
      error_code = NULL,
      updated_at = NOW()
  FROM candidates
  WHERE queue.id = candidates.id
  RETURNING queue.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_ingredient_reanalysis(
  p_queue_id UUID,
  p_label_set_id UUID,
  p_readiness_status TEXT,
  p_result JSONB,
  p_result_checksum TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_product_id UUID;
  v_engine_version_id UUID;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'service_role_required' USING ERRCODE = '42501';
  END IF;
  IF p_readiness_status NOT IN ('unavailable', 'partial', 'ready', 'blocked') THEN
    RAISE EXCEPTION 'invalid_readiness_status' USING ERRCODE = '22023';
  END IF;

  SELECT product_id, engine_version_id
    INTO v_product_id, v_engine_version_id
  FROM public.ingredient_reanalysis_queue
  WHERE id = p_queue_id AND status = 'processing'
  FOR UPDATE;
  IF v_product_id IS NULL THEN
    RAISE EXCEPTION 'queue_job_not_claimed' USING ERRCODE = 'P0002';
  END IF;

  IF p_label_set_id IS NULL THEN
    IF EXISTS (
      SELECT 1
      FROM public.product_ingredient_label_sets
      WHERE product_id = v_product_id AND is_current = TRUE
    ) THEN
      RAISE EXCEPTION 'stale_label_set' USING ERRCODE = '40001';
    END IF;
  ELSE
    IF NOT EXISTS (
      SELECT 1
      FROM public.product_ingredient_label_sets
      WHERE id = p_label_set_id
        AND product_id = v_product_id
        AND is_current = TRUE
    ) THEN
      RAISE EXCEPTION 'stale_label_set' USING ERRCODE = '40001';
    END IF;
  END IF;

  INSERT INTO public.product_ingredient_analysis_results (
    product_id, engine_version_id, label_set_id, readiness_status,
    result, result_checksum, analyzed_at
  ) VALUES (
    v_product_id, v_engine_version_id, p_label_set_id, p_readiness_status,
    p_result, p_result_checksum, NOW()
  )
  ON CONFLICT (product_id, engine_version_id) DO UPDATE SET
    label_set_id = EXCLUDED.label_set_id,
    readiness_status = EXCLUDED.readiness_status,
    result = EXCLUDED.result,
    result_checksum = EXCLUDED.result_checksum,
    analyzed_at = NOW(),
    updated_at = NOW();

  UPDATE public.products
  SET analysis_status = p_readiness_status
  WHERE id = v_product_id;

  UPDATE public.ingredient_reanalysis_queue
  SET status = 'completed', lease_expires_at = NULL, error_code = NULL,
      completed_at = NOW(), updated_at = NOW()
  WHERE id = p_queue_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fail_ingredient_reanalysis(
  p_queue_id UUID,
  p_error_code TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'service_role_required' USING ERRCODE = '42501';
  END IF;
  UPDATE public.ingredient_reanalysis_queue
  SET status = 'failed', lease_expires_at = NULL,
      error_code = LEFT(COALESCE(NULLIF(p_error_code, ''), 'analysis_failed'), 100),
      updated_at = NOW()
  WHERE id = p_queue_id AND status = 'processing';
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_ingredient_reanalysis(TEXT[], UUID[], UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.resolve_canonical_ingredient_review(UUID, UUID, TEXT, UUID, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_ingredient_reanalysis_batch(INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_ingredient_reanalysis(UUID, UUID, TEXT, JSONB, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fail_ingredient_reanalysis(UUID, TEXT) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.enqueue_ingredient_reanalysis(TEXT[], UUID[], UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.resolve_canonical_ingredient_review(UUID, UUID, TEXT, UUID, TEXT, TEXT, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_ingredient_reanalysis_batch(INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_ingredient_reanalysis(UUID, UUID, TEXT, JSONB, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_ingredient_reanalysis(UUID, TEXT) TO service_role;

COMMIT;
