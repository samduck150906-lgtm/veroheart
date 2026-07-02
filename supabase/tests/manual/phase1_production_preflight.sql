-- READ-ONLY PREFLIGHT. Production project reference: nlutpmjloryqdomgbqrr.
-- Run this file by itself. It reads metadata only and does not apply the Phase 1 migration.
-- No credentials beyond an already-open Supabase SQL Editor session are required.
-- Current automatic best result: REVIEW_REQUIRED. The migration version row is
-- intentionally not read. PREFLIGHT_PASS is reserved for a future automatic
-- migration-history integration. Do not apply the migration until a human verifies
-- that version 20260630090000 is not already recorded.

WITH
required_prerequisites(check_order, table_name) AS (
  VALUES
    (10, 'products'),
    (11, 'ingredients'),
    (12, 'allergens')
),
phase_tables(check_order, table_name) AS (
  VALUES
    (100, 'analysis_engine_versions'),
    (101, 'canonical_ingredients'),
    (102, 'canonical_ingredient_aliases'),
    (103, 'ingredient_evidence_sources'),
    (104, 'canonical_ingredient_evidence'),
    (105, 'canonical_analysis_rules'),
    (106, 'canonical_analysis_rule_evidence'),
    (107, 'product_ingredient_label_sets'),
    (108, 'product_ingredient_label_items'),
    (109, 'canonical_ingredient_allergen_map'),
    (110, 'canonical_ingredient_review_queue')
),
phase_indexes(check_order, index_name) AS (
  VALUES
    (200, 'idx_canonical_ingredients_legacy_id'),
    (201, 'idx_canonical_ingredient_aliases_ingredient'),
    (202, 'idx_canonical_ingredient_aliases_normalized'),
    (203, 'idx_ingredient_evidence_sources_doi'),
    (204, 'idx_canonical_ingredient_evidence_source'),
    (205, 'idx_canonical_analysis_rules_active'),
    (206, 'idx_product_ingredient_label_sets_product'),
    (207, 'idx_product_ingredient_label_sets_one_current'),
    (208, 'idx_product_ingredient_label_items_legacy'),
    (209, 'idx_product_ingredient_label_items_canonical'),
    (210, 'idx_canonical_ingredient_allergen_allergen'),
    (211, 'idx_canonical_ingredient_review_queue_status'),
    (212, 'idx_canonical_ingredient_review_queue_open_text')
),
phase_policies(check_order, table_name, policy_name) AS (
  VALUES
    (300, 'analysis_engine_versions', 'analysis_engine_versions_read'),
    (301, 'canonical_ingredients', 'canonical_ingredients_read'),
    (302, 'canonical_ingredient_aliases', 'canonical_ingredient_aliases_read'),
    (303, 'ingredient_evidence_sources', 'ingredient_evidence_sources_read'),
    (304, 'canonical_ingredient_evidence', 'canonical_ingredient_evidence_read'),
    (305, 'canonical_analysis_rules', 'canonical_analysis_rules_read'),
    (306, 'canonical_analysis_rule_evidence', 'canonical_analysis_rule_evidence_read'),
    (307, 'product_ingredient_label_sets', 'product_ingredient_label_sets_read'),
    (308, 'product_ingredient_label_items', 'product_ingredient_label_items_read'),
    (309, 'canonical_ingredient_allergen_map', 'canonical_ingredient_allergen_map_read')
),
phase_constraint_indexes(check_order, relation_name) AS (
  VALUES
    (400, 'analysis_engine_versions_pkey'),
    (401, 'canonical_ingredients_pkey'),
    (402, 'canonical_ingredient_aliases_pkey'),
    (403, 'ingredient_evidence_sources_pkey'),
    (404, 'canonical_ingredient_evidence_pkey'),
    (405, 'canonical_analysis_rules_pkey'),
    (406, 'canonical_analysis_rule_evidence_pkey'),
    (407, 'product_ingredient_label_sets_pkey'),
    (408, 'product_ingredient_label_items_pkey'),
    (409, 'canonical_ingredient_allergen_map_pkey'),
    (410, 'canonical_ingredient_review_queue_pkey'),
    (411, 'analysis_engine_versions_version_key'),
    (412, 'canonical_ingredients_normalized_key_key'),
    (413, 'canonical_ingredients_name_ko_key'),
    (414, 'canonical_ingredient_aliases_normalized_key'),
    (415, 'canonical_ingredient_evidence_unique'),
    (416, 'canonical_analysis_rules_version_key'),
    (417, 'product_ingredient_label_items_order_key')
),
prerequisite_state AS (
  SELECT
    rp.check_order,
    rp.table_name,
    cls.oid AS relation_oid,
    cls.relkind,
    id_col.attnum AS id_attnum,
    id_col.atttypid,
    pg_catalog.format_type(id_col.atttypid, id_col.atttypmod) AS id_type,
    EXISTS (
      SELECT 1
      FROM pg_catalog.pg_constraint key_constraint
      WHERE key_constraint.conrelid = cls.oid
        AND key_constraint.contype IN ('p', 'u')
        AND array_length(key_constraint.conkey, 1) = 1
        AND id_col.attnum = key_constraint.conkey[1]
    ) AS id_is_single_column_key
  FROM required_prerequisites rp
  LEFT JOIN pg_catalog.pg_namespace ns
    ON ns.nspname = 'public'
  LEFT JOIN pg_catalog.pg_class cls
    ON cls.relnamespace = ns.oid
   AND cls.relname = rp.table_name
   AND cls.relkind IN ('r', 'p')
  LEFT JOIN pg_catalog.pg_attribute id_col
    ON id_col.attrelid = cls.oid
   AND id_col.attname = 'id'
   AND id_col.attnum > 0
   AND NOT id_col.attisdropped
),
history_state AS (
  SELECT
    pg_catalog.to_regclass('supabase_migrations.schema_migrations') AS history_relation,
    EXISTS (
      SELECT 1
      FROM pg_catalog.pg_attribute history_column
      WHERE history_column.attrelid = pg_catalog.to_regclass('supabase_migrations.schema_migrations')
        AND history_column.attname = 'version'
        AND history_column.attnum > 0
        AND NOT history_column.attisdropped
    ) AS has_version_column
),
checks AS (
  SELECT
    ps.check_order,
    CASE WHEN ps.relation_oid IS NULL THEN 'BLOCK' ELSE 'PASS' END AS severity,
    'prerequisite_table_' || ps.table_name AS check_name,
    CASE
      WHEN ps.relation_oid IS NULL THEN 'Required relation public.' || ps.table_name || ' is missing.'
      ELSE 'Required relation public.' || ps.table_name || ' exists.'
    END AS detail,
    CASE
      WHEN ps.relation_oid IS NULL THEN 'Stop and reconcile the production schema before any migration review.'
      ELSE 'No action required.'
    END AS recommended_action
  FROM prerequisite_state ps

  UNION ALL

  SELECT
    ps.check_order + 10,
    CASE
      WHEN ps.relation_oid IS NULL THEN 'BLOCK'
      WHEN ps.id_attnum IS NULL THEN 'BLOCK'
      WHEN ps.atttypid <> 'uuid'::pg_catalog.regtype THEN 'BLOCK'
      WHEN NOT ps.id_is_single_column_key THEN 'BLOCK'
      ELSE 'PASS'
    END,
    'prerequisite_id_' || ps.table_name,
    CASE
      WHEN ps.relation_oid IS NULL THEN 'Cannot inspect public.' || ps.table_name || '.id because the relation is missing.'
      WHEN ps.id_attnum IS NULL THEN 'Column public.' || ps.table_name || '.id is missing.'
      WHEN ps.atttypid <> 'uuid'::pg_catalog.regtype THEN 'Column public.' || ps.table_name || '.id has type ' || COALESCE(ps.id_type, 'unknown') || ', expected uuid.'
      WHEN NOT ps.id_is_single_column_key THEN 'Column public.' || ps.table_name || '.id is not a single-column primary or unique key.'
      ELSE 'Column public.' || ps.table_name || '.id is uuid and is a valid single-column key target.'
    END,
    CASE
      WHEN ps.relation_oid IS NULL OR ps.id_attnum IS NULL THEN 'Stop and reconcile the prerequisite relation.'
      WHEN ps.atttypid <> 'uuid'::pg_catalog.regtype THEN 'Stop; Phase 1 foreign-key types are incompatible.'
      WHEN NOT ps.id_is_single_column_key THEN 'Stop; add no production changes until key compatibility is reviewed.'
      ELSE 'No action required.'
    END
  FROM prerequisite_state ps

  UNION ALL

  SELECT
    50,
    CASE WHEN pg_catalog.to_regprocedure('gen_random_uuid()') IS NULL THEN 'BLOCK' ELSE 'PASS' END,
    'gen_random_uuid_available',
    CASE
      WHEN pg_catalog.to_regprocedure('gen_random_uuid()') IS NULL THEN 'Function gen_random_uuid() is unavailable in the current search path.'
      ELSE 'Function gen_random_uuid() is available.'
    END,
    CASE
      WHEN pg_catalog.to_regprocedure('gen_random_uuid()') IS NULL THEN 'Stop and confirm the PostgreSQL/Supabase function environment.'
      ELSE 'No action required.'
    END

  UNION ALL

  SELECT
    60,
    CASE
      WHEN hs.history_relation IS NULL OR NOT hs.has_version_column THEN 'WARN'
      ELSE 'PASS'
    END,
    'migration_history_relation',
    CASE
      WHEN hs.history_relation IS NULL THEN 'supabase_migrations.schema_migrations is not visible.'
      WHEN NOT hs.has_version_column THEN 'Migration history relation exists but no version column is visible.'
      ELSE 'Migration history relation and version column are visible.'
    END,
    CASE
      WHEN hs.history_relation IS NULL THEN 'Confirm migration tracking outside this query before proceeding.'
      WHEN NOT hs.has_version_column THEN 'Review the migration history schema and locate its version field before proceeding.'
      ELSE 'Continue with the separate version-record review below.'
    END
  FROM history_state hs

  UNION ALL

  SELECT
    61,
    'WARN',
    'migration_version_20260630090000',
    CASE
      WHEN hs.history_relation IS NULL THEN 'Version row cannot be inspected because the optional history relation is absent.'
      WHEN NOT hs.has_version_column THEN 'Version row cannot be inspected because the version column is absent.'
      ELSE 'Strict metadata-only mode does not read migration-history rows, so recorded status is intentionally undetermined.'
    END,
    'A human must verify that version 20260630090000 is not already recorded before considering application.'
  FROM history_state hs

  UNION ALL

  SELECT
    pt.check_order,
    CASE WHEN cls.oid IS NULL THEN 'PASS' ELSE 'BLOCK' END,
    'phase_table_name_' || pt.table_name,
    CASE
      WHEN cls.oid IS NULL THEN 'No public relation named ' || pt.table_name || ' exists.'
      ELSE 'Name collision: public.' || pt.table_name || ' already exists as relkind ' || cls.relkind || '.'
    END,
    CASE
      WHEN cls.oid IS NULL THEN 'No action required.'
      ELSE 'Stop and identify ownership, schema, and migration history for the existing relation.'
    END
  FROM phase_tables pt
  LEFT JOIN pg_catalog.pg_namespace ns ON ns.nspname = 'public'
  LEFT JOIN pg_catalog.pg_class cls ON cls.relnamespace = ns.oid AND cls.relname = pt.table_name

  UNION ALL

  SELECT
    pi.check_order,
    CASE WHEN cls.oid IS NULL THEN 'PASS' ELSE 'BLOCK' END,
    'phase_index_name_' || pi.index_name,
    CASE
      WHEN cls.oid IS NULL THEN 'No public relation named ' || pi.index_name || ' exists.'
      ELSE 'Index-name collision: public.' || pi.index_name || ' already exists.'
    END,
    CASE
      WHEN cls.oid IS NULL THEN 'No action required.'
      ELSE 'Stop and inspect the existing relation before migration review.'
    END
  FROM phase_indexes pi
  LEFT JOIN pg_catalog.pg_namespace ns ON ns.nspname = 'public'
  LEFT JOIN pg_catalog.pg_class cls ON cls.relnamespace = ns.oid AND cls.relname = pi.index_name

  UNION ALL

  SELECT
    pp.check_order,
    CASE WHEN pol.policyname IS NULL THEN 'PASS' ELSE 'BLOCK' END,
    'phase_policy_name_' || pp.table_name || '_' || pp.policy_name,
    CASE
      WHEN pol.policyname IS NULL THEN 'Policy ' || pp.policy_name || ' is absent from public.' || pp.table_name || '.'
      ELSE 'Policy collision: ' || pp.policy_name || ' already exists on public.' || pp.table_name || '.'
    END,
    CASE
      WHEN pol.policyname IS NULL THEN 'No action required.'
      ELSE 'Stop and inspect the existing policy and owning relation.'
    END
  FROM phase_policies pp
  LEFT JOIN pg_catalog.pg_policies pol
    ON pol.schemaname = 'public'
   AND pol.tablename = pp.table_name
   AND pol.policyname = pp.policy_name

  UNION ALL

  SELECT
    pci.check_order,
    CASE WHEN cls.oid IS NULL THEN 'PASS' ELSE 'BLOCK' END,
    'constraint_backing_name_' || pci.relation_name,
    CASE
      WHEN cls.oid IS NULL THEN 'No public relation uses the expected constraint-backed index name ' || pci.relation_name || '.'
      ELSE 'Name collision: public.' || pci.relation_name || ' already exists.'
    END,
    CASE
      WHEN cls.oid IS NULL THEN 'No action required.'
      ELSE 'Stop and inspect the existing object before migration review.'
    END
  FROM phase_constraint_indexes pci
  LEFT JOIN pg_catalog.pg_namespace ns ON ns.nspname = 'public'
  LEFT JOIN pg_catalog.pg_class cls ON cls.relnamespace = ns.oid AND cls.relname = pci.relation_name
),
summary AS (
  SELECT
    pg_catalog.bool_or(checks.severity = 'BLOCK') AS has_block,
    pg_catalog.bool_or(checks.severity = 'WARN') AS has_warn
  FROM checks
),
results AS (
  SELECT
    checks.check_order,
    checks.severity,
    checks.check_name,
    checks.detail,
    checks.recommended_action
  FROM checks

  UNION ALL

  SELECT
    999,
    CASE
      WHEN summary.has_block THEN 'BLOCK'
      WHEN summary.has_warn THEN 'WARN'
      ELSE 'PASS'
    END,
    'FINAL_ASSESSMENT',
    CASE
      WHEN summary.has_block THEN 'NOT_READY'
      WHEN summary.has_warn THEN 'REVIEW_REQUIRED'
      ELSE 'PREFLIGHT_PASS'
    END,
    CASE
      WHEN summary.has_block THEN 'Do not proceed; resolve every BLOCK and rerun this preflight.'
      WHEN summary.has_warn THEN 'Do not proceed until every WARN has a documented human review.'
      ELSE 'Preflight metadata checks passed; backup and separate approval are still required.'
    END
  FROM summary
)
SELECT
  results.check_order,
  results.severity,
  results.check_name,
  results.detail,
  results.recommended_action
FROM results
ORDER BY results.check_order;
