-- SANDBOX ONLY.
-- DO NOT RUN ON PRODUCTION.
-- Forbidden production project ref: nlutpmjloryqdomgbqrr.
-- This rehearsal writes only sandbox canonical ingredient and alias rows for the 14 approved low-risk alias candidates.
-- It does not create risk rules, allergen mappings, product label sets, product label items, review queue rows, runtime changes, or scoring changes.
-- It refuses to run unless the operator sets app.phase2_alias_sandbox_rehearsal_confirm in a sandbox session.
-- It never attaches aliases to unmarked preexisting canonical rows.
-- DML and final summary are intentionally separate statements to avoid PostgreSQL data-modifying CTE snapshot issues.

BEGIN;

DO $$
BEGIN
  IF current_setting('app.phase2_alias_sandbox_rehearsal_confirm', true)
     IS DISTINCT FROM 'SANDBOX_ONLY_CONFIRMED_NOT_PRODUCTION' THEN
    RAISE EXCEPTION
      'Refusing to run Phase 2 alias sandbox rehearsal: set app.phase2_alias_sandbox_rehearsal_confirm only in a sandbox project. Do not run on production nlutpmjloryqdomgbqrr.';
  END IF;
END $$;

CREATE TEMP TABLE phase2_alias_rehearsal_approved_canonical_candidates (
  normalized_key text PRIMARY KEY,
  canonical_name_ko text NOT NULL
) ON COMMIT DROP;

INSERT INTO phase2_alias_rehearsal_approved_canonical_candidates (
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

CREATE TEMP TABLE phase2_alias_rehearsal_approved_alias_candidates (
  normalized_key text NOT NULL,
  alias_text text NOT NULL,
  normalized_alias text NOT NULL,
  is_preferred boolean NOT NULL,
  PRIMARY KEY (normalized_alias)
) ON COMMIT DROP;

INSERT INTO phase2_alias_rehearsal_approved_alias_candidates (
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

CREATE TEMP TABLE phase2_alias_rehearsal_preexisting_unmarked_canonical
ON COMMIT DROP
AS
SELECT ci.id, ci.normalized_key
FROM public.canonical_ingredients ci
JOIN phase2_alias_rehearsal_approved_canonical_candidates acc
  ON acc.normalized_key = ci.normalized_key
WHERE COALESCE(ci.category, '') <> 'phase2_low_risk_alias_rehearsal'
  AND COALESCE(ci.description, '') <> 'SANDBOX ONLY Phase 2 low-risk alias rehearsal marker. DO NOT RUN ON PRODUCTION nlutpmjloryqdomgbqrr.';

INSERT INTO public.analysis_engine_versions (
  version,
  status,
  description,
  ruleset_checksum
)
SELECT
  'sandbox-phase2-low-risk-alias-rehearsal-2026-07-11',
  'draft',
  'SANDBOX ONLY marker for Phase 2 low-risk alias rehearsal. DO NOT RUN ON PRODUCTION nlutpmjloryqdomgbqrr.',
  'sandbox-only-phase2-low-risk-alias-rehearsal'
WHERE NOT EXISTS (
  SELECT 1
  FROM phase2_alias_rehearsal_preexisting_unmarked_canonical
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
  'phase2_low_risk_alias_rehearsal',
  'SANDBOX ONLY Phase 2 low-risk alias rehearsal marker. DO NOT RUN ON PRODUCTION nlutpmjloryqdomgbqrr.',
  'draft'
FROM phase2_alias_rehearsal_approved_canonical_candidates acc
WHERE NOT EXISTS (
  SELECT 1
  FROM phase2_alias_rehearsal_preexisting_unmarked_canonical
)
ON CONFLICT (normalized_key) DO NOTHING;

CREATE TEMP TABLE phase2_alias_rehearsal_marker_owned_canonical
ON COMMIT DROP
AS
SELECT ci.id, ci.normalized_key
FROM public.canonical_ingredients ci
JOIN phase2_alias_rehearsal_approved_canonical_candidates acc
  ON acc.normalized_key = ci.normalized_key
WHERE ci.category = 'phase2_low_risk_alias_rehearsal'
  AND ci.description = 'SANDBOX ONLY Phase 2 low-risk alias rehearsal marker. DO NOT RUN ON PRODUCTION nlutpmjloryqdomgbqrr.';

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
FROM phase2_alias_rehearsal_approved_alias_candidates aac
JOIN phase2_alias_rehearsal_marker_owned_canonical moc
  ON moc.normalized_key = aac.normalized_key
WHERE NOT EXISTS (
  SELECT 1
  FROM phase2_alias_rehearsal_preexisting_unmarked_canonical
)
ON CONFLICT (normalized_alias, language_code) DO NOTHING;

SELECT
  'phase2_alias_sandbox_rehearsal' AS section,
  CASE
    WHEN preexisting_unmarked_canonical_count = 0
     AND inserted_or_available_canonical_count = expected_canonical_count
     AND inserted_or_available_alias_count = expected_alias_count
    THEN 'PASS'
    ELSE 'WARN'
  END AS severity,
  expected_canonical_count,
  inserted_or_available_canonical_count,
  expected_alias_count,
  inserted_or_available_alias_count,
  preexisting_unmarked_canonical_count,
  excluded_candidate_count,
  CASE
    WHEN preexisting_unmarked_canonical_count = 0
     AND inserted_or_available_canonical_count = expected_canonical_count
     AND inserted_or_available_alias_count = expected_alias_count
    THEN 'SANDBOX_REHEARSAL_READY_FOR_VERIFY'
    ELSE 'SANDBOX_REHEARSAL_REVIEW_REQUIRED'
  END AS final_assessment
FROM (
  SELECT
    (SELECT COUNT(*) FROM phase2_alias_rehearsal_approved_canonical_candidates) AS expected_canonical_count,
    (
      SELECT COUNT(*)
      FROM public.canonical_ingredients ci
      JOIN phase2_alias_rehearsal_approved_canonical_candidates acc
        ON acc.normalized_key = ci.normalized_key
      WHERE ci.category = 'phase2_low_risk_alias_rehearsal'
        AND ci.description = 'SANDBOX ONLY Phase 2 low-risk alias rehearsal marker. DO NOT RUN ON PRODUCTION nlutpmjloryqdomgbqrr.'
    ) AS inserted_or_available_canonical_count,
    (SELECT COUNT(*) FROM phase2_alias_rehearsal_approved_alias_candidates) AS expected_alias_count,
    (
      SELECT COUNT(*)
      FROM public.canonical_ingredient_aliases cia
      JOIN public.canonical_ingredients ci
        ON ci.id = cia.canonical_ingredient_id
       AND ci.category = 'phase2_low_risk_alias_rehearsal'
       AND ci.description = 'SANDBOX ONLY Phase 2 low-risk alias rehearsal marker. DO NOT RUN ON PRODUCTION nlutpmjloryqdomgbqrr.'
      JOIN phase2_alias_rehearsal_approved_alias_candidates aac
        ON aac.normalized_alias = cia.normalized_alias
       AND cia.language_code = 'ko'
       AND ci.normalized_key = aac.normalized_key
    ) AS inserted_or_available_alias_count,
    (SELECT COUNT(*) FROM phase2_alias_rehearsal_preexisting_unmarked_canonical) AS preexisting_unmarked_canonical_count,
    10 AS excluded_candidate_count
) summary;

COMMIT;
