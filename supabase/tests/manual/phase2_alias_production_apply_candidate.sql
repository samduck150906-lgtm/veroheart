-- PRODUCTION CANDIDATE APPLY SQL.
-- DO NOT RUN WITHOUT EXPLICIT HUMAN APPROVAL.
-- Confirm production project ref in Supabase UI: nlutpmjloryqdomgbqrr.
-- This file does not set confirmation values internally.
-- Canonical and alias seed only: no risk rules, allergen mappings, evidence, product labels, review queue rows, runtime changes, or scoring changes.

BEGIN;

DO $$
BEGIN
  IF current_setting('app.phase2_alias_production_project_ref_confirm', true)
     IS DISTINCT FROM 'nlutpmjloryqdomgbqrr'
     OR current_setting('app.phase2_alias_production_migration_confirm', true)
     IS DISTINCT FROM 'PRODUCTION_ALIAS_MIGRATION_EXPLICITLY_APPROVED' THEN
    RAISE EXCEPTION
      'Refusing Phase 2 low-risk alias production candidate apply: confirm production project ref nlutpmjloryqdomgbqrr and explicit approval settings in this SQL session.';
  END IF;
END $$;

CREATE TEMP TABLE phase2_alias_production_approved_canonical_candidates (
  normalized_key text PRIMARY KEY,
  canonical_name_ko text NOT NULL
) ON COMMIT DROP;

