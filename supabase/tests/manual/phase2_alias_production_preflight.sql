-- PRODUCTION CANDIDATE PREFLIGHT ONLY.
-- READ ONLY.
-- Production project ref to confirm in Supabase UI: nlutpmjloryqdomgbqrr.
-- Do not append apply SQL to this query.

WITH
approved_canonical_candidates(normalized_key, canonical_name_ko) AS (
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
    ('혼합토코페롤', '혼합 토코페롤')
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
required_tables(table_name) AS (
  VALUES
    ('canonical_ingredients'),
    ('canonical_ingredient_aliases'),
    ('analysis_engine_versions')
),
missing_required_tables AS (
  SELECT rt.table_name
  FROM required_tables rt
  LEFT JOIN information_schema.tables ist
    ON ist.table_schema = 'public'
   AND ist.table_name = rt.table_name
  WHERE ist.table_name IS NULL
),
marker_owned_canonical AS (
  SELECT ci.id, ci.normalized_key
  FROM public.canonical_ingredients ci
  JOIN approved_canonical_candidates acc
    ON acc.normalized_key = ci.normalized_key
  WHERE ci.category = 'phase2_low_risk_alias_seed_2026_07_12'
    AND ci.description = 'Production candidate Phase 2 low-risk alias seed. Sandbox verified in PR #23. No risk/scoring semantics.'
    AND ci.status = 'draft'
),
preexisting_unmarked_canonical AS (
  SELECT ci.id, ci.normalized_key
  FROM public.canonical_ingredients ci
  JOIN approved_canonical_candidates acc
    ON acc.normalized_key = ci.normalized_key
  WHERE NOT (
    ci.category = 'phase2_low_risk_alias_seed_2026_07_12'
    AND ci.description = 'Production candidate Phase 2 low-risk alias seed. Sandbox verified in PR #23. No risk/scoring semantics.'
    AND ci.status = 'draft'
  )
),
marker_owned_aliases AS (
  SELECT cia.id
  FROM public.canonical_ingredient_aliases cia
  JOIN marker_owned_canonical moc
    ON moc.id = cia.canonical_ingredient_id
  JOIN approved_alias_candidates aac
    ON aac.normalized_alias = cia.normalized_alias
   AND aac.normalized_key = moc.normalized_key
  WHERE cia.language_code = 'ko'
),
preexisting_alias_conflicts AS (
  SELECT cia.id, cia.normalized_alias
  FROM public.canonical_ingredient_aliases cia
  JOIN approved_alias_candidates aac
    ON aac.normalized_alias = cia.normalized_alias
   AND cia.language_code = 'ko'
  LEFT JOIN marker_owned_canonical moc
    ON moc.id = cia.canonical_ingredient_id
   AND moc.normalized_key = aac.normalized_key
  WHERE moc.id IS NULL
),
forbidden_related_rows AS (
  SELECT COUNT(*) AS row_count
  FROM public.canonical_analysis_rules car
  JOIN marker_owned_canonical moc
    ON moc.id = car.canonical_ingredient_id
  UNION ALL
  SELECT COUNT(*)
  FROM public.canonical_ingredient_allergen_map ciam
  JOIN marker_owned_canonical moc
    ON moc.id = ciam.canonical_ingredient_id
  UNION ALL
  SELECT COUNT(*)
  FROM public.canonical_ingredient_evidence cie
  JOIN marker_owned_canonical moc
    ON moc.id = cie.canonical_ingredient_id
  UNION ALL
  SELECT COUNT(*)
  FROM public.product_ingredient_label_items pili
  JOIN marker_owned_canonical moc
    ON moc.id = pili.canonical_ingredient_id
  UNION ALL
  SELECT COUNT(*)
  FROM public.product_ingredient_label_sets pils
  JOIN public.product_ingredient_label_items pili
    ON pili.label_set_id = pils.id
  JOIN marker_owned_canonical moc
    ON moc.id = pili.canonical_ingredient_id
  UNION ALL
  SELECT COUNT(*)
  FROM public.canonical_ingredient_review_queue cirq
  JOIN marker_owned_canonical moc
    ON cirq.resolution_ingredient_id = moc.id
    OR moc.id = ANY(cirq.candidate_ingredient_ids)
),
summary AS (
  SELECT
    (SELECT COUNT(*) FROM missing_required_tables) AS missing_required_table_count,
    (SELECT COUNT(*) FROM approved_canonical_candidates) AS expected_canonical_count,
    (SELECT COUNT(*) FROM marker_owned_canonical) AS existing_marker_owned_canonical_count,
    (SELECT COUNT(*) FROM preexisting_unmarked_canonical) AS preexisting_unmarked_canonical_count,
    (SELECT COUNT(*) FROM approved_alias_candidates) AS expected_alias_count,
    (SELECT COUNT(*) FROM marker_owned_aliases) AS existing_marker_owned_alias_count,
    (SELECT COUNT(*) FROM preexisting_alias_conflicts) AS preexisting_alias_conflict_count,
    (SELECT COALESCE(SUM(row_count), 0) FROM forbidden_related_rows) AS forbidden_related_row_count
)
SELECT
  'phase2_alias_production_preflight' AS section,
  CASE
    WHEN missing_required_table_count = 0
     AND preexisting_unmarked_canonical_count = 0
     AND preexisting_alias_conflict_count = 0
     AND forbidden_related_row_count = 0
    THEN 'PASS'
    ELSE 'BLOCK'
  END AS severity,
  expected_canonical_count,
  existing_marker_owned_canonical_count,
  preexisting_unmarked_canonical_count,
  expected_alias_count,
  existing_marker_owned_alias_count,
  preexisting_alias_conflict_count,
  forbidden_related_row_count,
  CASE
    WHEN missing_required_table_count = 0
     AND preexisting_unmarked_canonical_count = 0
     AND preexisting_alias_conflict_count = 0
     AND forbidden_related_row_count = 0
    THEN 'PRODUCTION_PREFLIGHT_READY'
    ELSE 'PRODUCTION_PREFLIGHT_BLOCKED'
  END AS final_assessment
FROM summary;
