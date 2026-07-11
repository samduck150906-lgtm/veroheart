-- SANDBOX ONLY.
-- DO NOT RUN ON PRODUCTION.
-- Forbidden production project ref: nlutpmjloryqdomgbqrr.
-- Marker-based rollback for Phase 2 low-risk alias sandbox rehearsal.

BEGIN;

WITH
approved_canonical_candidates(normalized_key) AS (
  VALUES
    ('건조비트펄프'),
    ('오메가3지방산'),
    ('감자전분'),
    ('건조맥주효모'),
    ('녹차추출물'),
    ('맥주효모'),
    ('비타민e'),
    ('비트펄프'),
    ('오메가6지방산'),
    ('코코넛오일'),
    ('타피오카전분'),
    ('토마토박'),
    ('프락토올리고당'),
    ('혼합토코페롤')
),
marked_canonical AS (
  SELECT ci.id, ci.normalized_key
  FROM public.canonical_ingredients ci
  JOIN approved_canonical_candidates acc
    ON acc.normalized_key = ci.normalized_key
  WHERE ci.category = 'phase2_low_risk_alias_rehearsal'
     OR ci.description = 'SANDBOX ONLY Phase 2 low-risk alias rehearsal marker. DO NOT RUN ON PRODUCTION nlutpmjloryqdomgbqrr.'
),
deleted_aliases AS (
  DELETE FROM public.canonical_ingredient_aliases cia
  USING marked_canonical mc
  WHERE cia.canonical_ingredient_id = mc.id
  RETURNING cia.id
),
deleted_canonical AS (
  DELETE FROM public.canonical_ingredients ci
  USING marked_canonical mc
  WHERE ci.id = mc.id
  RETURNING ci.id
),
deleted_marker AS (
  DELETE FROM public.analysis_engine_versions aev
  WHERE aev.version = 'sandbox-phase2-low-risk-alias-rehearsal-2026-07-11'
    AND aev.description = 'SANDBOX ONLY marker for Phase 2 low-risk alias rehearsal. DO NOT RUN ON PRODUCTION nlutpmjloryqdomgbqrr.'
  RETURNING aev.id
),
remaining_marked AS (
  SELECT COUNT(*) AS row_count
  FROM public.canonical_ingredients ci
  JOIN approved_canonical_candidates acc
    ON acc.normalized_key = ci.normalized_key
  WHERE ci.category = 'phase2_low_risk_alias_rehearsal'
     OR ci.description = 'SANDBOX ONLY Phase 2 low-risk alias rehearsal marker. DO NOT RUN ON PRODUCTION nlutpmjloryqdomgbqrr.'
)
SELECT
  'phase2_alias_sandbox_rollback' AS section,
  CASE WHEN (SELECT row_count FROM remaining_marked) = 0 THEN 'PASS' ELSE 'WARN' END AS severity,
  (SELECT COUNT(*) FROM deleted_aliases) AS deleted_alias_count,
  (SELECT COUNT(*) FROM deleted_canonical) AS deleted_canonical_count,
  (SELECT COUNT(*) FROM deleted_marker) AS deleted_marker_count,
  (SELECT row_count FROM remaining_marked) AS remaining_marked_canonical_count,
  CASE
    WHEN (SELECT row_count FROM remaining_marked) = 0
    THEN 'SANDBOX_REHEARSAL_ROLLED_BACK'
    ELSE 'SANDBOX_REHEARSAL_ROLLBACK_REVIEW_REQUIRED'
  END AS final_assessment;

COMMIT;