INSERT INTO phase2_alias_production_approved_canonical_candidates (
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

CREATE TEMP TABLE phase2_alias_production_approved_alias_candidates (
  normalized_key text NOT NULL,
  alias_text text NOT NULL,
  normalized_alias text NOT NULL,
  is_preferred boolean NOT NULL,
  PRIMARY KEY (normalized_alias)
) ON COMMIT DROP;

INSERT INTO phase2_alias_production_approved_alias_candidates (
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

CREATE TEMP TABLE phase2_alias_production_analysis_marker_conflicts
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

CREATE TEMP TABLE phase2_alias_production_canonical_mismatches
ON COMMIT DROP
AS
SELECT ci.id
FROM public.canonical_ingredients ci
JOIN phase2_alias_production_approved_canonical_candidates acc
  ON acc.normalized_key = ci.normalized_key
WHERE (
    ci.category = 'phase2_low_risk_alias_seed_2026_07_12'
    OR ci.description = 'Production candidate Phase 2 low-risk alias seed. Sandbox verified in PR #23. No risk/scoring semantics.'
  )
  AND NOT (
    ci.canonical_name_ko = acc.canonical_name_ko
    AND ci.category = 'phase2_low_risk_alias_seed_2026_07_12'
    AND ci.description = 'Production candidate Phase 2 low-risk alias seed. Sandbox verified in PR #23. No risk/scoring semantics.'
    AND ci.status = 'draft'
  );

CREATE TEMP TABLE phase2_alias_production_preexisting_unmarked_canonical
ON COMMIT DROP
AS
SELECT ci.id, ci.normalized_key
FROM public.canonical_ingredients ci
JOIN phase2_alias_production_approved_canonical_candidates acc
  ON acc.normalized_key = ci.normalized_key
WHERE NOT (
  ci.category = 'phase2_low_risk_alias_seed_2026_07_12'
  OR ci.description = 'Production candidate Phase 2 low-risk alias seed. Sandbox verified in PR #23. No risk/scoring semantics.'
);

CREATE TEMP TABLE phase2_alias_production_preexisting_alias_conflicts
ON COMMIT DROP
AS
SELECT cia.id, cia.normalized_alias
FROM public.canonical_ingredient_aliases cia
JOIN phase2_alias_production_approved_alias_candidates aac
  ON aac.normalized_alias = cia.normalized_alias
 AND cia.language_code = 'ko'
LEFT JOIN public.canonical_ingredients ci
  ON ci.id = cia.canonical_ingredient_id
 AND ci.normalized_key = aac.normalized_key
 AND ci.canonical_name_ko = (
   SELECT acc.canonical_name_ko
   FROM phase2_alias_production_approved_canonical_candidates acc
   WHERE acc.normalized_key = aac.normalized_key
 )
 AND ci.category = 'phase2_low_risk_alias_seed_2026_07_12'
 AND ci.description = 'Production candidate Phase 2 low-risk alias seed. Sandbox verified in PR #23. No risk/scoring semantics.'
 AND ci.status = 'draft'
 AND cia.alias_text = aac.alias_text
 AND cia.alias_type = 'label'
 AND cia.is_preferred = aac.is_preferred
WHERE ci.id IS NULL;

CREATE TEMP TABLE phase2_alias_production_alias_mismatches
ON COMMIT DROP
AS
SELECT cia.id
FROM public.canonical_ingredient_aliases cia
JOIN public.canonical_ingredients ci
  ON ci.id = cia.canonical_ingredient_id
JOIN phase2_alias_production_approved_canonical_candidates acc
  ON acc.normalized_key = ci.normalized_key
JOIN phase2_alias_production_approved_alias_candidates aac
  ON aac.normalized_key = ci.normalized_key
 AND aac.normalized_alias = cia.normalized_alias
WHERE ci.canonical_name_ko = acc.canonical_name_ko
  AND ci.category = 'phase2_low_risk_alias_seed_2026_07_12'
  AND ci.description = 'Production candidate Phase 2 low-risk alias seed. Sandbox verified in PR #23. No risk/scoring semantics.'
  AND ci.status = 'draft'
  AND NOT (
    cia.alias_text = aac.alias_text
    AND cia.language_code = 'ko'
    AND cia.alias_type = 'label'
    AND cia.is_preferred = aac.is_preferred
  );

DO $$
DECLARE
  analysis_marker_conflict_count integer;
  canonical_mismatch_count integer;
  unmarked_canonical_conflict_count integer;
  alias_mismatch_count integer;
  alias_conflict_count integer;
BEGIN
  SELECT COUNT(*) INTO analysis_marker_conflict_count
  FROM phase2_alias_production_analysis_marker_conflicts;

  SELECT COUNT(*) INTO canonical_mismatch_count
  FROM phase2_alias_production_canonical_mismatches;

  SELECT COUNT(*) INTO unmarked_canonical_conflict_count
  FROM phase2_alias_production_preexisting_unmarked_canonical;

  SELECT COUNT(*) INTO alias_mismatch_count
  FROM phase2_alias_production_alias_mismatches;

  SELECT COUNT(*) INTO alias_conflict_count
  FROM phase2_alias_production_preexisting_alias_conflicts;

  IF analysis_marker_conflict_count > 0
     OR canonical_mismatch_count > 0
     OR unmarked_canonical_conflict_count > 0
     OR alias_mismatch_count > 0
     OR alias_conflict_count > 0 THEN
    RAISE EXCEPTION
      'Refusing Phase 2 low-risk alias production candidate apply: % marker conflicts, % canonical mismatches, % unmarked canonical conflicts, % alias mismatches, % alias conflicts found.',
      analysis_marker_conflict_count,
      canonical_mismatch_count,
      unmarked_canonical_conflict_count,
      alias_mismatch_count,
      alias_conflict_count;
  END IF;
END $$;

INSERT INTO public.analysis_engine_versions (
  version,
  status,
  description,
  ruleset_checksum
)
VALUES (
  'phase2-low-risk-alias-seed-2026-07-12',
  'draft',
  'Production candidate marker for Phase 2 low-risk alias seed. Sandbox verified in PR #23. No risk/scoring semantics.',
  'phase2-low-risk-alias-seed-2026-07-12'
)
ON CONFLICT (version) DO NOTHING;

INSERT INTO public.canonical_ingredients (
  canonical_name_ko,
  normalized_key,
  category,
  description,
  status
)
SELECT
  acc.canonical_name_ko,
  acc.normalized_key,
  'phase2_low_risk_alias_seed_2026_07_12',
  'Production candidate Phase 2 low-risk alias seed. Sandbox verified in PR #23. No risk/scoring semantics.',
  'draft'
FROM phase2_alias_production_approved_canonical_candidates acc
ON CONFLICT (normalized_key) DO NOTHING;

CREATE TEMP TABLE phase2_alias_production_marker_owned_canonical
ON COMMIT DROP
AS
SELECT ci.id, ci.normalized_key
FROM public.canonical_ingredients ci
JOIN phase2_alias_production_approved_canonical_candidates acc
  ON acc.normalized_key = ci.normalized_key
 AND acc.canonical_name_ko = ci.canonical_name_ko
WHERE ci.category = 'phase2_low_risk_alias_seed_2026_07_12'
  AND ci.description = 'Production candidate Phase 2 low-risk alias seed. Sandbox verified in PR #23. No risk/scoring semantics.'
  AND ci.status = 'draft';

INSERT INTO public.canonical_ingredient_aliases (
  canonical_ingredient_id,
  alias_text,
  normalized_alias,
  language_code,
  alias_type,
  is_preferred
)
SELECT
  moc.id,
  aac.alias_text,
  aac.normalized_alias,
  'ko',
  'label',
  aac.is_preferred
FROM phase2_alias_production_approved_alias_candidates aac
JOIN phase2_alias_production_marker_owned_canonical moc
  ON moc.normalized_key = aac.normalized_key
ON CONFLICT (normalized_alias, language_code) DO NOTHING;

SELECT
  'phase2_alias_production_apply' AS section,
  CASE
    WHEN analysis_marker_conflict_count = 0
     AND analysis_marker_exact_count = 1
     AND marker_owned_canonical_mismatch_count = 0
     AND marker_owned_alias_mismatch_count = 0
     AND preexisting_unmarked_canonical_count = 0
     AND preexisting_alias_conflict_count = 0
     AND inserted_or_available_canonical_count = expected_canonical_count
     AND inserted_or_available_alias_count = expected_alias_count
    THEN 'PASS'
    ELSE 'BLOCK'
  END AS severity,
  analysis_marker_exact_count,
  analysis_marker_conflict_count,
  expected_canonical_count,
  inserted_or_available_canonical_count,
  marker_owned_canonical_mismatch_count,
  expected_alias_count,
  inserted_or_available_alias_count,
  marker_owned_alias_mismatch_count,
  preexisting_unmarked_canonical_count,
  preexisting_alias_conflict_count,
  CASE
    WHEN analysis_marker_conflict_count = 0
     AND analysis_marker_exact_count = 1
     AND marker_owned_canonical_mismatch_count = 0
     AND marker_owned_alias_mismatch_count = 0
     AND preexisting_unmarked_canonical_count = 0
     AND preexisting_alias_conflict_count = 0
     AND inserted_or_available_canonical_count = expected_canonical_count
     AND inserted_or_available_alias_count = expected_alias_count
    THEN 'PRODUCTION_ALIAS_SEED_READY_FOR_VERIFY'
    ELSE 'PRODUCTION_ALIAS_SEED_REVIEW_REQUIRED'
  END AS final_assessment
FROM (
  SELECT
    (
      SELECT COUNT(*)
      FROM public.analysis_engine_versions aev
      WHERE aev.version = 'phase2-low-risk-alias-seed-2026-07-12'
        AND aev.status = 'draft'
        AND aev.description = 'Production candidate marker for Phase 2 low-risk alias seed. Sandbox verified in PR #23. No risk/scoring semantics.'
        AND aev.ruleset_checksum = 'phase2-low-risk-alias-seed-2026-07-12'
    ) AS analysis_marker_exact_count,
    (
      SELECT COUNT(*)
      FROM public.analysis_engine_versions aev
      WHERE aev.version = 'phase2-low-risk-alias-seed-2026-07-12'
        AND NOT (
          aev.status = 'draft'
          AND aev.description = 'Production candidate marker for Phase 2 low-risk alias seed. Sandbox verified in PR #23. No risk/scoring semantics.'
          AND aev.ruleset_checksum = 'phase2-low-risk-alias-seed-2026-07-12'
        )
    ) AS analysis_marker_conflict_count,
    (SELECT COUNT(*) FROM phase2_alias_production_approved_canonical_candidates) AS expected_canonical_count,
    (SELECT COUNT(*) FROM phase2_alias_production_marker_owned_canonical) AS inserted_or_available_canonical_count,
    (SELECT COUNT(*) FROM phase2_alias_production_canonical_mismatches) AS marker_owned_canonical_mismatch_count,
    (SELECT COUNT(*) FROM phase2_alias_production_approved_alias_candidates) AS expected_alias_count,
    (
      SELECT COUNT(*)
      FROM public.canonical_ingredient_aliases cia
      JOIN phase2_alias_production_marker_owned_canonical moc
        ON moc.id = cia.canonical_ingredient_id
      JOIN phase2_alias_production_approved_alias_candidates aac
        ON aac.normalized_key = moc.normalized_key
       AND aac.alias_text = cia.alias_text
       AND aac.normalized_alias = cia.normalized_alias
       AND aac.is_preferred = cia.is_preferred
      WHERE cia.language_code = 'ko'
        AND cia.alias_type = 'label'
    ) AS inserted_or_available_alias_count,
    (SELECT COUNT(*) FROM phase2_alias_production_alias_mismatches) AS marker_owned_alias_mismatch_count,
    (SELECT COUNT(*) FROM phase2_alias_production_preexisting_unmarked_canonical) AS preexisting_unmarked_canonical_count,
    (SELECT COUNT(*) FROM phase2_alias_production_preexisting_alias_conflicts) AS preexisting_alias_conflict_count
) summary;

COMMIT;
