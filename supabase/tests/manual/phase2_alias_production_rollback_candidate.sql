-- PRODUCTION CANDIDATE ROLLBACK SQL.
-- DO NOT RUN WITHOUT EXPLICIT HUMAN APPROVAL.
-- Confirm production project ref in Supabase UI: nlutpmjloryqdomgbqrr.
-- This file does not set confirmation values internally.
-- Marker-limited rollback only.

BEGIN;

DO $$
BEGIN
  IF current_setting('app.phase2_alias_production_project_ref_confirm', true)
     IS DISTINCT FROM 'nlutpmjloryqdomgbqrr'
     OR current_setting('app.phase2_alias_production_migration_confirm', true)
     IS DISTINCT FROM 'PRODUCTION_ALIAS_MIGRATION_EXPLICITLY_APPROVED' THEN
    RAISE EXCEPTION
      'Refusing Phase 2 low-risk alias production candidate rollback: confirm production project ref nlutpmjloryqdomgbqrr and explicit approval settings in this SQL session.';
  END IF;
END $$;

CREATE TEMP TABLE phase2_alias_production_rollback_candidates (
  normalized_key text PRIMARY KEY,
  canonical_name_ko text NOT NULL
) ON COMMIT DROP;

INSERT INTO phase2_alias_production_rollback_candidates (
  normalized_key,
  canonical_name_ko
)
VALUES
  ('건조비트펄프', '건조 비트 펄프'),
  ('오메가3지방산', '오메가 3 지방산'),
  ('감자전분', '감자 전분'),
  ('건조맥주효모', '건조 맥주 효모'),
  ('녹차추출물', '녹차 추출물'),
  ('맥주효모', '맥주 효모'),
  ('비타민e', '비타민 E'),
  ('비트펄프', '비트 펄프'),
  ('오메가6지방산', '오메가 6 지방산'),
  ('코코넛오일', '코코넛 오일'),
  ('타피오카전분', '타피오카 전분'),
  ('토마토박', '토마토 박'),
  ('프락토올리고당', '프락토올리고당'),
  ('혼합토코페롤', '혼합 토코페롤');

CREATE TEMP TABLE phase2_alias_production_rollback_alias_candidates (
  normalized_key text NOT NULL,
  alias_text text NOT NULL,
  normalized_alias text NOT NULL,
  is_preferred boolean NOT NULL,
  PRIMARY KEY (normalized_alias)
) ON COMMIT DROP;

INSERT INTO phase2_alias_production_rollback_alias_candidates (
  normalized_key,
  alias_text,
  normalized_alias,
  is_preferred
)
VALUES
  ('건조비트펄프', '건조 비트 펄프', '건조 비트 펄프', true),
  ('건조비트펄프', '건조 비트펄프', '건조 비트펄프', false),
  ('건조비트펄프', '건조비트펄프', '건조비트펄프', false),
  ('오메가3지방산', '오메가 3 지방산', '오메가 3 지방산', true),
  ('오메가3지방산', '오메가-3 지방산', '오메가-3 지방산', false),
  ('오메가3지방산', '오메가3 지방산', '오메가3 지방산', false),
  ('감자전분', '감자 전분', '감자 전분', true),
  ('감자전분', '감자전분', '감자전분', false),
  ('건조맥주효모', '건조 맥주 효모', '건조 맥주 효모', true),
  ('건조맥주효모', '건조 맥주효모', '건조 맥주효모', false),
  ('녹차추출물', '녹차 추출물', '녹차 추출물', true),
  ('녹차추출물', '녹차추출물', '녹차추출물', false),
  ('맥주효모', '맥주 효모', '맥주 효모', true),
  ('맥주효모', '맥주효모', '맥주효모', false),
  ('비타민e', '비타민 E', '비타민 E', true),
  ('비타민e', '비타민E', '비타민E', false),
  ('비트펄프', '비트 펄프', '비트 펄프', true),
  ('비트펄프', '비트펄프', '비트펄프', false),
  ('오메가6지방산', '오메가 6 지방산', '오메가 6 지방산', true),
  ('오메가6지방산', '오메가-6 지방산', '오메가-6 지방산', false),
  ('코코넛오일', '코코넛 오일', '코코넛 오일', true),
  ('코코넛오일', '코코넛오일', '코코넛오일', false),
  ('타피오카전분', '타피오카 전분', '타피오카 전분', true),
  ('타피오카전분', '타피오카전분', '타피오카전분', false),
  ('토마토박', '토마토 박', '토마토 박', true),
  ('토마토박', '토마토박', '토마토박', false),
  ('프락토올리고당', '프락토올리고당', '프락토올리고당', true),
  ('프락토올리고당', '프락토-올리고당', '프락토-올리고당', false),
  ('혼합토코페롤', '혼합 토코페롤', '혼합 토코페롤', true),
  ('혼합토코페롤', '혼합토코페롤', '혼합토코페롤', false);

