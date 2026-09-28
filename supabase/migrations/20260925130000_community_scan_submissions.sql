BEGIN;

CREATE OR REPLACE FUNCTION public.scan_evidence_paths_valid(
  p_user_id UUID,
  p_submission_id UUID,
  p_category TEXT,
  p_paths TEXT[]
)
RETURNS BOOLEAN
LANGUAGE SQL
IMMUTABLE
SET search_path = ''
AS $$
  SELECT COALESCE(
    BOOL_AND(
      object_path ~ (
        '^' || p_user_id::TEXT || '/' || p_submission_id::TEXT || '/' ||
        p_category || '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.webp$'
      )
    ),
    TRUE
  )
  FROM UNNEST(COALESCE(p_paths, ARRAY[]::TEXT[])) AS object_path;
$$;

REVOKE ALL ON FUNCTION public.scan_evidence_paths_valid(UUID, UUID, TEXT, TEXT[])
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.scan_evidence_paths_valid(UUID, UUID, TEXT, TEXT[])
  TO authenticated;

CREATE TABLE IF NOT EXISTS public.product_scan_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',
    'uploaded',
    'processing',
    'needs_confirmation',
    'submitted',
    'published',
    'needs_review',
    'failed',
    'cancelled',
    'rejected'
  )),
  scanned_barcode TEXT,
  front_image_paths TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ingredient_image_paths TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  nutrition_image_paths TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  extraction_version TEXT,
  extracted_data JSONB NOT NULL DEFAULT '{}'::JSONB,
  confirmed_data JSONB NOT NULL DEFAULT '{}'::JSONB,
  field_confidence JSONB NOT NULL DEFAULT '{}'::JSONB,
  processing_error_code TEXT,
  resolved_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT product_scan_front_paths_valid CHECK (
    public.scan_evidence_paths_valid(user_id, id, 'front', front_image_paths)
  ),
  CONSTRAINT product_scan_ingredient_paths_valid CHECK (
    public.scan_evidence_paths_valid(user_id, id, 'ingredient', ingredient_image_paths)
  ),
  CONSTRAINT product_scan_nutrition_paths_valid CHECK (
    public.scan_evidence_paths_valid(user_id, id, 'nutrition', nutrition_image_paths)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS product_scan_submissions_processing_key
  ON public.product_scan_submissions (id, user_id);

CREATE INDEX IF NOT EXISTS idx_product_scan_submissions_user_created
  ON public.product_scan_submissions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_scan_submissions_status
  ON public.product_scan_submissions (status, updated_at);

CREATE OR REPLACE FUNCTION public.set_product_scan_submission_updated_at()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_product_scan_submission_updated_at()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_product_scan_submissions_updated_at
  ON public.product_scan_submissions;
CREATE TRIGGER trg_product_scan_submissions_updated_at
  BEFORE UPDATE ON public.product_scan_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_product_scan_submission_updated_at();

ALTER TABLE public.product_observations
  ADD COLUMN IF NOT EXISTS scan_submission_id UUID
    REFERENCES public.product_scan_submissions(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS product_observations_submission_source_key
  ON public.product_observations (scan_submission_id, source_type)
  WHERE scan_submission_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.scan_processing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL
    REFERENCES public.product_scan_submissions(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL CHECK (CHAR_LENGTH(BTRIM(event_name)) BETWEEN 1 AND 80),
  duration_ms INTEGER CHECK (duration_ms IS NULL OR duration_ms >= 0),
  safe_error_code TEXT CHECK (
    safe_error_code IS NULL OR CHAR_LENGTH(BTRIM(safe_error_code)) BETWEEN 1 AND 80
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scan_processing_events_submission
  ON public.scan_processing_events (submission_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.scan_rate_limit_buckets (
  bucket_digest TEXT NOT NULL CHECK (bucket_digest ~ '^[a-f0-9]{64}$'),
  scope TEXT NOT NULL CHECK (scope IN ('user', 'ip')),
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (bucket_digest, scope, window_start),
  CHECK (expires_at > window_start)
);

CREATE INDEX IF NOT EXISTS idx_scan_rate_limit_buckets_expires_at
  ON public.scan_rate_limit_buckets (expires_at);

ALTER TABLE public.product_scan_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_processing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_rate_limit_buckets ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.product_scan_submissions FROM anon, authenticated;
REVOKE ALL ON TABLE public.product_observations FROM anon, authenticated;
REVOKE ALL ON TABLE public.scan_processing_events FROM anon, authenticated;
REVOKE ALL ON TABLE public.scan_rate_limit_buckets FROM anon, authenticated;

GRANT SELECT ON TABLE public.product_scan_submissions TO authenticated;
GRANT INSERT (
  user_id,
  scanned_barcode,
  status,
  front_image_paths,
  ingredient_image_paths,
  nutrition_image_paths,
  confirmed_data
) ON public.product_scan_submissions TO authenticated;
GRANT UPDATE (
  status,
  front_image_paths,
  ingredient_image_paths,
  nutrition_image_paths,
  confirmed_data
) ON public.product_scan_submissions TO authenticated;

DROP POLICY IF EXISTS product_scan_submissions_owner_select
  ON public.product_scan_submissions;
CREATE POLICY product_scan_submissions_owner_select
  ON public.product_scan_submissions
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    AND status NOT IN ('published', 'rejected')
  );

DROP POLICY IF EXISTS product_scan_submissions_owner_insert
  ON public.product_scan_submissions;
CREATE POLICY product_scan_submissions_owner_insert
  ON public.product_scan_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'draft'
  );

DROP POLICY IF EXISTS product_scan_submissions_owner_update
  ON public.product_scan_submissions;
CREATE POLICY product_scan_submissions_owner_update
  ON public.product_scan_submissions
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND status IN ('draft', 'uploaded', 'needs_confirmation', 'failed')
  )
  WITH CHECK (
    user_id = auth.uid()
    AND status IN ('draft', 'uploaded', 'needs_confirmation', 'submitted', 'failed', 'cancelled')
  );

-- Private evidence objects use:
-- <user-id>/<submission-id>/<category>/<uuid>.webp
-- Upload access is issued only through short-lived service-created signed URLs.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-scan-evidence',
  'product-scan-evidence',
  FALSE,
  8388608,
  ARRAY['image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = FALSE,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

COMMIT;
