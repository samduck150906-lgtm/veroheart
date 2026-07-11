-- SANDBOX ONLY.
-- DO NOT RUN ON PRODUCTION.
-- Forbidden production project ref: nlutpmjloryqdomgbqrr.
-- Read-only verification for Phase 2 low-risk alias sandbox rehearsal.
-- Verification is marker-aware: approved keys must be owned by the sandbox rehearsal marker.
-- Unmarked preexisting canonical rows for approved keys are treated as a failed rehearsal state.

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
approved_alias_candidates(normalized_key, normalized_alias) AS (
  VALUES
    ('건조비트펄프', '건조 비트 펄프'),
    ('건조비트펄프', '건조 비트펄프'),
    ('건조비트펄프', '건조비트펄프'),
    ('오메가3지방산', '오메가 3 지방산'),
    ('오메가3지방산', '오메가-3 지방산'),
    ('오메가3지방산', '오메가3 지방산'),
    ('감자전분', '감자 전분'),
    ('감자전분', '감자전분'),
    ('건조맥주효모', '건조 맥주 효모'),
    ('건조맥주효모', '건조 맥주효모'),
    ('녹차추출물', '녹차 추출물'),
    ('녹차추출물', '녹차추출물'),
    ('맥주효모', '맥주 효모'),
    ('맥주효모', '맥주효모'),
    ('비타민e', '비타민 E'),
    ('비타민e', '비타민E'),
    ('비트펄프', '비트 펄프'),
    ('비트펄프', '비트펄프'),
    ('오메가6지방산', '오메가 6 지방산'),
    ('오메가6지방산', '오메가-6 지방산'),
    ('코코넛오일', '코코넛 오일'),
    ('코코넛오일', '코코넛오일'),
    ('타피오카전분', '타피오카 전분'),
    ('타피오카전분', '타피오카전분'),
    ('토마토박', '토마토 박'),
    ('토마토박', '토마토박'),
    ('프락토올리고당', '프락토올리고당'),
    ('프락토올리고당', '프락토-올리고당'),
    ('혼합토코페롤', '혼합 토코페롤'),
    ('혼합토코페롤', '혼합토코페롤')
),
excluded_candidates(normalized_key) AS (
  VALUES
    ('닭간'),
    ('닭간분말'),
    ('닭연골'),
    ('닭지방'),
    ('동물성지방'),
    ('소르빈산칼륨'),
    ('증점다당류'),
    ('천연색소'),
    ('프로필렌글리콜'),
    ('향미증진제')
),
preexisting_unmarked_canonical AS (
  SELECT ci.id, ci.normalized_key
  FROM public.canonical_ingredients ci
  JOIN approved_canonical_candidates acc
    ON acc.normalized_key = ci.normalized_key
  WHERE COALESCE(ci.category, '') <> 'phase2_low_risk_alias_rehearsal'
    AND COALESCE(ci.description, '') <> 'SANDBOX ONLY Phase 2 low-risk alias rehearsal marker. DO NOT RUN ON PRODUCTION nlutpmjloryqdomgbqrr.'
),
canonical_state AS (
  SELECT
    acc.normalized_key,
    ci.id AS canonical_ingredient_id
  FROM approved_canonical_candidates acc
  LEFT JOIN public.canonical_ingredients ci
    ON ci.normalized_key = acc.normalized_key
   AND ci.category = 'phase2_low_risk_alias_rehearsal'
   AND ci.description = 'SANDBOX ONLY Phase 2 low-risk alias rehearsal marker. DO NOT RUN ON PRODUCTION nlutpmjloryqdomgbqrr.'
),
alias_state AS (
  SELECT
    aac.normalized_key,
    aac.normalized_alias,
    cia.id AS alias_id
  FROM approved_alias_candidates aac
  LEFT JOIN public.canonical_ingredients ci
    ON ci.normalized_key = aac.normalized_key
   AND ci.category = 'phase2_low_risk_alias_rehearsal'
   AND ci.description = 'SANDBOX ONLY Phase 2 low-risk alias rehearsal marker. DO NOT RUN ON PRODUCTION nlutpmjloryqdomgbqrr.'
  LEFT JOIN public.canonical_ingredient_aliases cia
    ON cia.canonical_ingredient_id = ci.id
   AND cia.normalized_alias = aac.normalized_alias
   AND cia.language_code = 'ko'
),
excluded_state AS (
  SELECT
    ec.normalized_key,
    ci.id AS canonical_ingredient_id,
    cia.id AS alias_id
  FROM excluded_candidates ec
  LEFT JOIN public.canonical_ingredients ci
    ON ci.normalized_key = ec.normalized_key
  LEFT JOIN public.canonical_ingredient_aliases cia
    ON cia.normalized_alias = ec.normalized_key
   AND cia.language_code = 'ko'
),
forbidden_related_rows AS (
  SELECT 'canonical_analysis_rules' AS table_name, COUNT(*) AS row_count
  FROM public.canonical_analysis_rules car
  JOIN public.canonical_ingredients ci
    ON ci.id = car.canonical_ingredient_id
   AND ci.category = 'phase2_low_risk_alias_rehearsal'
   AND ci.description = 'SANDBOX ONLY Phase 2 low-risk alias rehearsal marker. DO NOT RUN ON PRODUCTION nlutpmjloryqdomgbqrr.'
  JOIN approved_canonical_candidates acc
    ON acc.normalized_key = ci.normalized_key
  UNION ALL
  SELECT 'canonical_ingredient_allergen_map', COUNT(*)
  FROM public.canonical_ingredient_allergen_map ciam
  JOIN public.canonical_ingredients ci
    ON ci.id = ciam.canonical_ingredient_id
   AND ci.category = 'phase2_low_risk_alias_rehearsal'
   AND ci.description = 'SANDBOX ONLY Phase 2 low-risk alias rehearsal marker. DO NOT RUN ON PRODUCTION nlutpmjloryqdomgbqrr.'
  JOIN approved_canonical_candidates acc
    ON acc.normalized_key = ci.normalized_key
  UNION ALL
  SELECT 'product_ingredient_label_items', COUNT(*)
  FROM public.product_ingredient_label_items pili
  JOIN public.canonical_ingredients ci
    ON ci.id = pili.canonical_ingredient_id
   AND ci.category = 'phase2_low_risk_alias_rehearsal'
   AND ci.description = 'SANDBOX ONLY Phase 2 low-risk alias rehearsal marker. DO NOT RUN ON PRODUCTION nlutpmjloryqdomgbqrr.'
  JOIN approved_canonical_candidates acc
    ON acc.normalized_key = ci.normalized_key
  UNION ALL
  SELECT 'product_ingredient_label_sets', COUNT(*)
  FROM public.product_ingredient_label_sets
  WHERE source_reference = 'phase2_low_risk_alias_rehearsal'
),
summary AS (
  SELECT
    (SELECT COUNT(*) FROM canonical_state WHERE canonical_ingredient_id IS NOT NULL) AS canonical_found_count,
    (SELECT COUNT(*) FROM approved_canonical_candidates) AS expected_canonical_count,
    (SELECT COUNT(*) FROM alias_state WHERE alias_id IS NOT NULL) AS alias_found_count,
    (SELECT COUNT(*) FROM approved_alias_candidates) AS expected_alias_count,
    (
      SELECT COUNT(*)
      FROM excluded_state
      WHERE canonical_ingredient_id IS NOT NULL OR alias_id IS NOT NULL
    ) AS excluded_found_count,
    (SELECT COUNT(*) FROM preexisting_unmarked_canonical) AS preexisting_unmarked_canonical_count,
    (SELECT COALESCE(SUM(row_count), 0) FROM forbidden_related_rows) AS forbidden_related_row_count
)
SELECT
  'phase2_alias_sandbox_verify' AS section,
  CASE
    WHEN summary.canonical_found_count = summary.expected_canonical_count
     AND summary.alias_found_count = summary.expected_alias_count
     AND summary.excluded_found_count = 0
     AND summary.preexisting_unmarked_canonical_count = 0
     AND summary.forbidden_related_row_count = 0
    THEN 'PASS'
    ELSE 'BLOCK'
  END AS severity,
  summary.expected_canonical_count,
  summary.canonical_found_count,
  summary.expected_alias_count,
  summary.alias_found_count,
  summary.excluded_found_count,
  summary.preexisting_unmarked_canonical_count,
  summary.forbidden_related_row_count,
  CASE
    WHEN summary.canonical_found_count = summary.expected_canonical_count
     AND summary.alias_found_count = summary.expected_alias_count
     AND summary.excluded_found_count = 0
     AND summary.preexisting_unmarked_canonical_count = 0
     AND summary.forbidden_related_row_count = 0
    THEN 'SANDBOX_REHEARSAL_VERIFIED'
    ELSE 'SANDBOX_REHEARSAL_FAILED'
  END AS final_assessment
FROM summary;