CREATE TEMP TABLE phase2_alias_production_rollback_analysis_marker_conflicts
ON COMMIT DROP
AS
SELECT aev.id
FROM public.analysis_engine_versions aev
WHERE aev.version = 'phase2-low-risk-alias-seed-2026-07-12'
  AND NOT (
    aev.status = 'draft'
    AND aev.description = 'Production candidate marker for Phase 2 low-risk alias seed. Sandbox verified in PR #23. No risk/scoring semantics.'
    AND aev.ruleset_checksum = 'phase2-low-risk-alias-seed-2026-07-12'
  );

CREATE TEMP TABLE phase2_alias_production_rollback_marker_owned_canonical
ON COMMIT DROP
AS
SELECT ci.id, ci.normalized_key
FROM public.canonical_ingredients ci
JOIN phase2_alias_production_rollback_candidates candidate
  ON candidate.normalized_key = ci.normalized_key
 AND candidate.canonical_name_ko = ci.canonical_name_ko
WHERE ci.category = 'phase2_low_risk_alias_seed_2026_07_12'
  AND ci.description = 'Production candidate Phase 2 low-risk alias seed. Sandbox verified in PR #23. No risk/scoring semantics.'
  AND ci.status = 'draft';

CREATE TEMP TABLE phase2_alias_production_rollback_forbidden_related_rows
ON COMMIT DROP
AS
SELECT 'canonical_analysis_rules' AS relation_name, car.id::text AS related_id
FROM public.canonical_analysis_rules car
JOIN phase2_alias_production_rollback_marker_owned_canonical moc
  ON moc.id = car.canonical_ingredient_id
UNION ALL
SELECT 'canonical_ingredient_allergen_map', ciam.canonical_ingredient_id::text || ':' || ciam.allergen_id::text || ':' || ciam.relationship_type
FROM public.canonical_ingredient_allergen_map ciam
JOIN phase2_alias_production_rollback_marker_owned_canonical moc
  ON moc.id = ciam.canonical_ingredient_id
UNION ALL
SELECT 'canonical_ingredient_evidence', cie.id::text
FROM public.canonical_ingredient_evidence cie
JOIN phase2_alias_production_rollback_marker_owned_canonical moc
  ON moc.id = cie.canonical_ingredient_id
UNION ALL
SELECT 'product_ingredient_label_items', pili.id::text
FROM public.product_ingredient_label_items pili
JOIN phase2_alias_production_rollback_marker_owned_canonical moc
  ON moc.id = pili.canonical_ingredient_id
UNION ALL
SELECT 'product_ingredient_label_sets', pils.id::text
FROM public.product_ingredient_label_sets pils
JOIN public.product_ingredient_label_items pili
  ON pili.label_set_id = pils.id
JOIN phase2_alias_production_rollback_marker_owned_canonical moc
  ON moc.id = pili.canonical_ingredient_id
UNION ALL
SELECT 'canonical_ingredient_review_queue', cirq.id::text
FROM public.canonical_ingredient_review_queue cirq
JOIN phase2_alias_production_rollback_marker_owned_canonical moc
  ON cirq.resolution_ingredient_id = moc.id
  OR moc.id = ANY(cirq.candidate_ingredient_ids);

CREATE TEMP TABLE phase2_alias_production_rollback_alias_delete_targets
ON COMMIT DROP
AS
SELECT cia.id
FROM public.canonical_ingredient_aliases cia
JOIN phase2_alias_production_rollback_marker_owned_canonical moc
  ON moc.id = cia.canonical_ingredient_id
JOIN phase2_alias_production_rollback_alias_candidates aac
  ON aac.normalized_key = moc.normalized_key
 AND aac.alias_text = cia.alias_text
 AND aac.normalized_alias = cia.normalized_alias
 AND aac.is_preferred = cia.is_preferred
WHERE cia.language_code = 'ko'
  AND cia.alias_type = 'label';

CREATE TEMP TABLE phase2_alias_production_rollback_non_seed_marker_owned_aliases
ON COMMIT DROP
AS
SELECT cia.id
FROM public.canonical_ingredient_aliases cia
JOIN phase2_alias_production_rollback_marker_owned_canonical moc
  ON moc.id = cia.canonical_ingredient_id
LEFT JOIN phase2_alias_production_rollback_alias_delete_targets target
  ON target.id = cia.id
WHERE target.id IS NULL;

CREATE TEMP TABLE phase2_alias_production_rollback_canonical_delete_targets
ON COMMIT DROP
AS
SELECT id
FROM phase2_alias_production_rollback_marker_owned_canonical;

CREATE TEMP TABLE phase2_alias_production_rollback_marker_delete_targets
ON COMMIT DROP
AS
SELECT aev.id
FROM public.analysis_engine_versions aev
WHERE aev.version = 'phase2-low-risk-alias-seed-2026-07-12'
  AND aev.status = 'draft'
  AND aev.description = 'Production candidate marker for Phase 2 low-risk alias seed. Sandbox verified in PR #23. No risk/scoring semantics.'
  AND aev.ruleset_checksum = 'phase2-low-risk-alias-seed-2026-07-12';

