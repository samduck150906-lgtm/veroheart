-- SANDBOX ONLY.
-- DO NOT RUN ON PRODUCTION.
-- Forbidden production project ref: nlutpmjloryqdomgbqrr.
-- Marker-based rollback for Phase 2 low-risk alias sandbox rehearsal.
-- It refuses to run unless the operator sets app.phase2_alias_sandbox_rehearsal_confirm in a sandbox session.
-- DELETE statements and final summary are intentionally separate to avoid PostgreSQL data-modifying CTE snapshot issues.

BEGIN;

DO $$
BEGIN
  IF current_setting('app.phase2_alias_sandbox_rehearsal_confirm', true)
     IS DISTINCT FROM 'SANDBOX_ONLY_CONFIRMED_NOT_PRODUCTION' THEN
    RAISE EXCEPTION
      'Refusing to run Phase 2 alias sandbox rollback: set app.phase2_alias_sandbox_rehearsal_confirm only in a sandbox project. Do not run on production nlutpmjloryqdomgbqrr.';
  END IF;
END $$;

CREATE TEMP TABLE phase2_alias_rollback_approved_canonical_candidates (
  normalized_key text PRIMARY KEY
) ON COMMIT DROP;

INSERT INTO phase2_alias_rollback_approved_canonical_candidates (normalized_key)
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
  ('혼합토코페롤');

CREATE TEMP TABLE phase2_alias_rollback_marked_canonical
ON COMMIT DROP
AS
SELECT ci.id, ci.normalized_key
FROM public.canonical_ingredients ci
JOIN phase2_alias_rollback_approved_canonical_candidates acc
  ON acc.normalized_key = ci.normalized_key
WHERE ci.category = 'phase2_low_risk_alias_rehearsal'
   OR ci.description = 'SANDBOX ONLY Phase 2 low-risk alias rehearsal marker. DO NOT RUN ON PRODUCTION nlutpmjloryqdomgbqrr.';

CREATE TEMP TABLE phase2_alias_rollback_alias_delete_targets
ON COMMIT DROP
AS
SELECT cia.id
FROM public.canonical_ingredient_aliases cia
JOIN phase2_alias_rollback_marked_canonical mc
  ON mc.id = cia.canonical_ingredient_id;

CREATE TEMP TABLE phase2_alias_rollback_canonical_delete_targets
ON COMMIT DROP
AS
SELECT id
FROM phase2_alias_rollback_marked_canonical;

CREATE TEMP TABLE phase2_alias_rollback_marker_delete_targets
ON COMMIT DROP
AS
SELECT aev.id
FROM public.analysis_engine_versions aev
WHERE aev.version = 'sandbox-phase2-low-risk-alias-rehearsal-2026-07-11'
  AND aev.description = 'SANDBOX ONLY marker for Phase 2 low-risk alias rehearsal. DO NOT RUN ON PRODUCTION nlutpmjloryqdomgbqrr.';

DELETE FROM public.canonical_ingredient_aliases cia
USING phase2_alias_rollback_alias_delete_targets target
WHERE cia.id = target.id;

DELETE FROM public.canonical_ingredients ci
USING phase2_alias_rollback_canonical_delete_targets target
WHERE ci.id = target.id;

DELETE FROM public.analysis_engine_versions aev
USING phase2_alias_rollback_marker_delete_targets target
WHERE aev.id = target.id;

SELECT
  'phase2_alias_sandbox_rollback' AS section,
  CASE WHEN remaining_marked_canonical_count = 0 THEN 'PASS' ELSE 'WARN' END AS severity,
  deleted_alias_count,
  deleted_canonical_count,
  deleted_marker_count,
  remaining_marked_canonical_count,
  CASE
    WHEN remaining_marked_canonical_count = 0
    THEN 'SANDBOX_REHEARSAL_ROLLED_BACK'
    ELSE 'SANDBOX_REHEARSAL_ROLLBACK_REVIEW_REQUIRED'
  END AS final_assessment
FROM (
  SELECT
    (SELECT COUNT(*) FROM phase2_alias_rollback_alias_delete_targets) AS deleted_alias_count,
    (SELECT COUNT(*) FROM phase2_alias_rollback_canonical_delete_targets) AS deleted_canonical_count,
    (SELECT COUNT(*) FROM phase2_alias_rollback_marker_delete_targets) AS deleted_marker_count,
    (
      SELECT COUNT(*)
      FROM public.canonical_ingredients ci
      JOIN phase2_alias_rollback_approved_canonical_candidates acc
        ON acc.normalized_key = ci.normalized_key
      WHERE ci.category = 'phase2_low_risk_alias_rehearsal'
         OR ci.description = 'SANDBOX ONLY Phase 2 low-risk alias rehearsal marker. DO NOT RUN ON PRODUCTION nlutpmjloryqdomgbqrr.'
    ) AS remaining_marked_canonical_count
) summary;

COMMIT;
