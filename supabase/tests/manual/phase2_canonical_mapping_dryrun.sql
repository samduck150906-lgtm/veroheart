-- PHASE 2 CANONICAL MAPPING DRY-RUN ONLY.
-- Production project reference: nlutpmjloryqdomgbqrr.
-- Run this file by itself. It reads legacy ingredient metadata and returns a review table.
-- It does not write rows, apply schema changes, or migrate canonical ingredient data.

WITH
legacy_ingredients AS (
  SELECT
    ing.id,
    ing.name_ko,
    ing.name_en,
    ing.risk_level,
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
    ) AS normalized_key
  FROM public.ingredients ing
),
product_ingredient_links AS (
  SELECT
    pi.product_id,
    pi.ingredient_id,
    prod.id IS NOT NULL AS product_exists,
    li.id IS NOT NULL AS ingredient_exists
  FROM public.product_ingredients pi
  LEFT JOIN public.products prod ON prod.id = pi.product_id
  LEFT JOIN legacy_ingredients li ON li.id = pi.ingredient_id
),
normalized_groups AS (
  SELECT
    li.normalized_key,
    COUNT(*) AS ingredient_count,
    pg_catalog.string_agg(COALESCE(li.name_ko, li.name_en, li.id::text), ' | ' ORDER BY COALESCE(li.name_ko, li.name_en, li.id::text)) AS examples,
    COUNT(*) FILTER (WHERE li.risk_level::text IN ('warning', 'danger', 'caution')) AS caution_count
  FROM legacy_ingredients li
  WHERE li.normalized_key IS NOT NULL
  GROUP BY li.normalized_key
  HAVING COUNT(*) > 1
),
ranked_normalized_groups AS (
  SELECT
    ng.*,
    ROW_NUMBER() OVER (ORDER BY ng.ingredient_count DESC, ng.normalized_key) AS row_number
  FROM normalized_groups ng
),
substring_pairs AS (
  SELECT
    shorter.name_ko AS shorter_name,
    longer.name_ko AS longer_name,
    shorter.normalized_key AS shorter_key,
    longer.normalized_key AS longer_key,
    ROW_NUMBER() OVER (ORDER BY shorter.name_ko, longer.name_ko) AS row_number
  FROM legacy_ingredients shorter
  JOIN legacy_ingredients longer
    ON shorter.id <> longer.id
   AND shorter.normalized_key IS NOT NULL
   AND longer.normalized_key IS NOT NULL
   AND pg_catalog.length(shorter.normalized_key) >= 2
   AND pg_catalog.length(shorter.normalized_key) < pg_catalog.length(longer.normalized_key)
   AND pg_catalog.strpos(longer.normalized_key, shorter.normalized_key) > 0
),
high_risk_terms(term) AS (
  VALUES
    ('포도'),
    ('건포도'),
    ('양파'),
    ('마늘'),
    ('초콜릿'),
    ('카카오'),
    ('자일리톨'),
    ('카페인'),
    ('마카다미아'),
    ('알코올')
),
normalized_allergens AS (
  SELECT
    al.id,
    COALESCE(al.display_name_ko, al.code) AS allergen_name,
    NULLIF(
      pg_catalog.regexp_replace(
        pg_catalog.lower(COALESCE(al.display_name_ko, al.code)),
        '[^0-9a-z가-힣]+',
        '',
        'g'
      ),
      ''
    ) AS normalized_key
  FROM public.allergens al
),
allergen_name_matches AS (
  SELECT DISTINCT
    li.id,
    COALESCE(li.name_ko, li.name_en, li.id::text) AS ingredient_name,
    na.allergen_name
  FROM legacy_ingredients li
  JOIN normalized_allergens na
    ON li.normalized_key IS NOT NULL
   AND na.normalized_key IS NOT NULL
   AND pg_catalog.strpos(li.normalized_key, na.normalized_key) > 0
),
risk_review_candidates AS (
  SELECT DISTINCT
    li.id,
    COALESCE(li.name_ko, li.name_en, li.id::text) AS ingredient_name,
    CASE
      WHEN li.risk_level::text IN ('warning', 'danger', 'caution') THEN 'legacy risk_level=' || li.risk_level::text
      WHEN EXISTS (
        SELECT 1
        FROM high_risk_terms hrt
        WHERE pg_catalog.strpos(COALESCE(li.name_ko, li.name_en, ''), hrt.term) > 0
      ) THEN 'high-risk term candidate'
      WHEN EXISTS (
        SELECT 1
        FROM allergen_name_matches anm
        WHERE anm.id = li.id
      ) THEN 'allergen name candidate'
      ELSE 'review candidate'
    END AS reason
  FROM legacy_ingredients li
  WHERE li.risk_level::text IN ('warning', 'danger', 'caution')
     OR EXISTS (
       SELECT 1
       FROM high_risk_terms hrt
       WHERE pg_catalog.strpos(COALESCE(li.name_ko, li.name_en, ''), hrt.term) > 0
     )
     OR EXISTS (
       SELECT 1
       FROM allergen_name_matches anm
       WHERE anm.id = li.id
     )
),
summary AS (
  SELECT
    (SELECT COUNT(*) FROM legacy_ingredients) AS legacy_ingredient_count,
    (SELECT COUNT(*) FROM product_ingredient_links) AS product_ingredient_link_count,
    (SELECT COUNT(*) FROM product_ingredient_links WHERE ingredient_id IS NOT NULL) AS product_ingredient_with_ingredient_id_count,
    (
      SELECT COUNT(*)
      FROM product_ingredient_links
      WHERE product_id IS NULL
         OR ingredient_id IS NULL
         OR NOT product_exists
         OR NOT ingredient_exists
    ) AS broken_or_empty_link_count,
    (SELECT COUNT(*) FROM normalized_groups) AS duplicate_or_alias_group_count,
    (SELECT COALESCE(SUM(ingredient_count), 0) FROM normalized_groups) AS duplicate_or_alias_candidate_count,
    (SELECT COUNT(*) FROM substring_pairs) AS substring_risk_pair_count,
    (SELECT COUNT(*) FROM risk_review_candidates) AS risk_or_allergen_review_count
),
metric_rows AS (
  SELECT
    10 AS sort_order,
    'summary' AS section,
    'PASS' AS severity,
    'legacy_ingredient_count' AS metric_name,
    summary.legacy_ingredient_count::text AS metric_value,
    'Total rows currently present in public.ingredients.' AS detail,
    'Use this as the upper bound for canonical mapping review scope.' AS recommended_action
  FROM summary

  UNION ALL

  SELECT
    20,
    'summary',
    'PASS',
    'product_ingredient_link_count',
    summary.product_ingredient_link_count::text,
    'Total rows currently present in public.product_ingredients.',
    'Compare this with product coverage before any future migration plan.'
  FROM summary

  UNION ALL

  SELECT
    30,
    'summary',
    'PASS',
    'product_ingredients_with_ingredient_id',
    summary.product_ingredient_with_ingredient_id_count::text,
    'Rows where product_ingredients.ingredient_id is populated.',
    'Rows without ingredient_id cannot be mapped automatically.'
  FROM summary

  UNION ALL

  SELECT
    40,
    'integrity',
    CASE WHEN summary.broken_or_empty_link_count > 0 THEN 'BLOCK' ELSE 'PASS' END,
    'broken_or_empty_product_ingredient_links',
    summary.broken_or_empty_link_count::text,
    'Rows with missing product_id, missing ingredient_id, missing product, or missing ingredient.',
    CASE
      WHEN summary.broken_or_empty_link_count > 0 THEN 'Do not design an automated mapping until these links are reviewed.'
      ELSE 'No broken or empty product ingredient links were detected by this dry-run.'
    END
  FROM summary

  UNION ALL

  SELECT
    50,
    'candidate_groups',
    CASE WHEN summary.duplicate_or_alias_group_count > 0 THEN 'WARN' ELSE 'PASS' END,
    'normalized_key_candidate_group_count',
    summary.duplicate_or_alias_group_count::text,
    'Number of normalized keys shared by more than one legacy ingredient.',
    CASE
      WHEN summary.duplicate_or_alias_group_count > 0 THEN 'Review each group before choosing canonical ingredients or aliases.'
      ELSE 'No duplicate normalized-key groups were detected.'
    END
  FROM summary

  UNION ALL

  SELECT
    60,
    'candidate_groups',
    CASE WHEN summary.duplicate_or_alias_candidate_count > 0 THEN 'WARN' ELSE 'PASS' END,
    'manual_review_candidate_count',
    summary.duplicate_or_alias_candidate_count::text,
    'Total legacy ingredient rows participating in duplicate normalized-key groups.',
    'Use this count for estimating manual review workload.'
  FROM summary

  UNION ALL

  SELECT
    70,
    'substring_risk',
    CASE WHEN summary.substring_risk_pair_count > 0 THEN 'WARN' ELSE 'PASS' END,
    'dangerous_substring_pair_count',
    summary.substring_risk_pair_count::text,
    'Potentially unsafe substring pairs such as 포도 versus 포도씨유.',
    CASE
      WHEN summary.substring_risk_pair_count > 0 THEN 'Do not use substring-only matching for canonical mapping.'
      ELSE 'No substring-risk pairs were detected by this dry-run.'
    END
  FROM summary

  UNION ALL

  SELECT
    80,
    'risk_review',
    CASE WHEN summary.risk_or_allergen_review_count > 0 THEN 'WARN' ELSE 'PASS' END,
    'risk_or_allergen_review_count',
    summary.risk_or_allergen_review_count::text,
    'Legacy ingredients flagged by risk_level, high-risk terms, or allergen-name matches.',
    CASE
      WHEN summary.risk_or_allergen_review_count > 0 THEN 'Require human review before mapping these ingredients to canonical rules.'
      ELSE 'No risk or allergen review candidates were detected by this dry-run.'
    END
  FROM summary
),
candidate_rows AS (
  SELECT
    1000 + rg.row_number AS sort_order,
    'normalized_key_candidates' AS section,
    'WARN' AS severity,
    'normalized_key=' || rg.normalized_key AS metric_name,
    rg.ingredient_count::text AS metric_value,
    'Candidates: ' || rg.examples AS detail,
    'Review whether these are true aliases, spelling variants, or separate ingredients.' AS recommended_action
  FROM ranked_normalized_groups rg
  WHERE rg.row_number <= 50
),
substring_rows AS (
  SELECT
    2000 + sp.row_number AS sort_order,
    'substring_risk_examples' AS section,
    'WARN' AS severity,
    'substring_pair' AS metric_name,
    sp.shorter_name || ' -> ' || sp.longer_name AS metric_value,
    'Normalized key ' || sp.shorter_key || ' is contained in ' || sp.longer_key || '.',
    'Require exact or reviewed alias mapping; do not auto-map by substring.'
  FROM substring_pairs sp
  WHERE sp.row_number <= 50
),
risk_rows AS (
  SELECT
    3000 + ROW_NUMBER() OVER (ORDER BY rrc.ingredient_name, rrc.reason) AS sort_order,
    'risk_review_examples' AS section,
    'WARN' AS severity,
    'risk_or_allergen_candidate' AS metric_name,
    rrc.ingredient_name AS metric_value,
    rrc.reason AS detail,
    'Review before connecting this ingredient to canonical risk rules or allergen groups.' AS recommended_action
  FROM risk_review_candidates rrc
),
assessment_row AS (
  SELECT
    9999 AS sort_order,
    'assessment' AS section,
    CASE
      WHEN summary.broken_or_empty_link_count > 0 THEN 'BLOCK'
      WHEN summary.duplicate_or_alias_group_count > 0
        OR summary.substring_risk_pair_count > 0
        OR summary.risk_or_allergen_review_count > 0 THEN 'WARN'
      ELSE 'PASS'
    END AS severity,
    'DRYRUN_ASSESSMENT' AS metric_name,
    CASE
      WHEN summary.broken_or_empty_link_count > 0 THEN 'DRYRUN_BLOCKED'
      WHEN summary.duplicate_or_alias_group_count > 0
        OR summary.substring_risk_pair_count > 0
        OR summary.risk_or_allergen_review_count > 0 THEN 'DRYRUN_REVIEW_REQUIRED'
      ELSE 'DRYRUN_READY'
    END AS metric_value,
    CASE
      WHEN summary.broken_or_empty_link_count > 0 THEN 'Legacy product ingredient links need repair or explicit handling before policy review.'
      WHEN summary.duplicate_or_alias_group_count > 0
        OR summary.substring_risk_pair_count > 0
        OR summary.risk_or_allergen_review_count > 0 THEN 'Mapping can proceed only as a human policy review, not as data migration.'
      ELSE 'No blocking metadata issue was detected by this dry-run.'
    END AS detail,
    CASE
      WHEN summary.broken_or_empty_link_count > 0 THEN 'Stop Phase 2 mapping design until link integrity is reviewed.'
      WHEN summary.duplicate_or_alias_group_count > 0
        OR summary.substring_risk_pair_count > 0
        OR summary.risk_or_allergen_review_count > 0 THEN 'Export results and decide canonical mapping policy before any future migration.'
      ELSE 'Continue to policy review; do not migrate data from this dry-run alone.'
    END AS recommended_action
  FROM summary
),
all_rows AS (
  SELECT * FROM metric_rows
  UNION ALL
  SELECT * FROM candidate_rows
  UNION ALL
  SELECT * FROM substring_rows
  UNION ALL
  SELECT * FROM risk_rows
  UNION ALL
  SELECT * FROM assessment_row
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