DELETE FROM public.canonical_ingredient_aliases cia
USING phase2_alias_production_rollback_alias_delete_targets target
WHERE cia.id = target.id
  AND NOT EXISTS (
    SELECT 1
    FROM phase2_alias_production_rollback_analysis_marker_conflicts
  )
  AND NOT EXISTS (
    SELECT 1
    FROM phase2_alias_production_rollback_forbidden_related_rows
  )
  AND NOT EXISTS (
    SELECT 1
    FROM phase2_alias_production_rollback_non_seed_marker_owned_aliases
  );

DELETE FROM public.canonical_ingredients ci
USING phase2_alias_production_rollback_canonical_delete_targets target
WHERE ci.id = target.id
  AND NOT EXISTS (
    SELECT 1
    FROM phase2_alias_production_rollback_analysis_marker_conflicts
  )
  AND NOT EXISTS (
    SELECT 1
    FROM phase2_alias_production_rollback_forbidden_related_rows
  )
  AND NOT EXISTS (
    SELECT 1
    FROM phase2_alias_production_rollback_non_seed_marker_owned_aliases
  );

DELETE FROM public.analysis_engine_versions aev
USING phase2_alias_production_rollback_marker_delete_targets target
WHERE aev.id = target.id
  AND NOT EXISTS (
    SELECT 1
    FROM phase2_alias_production_rollback_analysis_marker_conflicts
  )
  AND NOT EXISTS (
    SELECT 1
    FROM phase2_alias_production_rollback_forbidden_related_rows
  )
  AND NOT EXISTS (
    SELECT 1
    FROM phase2_alias_production_rollback_non_seed_marker_owned_aliases
  );

SELECT
  'phase2_alias_production_rollback' AS section,
  CASE
    WHEN analysis_marker_conflict_count = 0
     AND forbidden_related_row_count = 0
     AND non_seed_marker_owned_alias_count = 0
     AND remaining_marker_owned_canonical_count = 0
    THEN 'PASS'
    ELSE 'BLOCK'
  END AS severity,
  deleted_alias_count,
  deleted_canonical_count,
  deleted_marker_count,
  remaining_marker_owned_canonical_count,
  analysis_marker_conflict_count,
  forbidden_related_row_count,
  non_seed_marker_owned_alias_count,
  CASE
    WHEN analysis_marker_conflict_count = 0
     AND forbidden_related_row_count = 0
     AND non_seed_marker_owned_alias_count = 0
     AND remaining_marker_owned_canonical_count = 0
    THEN 'PRODUCTION_ALIAS_SEED_ROLLED_BACK'
    ELSE 'PRODUCTION_ALIAS_SEED_ROLLBACK_BLOCKED'
  END AS final_assessment
FROM (
  SELECT
    (SELECT COUNT(*) FROM phase2_alias_production_rollback_analysis_marker_conflicts) AS analysis_marker_conflict_count,
    (SELECT COUNT(*) FROM phase2_alias_production_rollback_forbidden_related_rows) AS forbidden_related_row_count,
    (SELECT COUNT(*) FROM phase2_alias_production_rollback_non_seed_marker_owned_aliases) AS non_seed_marker_owned_alias_count,
    (
      SELECT COUNT(*)
      FROM phase2_alias_production_rollback_alias_delete_targets target
      LEFT JOIN public.canonical_ingredient_aliases cia
        ON cia.id = target.id
      WHERE cia.id IS NULL
    ) AS deleted_alias_count,
    (
      SELECT COUNT(*)
      FROM phase2_alias_production_rollback_canonical_delete_targets target
      LEFT JOIN public.canonical_ingredients ci
        ON ci.id = target.id
      WHERE ci.id IS NULL
    ) AS deleted_canonical_count,
    (
      SELECT COUNT(*)
      FROM phase2_alias_production_rollback_marker_delete_targets target
      LEFT JOIN public.analysis_engine_versions aev
        ON aev.id = target.id
      WHERE aev.id IS NULL
    ) AS deleted_marker_count,
    (
      SELECT COUNT(*)
      FROM public.canonical_ingredients ci
      JOIN phase2_alias_production_rollback_candidates candidate
        ON candidate.normalized_key = ci.normalized_key
       AND candidate.canonical_name_ko = ci.canonical_name_ko
      WHERE ci.category = 'phase2_low_risk_alias_seed_2026_07_12'
        AND ci.description = 'Production candidate Phase 2 low-risk alias seed. Sandbox verified in PR #23. No risk/scoring semantics.'
        AND ci.status = 'draft'
    ) AS remaining_marker_owned_canonical_count
) summary;

COMMIT;
