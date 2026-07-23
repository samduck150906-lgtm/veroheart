-- READ-ONLY DRY RUN.
-- DO NOT USE AS APPLY/MIGRATION.
-- DOES NOT CHANGE RUNTIME/SCORING.
-- SAFE TO RUN ONLY AS A SELECT-ONLY INSPECTION QUERY.

WITH
seed_canonical AS (
  SELECT
    ci.id AS canonical_ingredient_id,
    ci.canonical_name_ko,
    ci.normalized_key
  FROM public.canonical_ingredients ci
  WHERE ci.category = 'phase2_low_risk_alias_seed_2026_07_12'
    AND ci.description = 'Production candidate Phase 2 low-risk alias seed. Sandbox verified in PR #23. No risk/scoring semantics.'
    AND ci.status = 'draft'
),
seed_aliases AS (
  SELECT
    sc.canonical_ingredient_id,
    sc.canonical_name_ko,
    sc.normalized_key AS canonical_normalized_key,
    cia.id AS alias_id,
    cia.alias_text,
    cia.normalized_alias,
    NULLIF(
      pg_catalog.regexp_replace(
        pg_catalog.lower(COALESCE(cia.normalized_alias, cia.alias_text)),
        '[^0-9a-z가-힣]+',
        '',
        'g'
      ),
      ''
    ) AS alias_match_key
  FROM seed_canonical sc
  JOIN public.canonical_ingredient_aliases cia
    ON cia.canonical_ingredient_id = sc.canonical_ingredient_id
  WHERE cia.language_code = 'ko'
    AND cia.alias_type = 'label'
),
legacy_ingredients AS (
  SELECT
    ing.id AS legacy_ingredient_id,
    ing.name_ko,
    ing.name_en,
    NULLIF(
      pg_catalog.regexp_replace(
        pg_catalog.lower(
          COALESCE(NULLIF(pg_catalog.btrim(ing.name_ko), ''), NULLIF(pg_catalog.btrim(ing.name_en), ''), ing.id::text)
        ),
        '[^0-9a-z가-힣]+',
        '',
        'g'
      ),
      ''
    ) AS legacy_match_key
  FROM public.ingredients ing
),
product_usage AS (
  SELECT
    pi.ingredient_id AS legacy_ingredient_id,
    COUNT(*) AS product_ingredient_usage_count
  FROM public.product_ingredients pi
  WHERE pi.ingredient_id IS NOT NULL
  GROUP BY pi.ingredient_id
),
legacy_alias_matches AS (
  SELECT
    li.legacy_ingredient_id,
    li.name_ko,
    li.name_en,
    li.legacy_match_key,
    sa.alias_text,
    sa.alias_match_key,
    sa.canonical_ingredient_id,
    sa.canonical_name_ko,
    sa.canonical_normalized_key,
    COALESCE(pu.product_ingredient_usage_count, 0) AS product_ingredient_usage_count
  FROM legacy_ingredients li
  JOIN seed_aliases sa
    ON sa.alias_match_key = li.legacy_match_key
  LEFT JOIN product_usage pu
    ON pu.legacy_ingredient_id = li.legacy_ingredient_id
  WHERE li.legacy_match_key IS NOT NULL
),
unmatched_legacy_ingredients AS (
  SELECT
    li.legacy_ingredient_id,
    li.name_ko,
    li.name_en,
    li.legacy_match_key,
    COALESCE(pu.product_ingredient_usage_count, 0) AS product_ingredient_usage_count,
    ROW_NUMBER() OVER (
      ORDER BY COALESCE(pu.product_ingredient_usage_count, 0) DESC, COALESCE(li.name_ko, li.name_en, li.legacy_ingredient_id::text)
    ) AS sample_rank
  FROM legacy_ingredients li
  LEFT JOIN legacy_alias_matches lam
    ON lam.legacy_ingredient_id = li.legacy_ingredient_id
  LEFT JOIN product_usage pu
    ON pu.legacy_ingredient_id = li.legacy_ingredient_id
  WHERE lam.legacy_ingredient_id IS NULL
),
dangerous_or_excluded_terms(term) AS (
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
normalized_dangerous_or_excluded_terms AS (
  SELECT
    det.term,
    NULLIF(
      pg_catalog.regexp_replace(
        pg_catalog.lower(det.term),
        '[^0-9a-z가-힣]+',
        '',
        'g'
      ),
      ''
    ) AS term_match_key
  FROM dangerous_or_excluded_terms det
),
dangerous_or_excluded_collisions AS (
  SELECT
    ndet.term,
    sa.alias_text,
    sa.canonical_name_ko,
    sa.canonical_normalized_key,
    sa.alias_match_key
  FROM normalized_dangerous_or_excluded_terms ndet
  JOIN seed_aliases sa
    ON sa.alias_match_key = ndet.term_match_key
    OR sa.canonical_normalized_key = ndet.term_match_key
),
ambiguous_legacy_to_canonical AS (
  SELECT
    lam.legacy_match_key,
    COUNT(DISTINCT lam.canonical_ingredient_id) AS seed_canonical_count,
    pg_catalog.string_agg(DISTINCT lam.canonical_name_ko, ' | ' ORDER BY lam.canonical_name_ko) AS seed_canonical_names
  FROM legacy_alias_matches lam
  GROUP BY lam.legacy_match_key
  HAVING COUNT(DISTINCT lam.canonical_ingredient_id) > 1
),
ambiguous_alias_to_canonical AS (
  SELECT
    sa.alias_match_key,
    COUNT(DISTINCT sa.canonical_ingredient_id) AS seed_canonical_count,
    pg_catalog.string_agg(DISTINCT sa.canonical_name_ko, ' | ' ORDER BY sa.canonical_name_ko) AS seed_canonical_names
  FROM seed_aliases sa
  WHERE sa.alias_match_key IS NOT NULL
  GROUP BY sa.alias_match_key
  HAVING COUNT(DISTINCT sa.canonical_ingredient_id) > 1
),
ambiguous_mapping_rows AS (
  SELECT
    'legacy_ingredient_to_multiple_seed_canonical' AS ambiguity_type,
    altc.legacy_match_key AS match_key,
    altc.seed_canonical_count,
    altc.seed_canonical_names
  FROM ambiguous_legacy_to_canonical altc

  UNION ALL

  SELECT
    'seed_alias_to_multiple_seed_canonical',
    aatc.alias_match_key,
    aatc.seed_canonical_count,
    aatc.seed_canonical_names
  FROM ambiguous_alias_to_canonical aatc
),
summary AS (
  SELECT
    (SELECT COUNT(*) FROM seed_canonical) AS canonical_seed_count,
    (SELECT COUNT(*) FROM seed_aliases) AS alias_seed_count,
    (SELECT COUNT(*) FROM legacy_alias_matches) AS exact_alias_match_count,
    (SELECT COUNT(DISTINCT legacy_ingredient_id) FROM legacy_alias_matches) AS matched_legacy_ingredient_count,
    (SELECT COUNT(*) FROM unmatched_legacy_ingredients) AS unmatched_legacy_ingredient_count,
    (SELECT COUNT(*) FROM dangerous_or_excluded_collisions) AS dangerous_or_excluded_collision_count,
    (SELECT COUNT(*) FROM ambiguous_mapping_rows) AS ambiguous_mapping_count
),
seed_summary_rows AS (
  SELECT
    10 AS sort_order,
    'seed_summary' AS section,
    CASE WHEN summary.canonical_seed_count = 14 AND summary.alias_seed_count = 30 THEN 'PASS' ELSE 'BLOCK' END AS severity,
    'canonical_seed_count' AS metric_name,
    summary.canonical_seed_count::text AS metric_value,
    'Marker-owned draft canonical rows found for the Phase 2 low-risk alias seed.' AS detail,
    CASE WHEN summary.canonical_seed_count = 14 THEN 'Expected count found.' ELSE 'Stop: expected exactly 14 seeded canonical rows.' END AS recommended_action
  FROM summary

  UNION ALL

  SELECT
    20,
    'seed_summary',
    CASE WHEN summary.canonical_seed_count = 14 AND summary.alias_seed_count = 30 THEN 'PASS' ELSE 'BLOCK' END,
    'alias_seed_count',
    summary.alias_seed_count::text,
    'Korean label aliases attached to marker-owned Phase 2 seed canonical rows.',
    CASE WHEN summary.alias_seed_count = 30 THEN 'Expected count found.' ELSE 'Stop: expected exactly 30 seeded aliases.' END
  FROM summary

  UNION ALL

  SELECT
    30,
    'seed_summary',
    CASE WHEN summary.canonical_seed_count = 14 AND summary.alias_seed_count = 30 THEN 'PASS' ELSE 'BLOCK' END,
    'final_assessment',
    CASE WHEN summary.canonical_seed_count = 14 AND summary.alias_seed_count = 30 THEN 'DRY_RUN_READY' ELSE 'DRY_RUN_BLOCKED' END,
    'Seed readiness assessment for this read-only resolver inspection.',
    'Continue reading the detailed sections before planning any runtime integration.'
  FROM summary
),
match_rows AS (
  SELECT
    100 + ROW_NUMBER() OVER (ORDER BY lam.canonical_name_ko, lam.alias_text, COALESCE(lam.name_ko, lam.name_en, lam.legacy_ingredient_id::text)) AS sort_order,
    'legacy_ingredient_exact_alias_matches' AS section,
    'PASS' AS severity,
    'exact_alias_match' AS metric_name,
    lam.product_ingredient_usage_count::text AS metric_value,
    jsonb_build_object(
      'legacy_ingredient_id', lam.legacy_ingredient_id,
      'legacy_name_ko', lam.name_ko,
      'legacy_name_en', lam.name_en,
      'legacy_match_key', lam.legacy_match_key,
      'matched_alias', lam.alias_text,
      'canonical_ingredient_id', lam.canonical_ingredient_id,
      'canonical_name_ko', lam.canonical_name_ko,
      'canonical_normalized_key', lam.canonical_normalized_key,
      'product_ingredient_usage_count', lam.product_ingredient_usage_count
    )::text AS detail,
    'Exact normalized alias match only. Treat as resolver candidate output, not scoring approval.' AS recommended_action
  FROM legacy_alias_matches lam
),
unmatched_sample_rows AS (
  SELECT
    1000 + uli.sample_rank AS sort_order,
    'legacy_ingredient_unmatched_sample' AS section,
    'REVIEW' AS severity,
    'unmatched_legacy_ingredient_sample' AS metric_name,
    uli.product_ingredient_usage_count::text AS metric_value,
    jsonb_build_object(
      'legacy_ingredient_id', uli.legacy_ingredient_id,
      'legacy_name_ko', uli.name_ko,
      'legacy_name_en', uli.name_en,
      'legacy_match_key', uli.legacy_match_key,
      'product_ingredient_usage_count', uli.product_ingredient_usage_count
    )::text AS detail,
    'Sample only, capped at 100 rows. Do not infer semantic matches from this dry-run.' AS recommended_action
  FROM unmatched_legacy_ingredients uli
  WHERE uli.sample_rank <= 100
),
dangerous_or_excluded_rows AS (
  SELECT
    2000 + ROW_NUMBER() OVER (ORDER BY dec.term, dec.alias_text) AS sort_order,
    'dangerous_or_excluded_collision_check' AS section,
    'BLOCK' AS severity,
    'dangerous_or_excluded_seed_collision' AS metric_name,
    dec.term AS metric_value,
    jsonb_build_object(
      'excluded_or_dangerous_term', dec.term,
      'matched_seed_alias', dec.alias_text,
      'canonical_name_ko', dec.canonical_name_ko,
      'canonical_normalized_key', dec.canonical_normalized_key,
      'alias_match_key', dec.alias_match_key
    )::text AS detail,
    'Stop: excluded animal/allergen/additive/risk candidates must not be present in the low-risk seed resolver set.' AS recommended_action
  FROM dangerous_or_excluded_collisions dec

  UNION ALL

  SELECT
    2099,
    'dangerous_or_excluded_collision_check',
    CASE WHEN summary.dangerous_or_excluded_collision_count = 0 THEN 'PASS' ELSE 'BLOCK' END,
    'dangerous_or_excluded_collision_count',
    summary.dangerous_or_excluded_collision_count::text,
    'Exact normalized match count between excluded/dangerous terms and seeded aliases/canonical keys.',
    CASE
      WHEN summary.dangerous_or_excluded_collision_count = 0 THEN 'Expected count is 0.'
      ELSE 'Stop: remove or review any excluded/dangerous collision before resolver integration.'
    END
  FROM summary
),
ambiguous_rows AS (
  SELECT
    3000 + ROW_NUMBER() OVER (ORDER BY amr.ambiguity_type, amr.match_key) AS sort_order,
    'ambiguous_many_to_one_or_one_to_many_check' AS section,
    'BLOCK' AS severity,
    amr.ambiguity_type AS metric_name,
    amr.match_key AS metric_value,
    jsonb_build_object(
      'match_key', amr.match_key,
      'seed_canonical_count', amr.seed_canonical_count,
      'seed_canonical_names', amr.seed_canonical_names
    )::text AS detail,
    'Stop: exact normalized resolver matching must not map one key to multiple seed canonical rows.' AS recommended_action
  FROM ambiguous_mapping_rows amr

  UNION ALL

  SELECT
    3099,
    'ambiguous_many_to_one_or_one_to_many_check',
    CASE WHEN summary.ambiguous_mapping_count = 0 THEN 'PASS' ELSE 'BLOCK' END,
    'ambiguous_mapping_count',
    summary.ambiguous_mapping_count::text,
    'Ambiguous exact normalized mapping count across legacy ingredients and seed aliases.',
    CASE
      WHEN summary.ambiguous_mapping_count = 0 THEN 'No exact normalized ambiguity was detected.'
      ELSE 'Stop: resolve ambiguity before runtime/scoring integration.'
    END
  FROM summary
),
assessment_rows AS (
  SELECT
    4000 AS sort_order,
    'dry_run_assessment' AS section,
    CASE
      WHEN summary.canonical_seed_count <> 14
        OR summary.alias_seed_count <> 30
        OR summary.dangerous_or_excluded_collision_count > 0
        OR summary.ambiguous_mapping_count > 0
      THEN 'BLOCK'
      WHEN summary.exact_alias_match_count = 0
      THEN 'REVIEW'
      ELSE 'PASS'
    END AS severity,
    'DRY_RUN_ASSESSMENT' AS metric_name,
    CASE
      WHEN summary.canonical_seed_count = 14
        AND summary.alias_seed_count = 30
        AND summary.dangerous_or_excluded_collision_count = 0
        AND summary.ambiguous_mapping_count = 0
        AND summary.exact_alias_match_count > 0
      THEN 'DRY_RUN_READY'
      WHEN summary.canonical_seed_count <> 14
        OR summary.alias_seed_count <> 30
        OR summary.dangerous_or_excluded_collision_count > 0
        OR summary.ambiguous_mapping_count > 0
      THEN 'DRY_RUN_BLOCKED'
      ELSE 'DRY_RUN_REVIEW_REQUIRED'
    END AS metric_value,
    jsonb_build_object(
      'canonical_seed_count', summary.canonical_seed_count,
      'alias_seed_count', summary.alias_seed_count,
      'exact_alias_match_count', summary.exact_alias_match_count,
      'matched_legacy_ingredient_count', summary.matched_legacy_ingredient_count,
      'unmatched_legacy_ingredient_count', summary.unmatched_legacy_ingredient_count,
      'dangerous_or_excluded_collision_count', summary.dangerous_or_excluded_collision_count,
      'ambiguous_mapping_count', summary.ambiguous_mapping_count
    )::text AS detail,
    'Use this as review input only. Do not connect aliases to runtime/scoring from this dry-run alone.' AS recommended_action
  FROM summary
),
all_rows AS (
  SELECT * FROM seed_summary_rows
  UNION ALL
  SELECT * FROM match_rows
  UNION ALL
  SELECT * FROM unmatched_sample_rows
  UNION ALL
  SELECT * FROM dangerous_or_excluded_rows
  UNION ALL
  SELECT * FROM ambiguous_rows
  UNION ALL
  SELECT * FROM assessment_rows
)
SELECT
  all_rows.section,
  all_rows.severity,
  all_rows.metric_name,
  all_rows.metric_value,
  all_rows.detail,
  all_rows.recommended_action
FROM all_rows
ORDER BY all_rows.sort_order;
