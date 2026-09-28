BEGIN;

INSERT INTO public.app_settings (key, value, is_public, description)
VALUES (
  'community_scan_enabled',
  'true'::JSONB,
  TRUE,
  '미등록 제품의 사용자 스캔 제출 허용 여부.'
)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.consume_scan_rate_limit(
  p_bucket_digest TEXT,
  p_scope TEXT,
  p_window_start TIMESTAMPTZ,
  p_expires_at TIMESTAMPTZ,
  p_limit INTEGER
)
RETURNS BOOLEAN
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  next_count INTEGER;
BEGIN
  IF p_bucket_digest !~ '^[a-f0-9]{64}$'
    OR p_scope NOT IN ('user', 'ip')
    OR p_window_start IS NULL
    OR p_expires_at <= p_window_start
    OR p_limit < 1
    OR p_limit > 10000
  THEN
    RAISE EXCEPTION 'invalid scan rate-limit parameters'
      USING ERRCODE = '22023';
  END IF;

  DELETE FROM public.scan_rate_limit_buckets
  WHERE expires_at < NOW();

  INSERT INTO public.scan_rate_limit_buckets (
    bucket_digest,
    scope,
    window_start,
    request_count,
    expires_at,
    updated_at
  ) VALUES (
    p_bucket_digest,
    p_scope,
    p_window_start,
    1,
    p_expires_at,
    NOW()
  )
  ON CONFLICT (bucket_digest, scope, window_start) DO UPDATE
  SET
    request_count = scan_rate_limit_buckets.request_count + 1,
    expires_at = GREATEST(scan_rate_limit_buckets.expires_at, EXCLUDED.expires_at),
    updated_at = NOW()
  RETURNING request_count INTO next_count;

  RETURN next_count <= p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_scan_rate_limit(
  TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.consume_scan_rate_limit(
  TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER
) TO service_role;

COMMIT;
