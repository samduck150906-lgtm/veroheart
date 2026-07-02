-- SANDBOX ONLY: verify the Phase 1 migration after bootstrap and migration execution.
-- NEVER run this file against production project nlutpmjloryqdomgbqrr.
-- Every failed assertion raises an exception and stops the script.

DO $$
DECLARE
  item record;
  actual_count integer;
  actual_names text[];
  new_tables constant text[] := ARRAY[
    'analysis_engine_versions',
    'canonical_ingredients',
    'canonical_ingredient_aliases',
    'ingredient_evidence_sources',
    'canonical_ingredient_evidence',
    'canonical_analysis_rules',
    'canonical_analysis_rule_evidence',
    'product_ingredient_label_sets',
    'product_ingredient_label_items',
    'canonical_ingredient_allergen_map',
    'canonical_ingredient_review_queue'
  ];
BEGIN
  -- All 11 additive tables must exist and have RLS enabled.
  FOREACH item IN ARRAY new_tables
  LOOP
    NULL;
  END LOOP;
EXCEPTION
  WHEN datatype_mismatch THEN
    -- PostgreSQL cannot FOREACH a record over text[]. The real checks below use SELECT loops.
    RAISE;
END
$$;

DO $$
DECLARE
  table_name text;
  row_count bigint;
  actual_names text[];
  item record;
BEGIN
  FOR table_name IN
    SELECT unnest(ARRAY[
      'analysis_engine_versions',
      'canonical_ingredients',
      'canonical_ingredient_aliases',
      'ingredient_evidence_sources',
      'canonical_ingredient_evidence',
      'canonical_analysis_rules',
      'canonical_analysis_rule_evidence',
      'product_ingredient_label_sets',
      'product_ingredient_label_items',
      'canonical_ingredient_allergen_map',
      'canonical_ingredient_review_queue'
    ])
  LOOP
    IF to_regclass(format('public.%I', table_name)) IS NULL THEN
      RAISE EXCEPTION 'Missing Phase 1 table: public.%', table_name;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = table_name
        AND c.relrowsecurity
    ) THEN
      RAISE EXCEPTION 'RLS is not enabled on public.%', table_name;
    END IF;

    EXECUTE format('SELECT count(*) FROM public.%I', table_name) INTO row_count;
    IF row_count <> 0 THEN
      RAISE EXCEPTION 'Expected public.% to be empty, found % rows.', table_name, row_count;
    END IF;
  END LOOP;

  -- Exactly the ten intended public SELECT policies must exist. The review queue has none.
  FOR item IN
    SELECT * FROM (VALUES
      ('analysis_engine_versions', 'analysis_engine_versions_read'),
      ('canonical_ingredients', 'canonical_ingredients_read'),
      ('canonical_ingredient_aliases', 'canonical_ingredient_aliases_read'),
      ('ingredient_evidence_sources', 'ingredient_evidence_sources_read'),
      ('canonical_ingredient_evidence', 'canonical_ingredient_evidence_read'),
      ('canonical_analysis_rules', 'canonical_analysis_rules_read'),
      ('canonical_analysis_rule_evidence', 'canonical_analysis_rule_evidence_read'),
      ('product_ingredient_label_sets', 'product_ingredient_label_sets_read'),
      ('product_ingredient_label_items', 'product_ingredient_label_items_read'),
      ('canonical_ingredient_allergen_map', 'canonical_ingredient_allergen_map_read')
    ) AS expected(table_name, policy_name)
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies p
      WHERE p.schemaname = 'public'
        AND p.tablename = item.table_name
        AND p.policyname = item.policy_name
        AND p.cmd = 'SELECT'
        AND p.qual = 'true'
    ) THEN
      RAISE EXCEPTION 'Missing or incorrect public read policy %.%','public.' || item.table_name, item.policy_name;
    END IF;
  END LOOP;

  SELECT count(*) INTO row_count
  FROM pg_policies p
  WHERE p.schemaname = 'public'
    AND p.tablename = ANY (ARRAY[
      'analysis_engine_versions', 'canonical_ingredients', 'canonical_ingredient_aliases',
      'ingredient_evidence_sources', 'canonical_ingredient_evidence', 'canonical_analysis_rules',
      'canonical_analysis_rule_evidence', 'product_ingredient_label_sets',
      'product_ingredient_label_items', 'canonical_ingredient_allergen_map',
      'canonical_ingredient_review_queue'
    ]);
  IF row_count <> 10 THEN
    RAISE EXCEPTION 'Expected exactly 10 Phase 1 policies, found %.', row_count;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'canonical_ingredient_review_queue'
  ) THEN
    RAISE EXCEPTION 'The review queue must not have a client policy.';
  END IF;

  -- Validate every Phase 1 foreign key by child column, parent table, and parent column.
  FOR item IN
    SELECT * FROM (VALUES
      ('canonical_ingredients', 'legacy_ingredient_id', 'ingredients', 'id'),
      ('canonical_ingredient_aliases', 'canonical_ingredient_id', 'canonical_ingredients', 'id'),
      ('canonical_ingredient_evidence', 'canonical_ingredient_id', 'canonical_ingredients', 'id'),
      ('canonical_ingredient_evidence', 'source_id', 'ingredient_evidence_sources', 'id'),
      ('canonical_analysis_rules', 'engine_version_id', 'analysis_engine_versions', 'id'),
      ('canonical_analysis_rules', 'canonical_ingredient_id', 'canonical_ingredients', 'id'),
      ('canonical_analysis_rule_evidence', 'rule_id', 'canonical_analysis_rules', 'id'),
      ('canonical_analysis_rule_evidence', 'source_id', 'ingredient_evidence_sources', 'id'),
      ('product_ingredient_label_sets', 'product_id', 'products', 'id'),
      ('product_ingredient_label_items', 'label_set_id', 'product_ingredient_label_sets', 'id'),
      ('product_ingredient_label_items', 'legacy_ingredient_id', 'ingredients', 'id'),
      ('product_ingredient_label_items', 'canonical_ingredient_id', 'canonical_ingredients', 'id'),
      ('canonical_ingredient_allergen_map', 'canonical_ingredient_id', 'canonical_ingredients', 'id'),
      ('canonical_ingredient_allergen_map', 'allergen_id', 'allergens', 'id'),
      ('canonical_ingredient_allergen_map', 'source_id', 'ingredient_evidence_sources', 'id'),
      ('canonical_ingredient_review_queue', 'label_item_id', 'product_ingredient_label_items', 'id'),
      ('canonical_ingredient_review_queue', 'resolution_ingredient_id', 'canonical_ingredients', 'id')
    ) AS expected(child_table, child_column, parent_table, parent_column)
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint c
      JOIN pg_class child ON child.oid = c.conrelid
      JOIN pg_namespace child_ns ON child_ns.oid = child.relnamespace
      JOIN pg_class parent ON parent.oid = c.confrelid
      JOIN pg_namespace parent_ns ON parent_ns.oid = parent.relnamespace
      JOIN pg_attribute child_col ON child_col.attrelid = child.oid AND child_col.attnum = c.conkey[1]
      JOIN pg_attribute parent_col ON parent_col.attrelid = parent.oid AND parent_col.attnum = c.confkey[1]
      WHERE c.contype = 'f'
        AND array_length(c.conkey, 1) = 1
        AND child_ns.nspname = 'public'
        AND parent_ns.nspname = 'public'
        AND child.relname = item.child_table
        AND child_col.attname = item.child_column
        AND parent.relname = item.parent_table
        AND parent_col.attname = item.parent_column
    ) THEN
      RAISE EXCEPTION 'Missing FK public.%.% -> public.%.%', item.child_table, item.child_column, item.parent_table, item.parent_column;
    END IF;
  END LOOP;

  SELECT count(*) INTO row_count
  FROM pg_constraint c
  JOIN pg_class child ON child.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = child.relnamespace
  WHERE c.contype = 'f'
    AND n.nspname = 'public'
    AND child.relname = ANY (ARRAY[
      'analysis_engine_versions', 'canonical_ingredients', 'canonical_ingredient_aliases',
      'ingredient_evidence_sources', 'canonical_ingredient_evidence', 'canonical_analysis_rules',
      'canonical_analysis_rule_evidence', 'product_ingredient_label_sets',
      'product_ingredient_label_items', 'canonical_ingredient_allergen_map',
      'canonical_ingredient_review_queue'
    ]);
  IF row_count <> 17 THEN
    RAISE EXCEPTION 'Expected exactly 17 Phase 1 foreign keys, found %.', row_count;
  END IF;

  -- Required primary and unique constraints.
  FOR item IN
    SELECT * FROM (VALUES
      ('analysis_engine_versions', 'analysis_engine_versions_pkey'),
      ('canonical_ingredients', 'canonical_ingredients_pkey'),
      ('canonical_ingredient_aliases', 'canonical_ingredient_aliases_pkey'),
      ('ingredient_evidence_sources', 'ingredient_evidence_sources_pkey'),
      ('canonical_ingredient_evidence', 'canonical_ingredient_evidence_pkey'),
      ('canonical_analysis_rules', 'canonical_analysis_rules_pkey'),
      ('canonical_analysis_rule_evidence', 'canonical_analysis_rule_evidence_pkey'),
      ('product_ingredient_label_sets', 'product_ingredient_label_sets_pkey'),
      ('product_ingredient_label_items', 'product_ingredient_label_items_pkey'),
      ('canonical_ingredient_allergen_map', 'canonical_ingredient_allergen_map_pkey'),
      ('canonical_ingredient_review_queue', 'canonical_ingredient_review_queue_pkey'),
      ('analysis_engine_versions', 'analysis_engine_versions_version_key'),
      ('canonical_ingredients', 'canonical_ingredients_normalized_key'),
      ('canonical_ingredients', 'canonical_ingredients_name_ko_key'),
      ('canonical_ingredient_aliases', 'canonical_ingredient_aliases_normalized_key'),
      ('canonical_ingredient_evidence', 'canonical_ingredient_evidence_unique'),
      ('canonical_analysis_rules', 'canonical_analysis_rules_version_key'),
      ('product_ingredient_label_items', 'product_ingredient_label_items_order_key')
    ) AS expected(table_name, constraint_name)
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public'
        AND t.relname = item.table_name
        AND c.conname = item.constraint_name
        AND c.contype IN ('p', 'u')
    ) THEN
      RAISE EXCEPTION 'Missing primary/unique constraint public.%.%', item.table_name, item.constraint_name;
    END IF;
  END LOOP;

  -- Required supporting indexes, including the two partial unique indexes.
  FOR item IN
    SELECT unnest(ARRAY[
      'idx_canonical_ingredients_legacy_id',
      'idx_canonical_ingredient_aliases_ingredient',
      'idx_canonical_ingredient_aliases_normalized',
      'idx_ingredient_evidence_sources_doi',
      'idx_canonical_ingredient_evidence_source',
      'idx_canonical_analysis_rules_active',
      'idx_product_ingredient_label_sets_product',
      'idx_product_ingredient_label_sets_one_current',
      'idx_product_ingredient_label_items_legacy',
      'idx_product_ingredient_label_items_canonical',
      'idx_canonical_ingredient_allergen_allergen',
      'idx_canonical_ingredient_review_queue_status',
      'idx_canonical_ingredient_review_queue_open_text'
    ]) AS index_name
  LOOP
    IF to_regclass(format('public.%I', item.index_name)) IS NULL THEN
      RAISE EXCEPTION 'Missing Phase 1 index public.%', item.index_name;
    END IF;
  END LOOP;

  -- Bootstrap sentinels and table shapes must remain unchanged.
  IF (SELECT count(*) FROM public.products) <> 1
     OR NOT EXISTS (
       SELECT 1 FROM public.products
       WHERE id = '00000000-0000-4000-8000-000000000001' AND name = 'SANDBOX SENTINEL PRODUCT'
     ) THEN
    RAISE EXCEPTION 'products sentinel was changed or removed.';
  END IF;
  IF (SELECT count(*) FROM public.ingredients) <> 1
     OR NOT EXISTS (
       SELECT 1 FROM public.ingredients
       WHERE id = '00000000-0000-4000-8000-000000000002' AND name_ko = 'SANDBOX SENTINEL INGREDIENT'
     ) THEN
    RAISE EXCEPTION 'ingredients sentinel was changed or removed.';
  END IF;
  IF (SELECT count(*) FROM public.allergens) <> 1
     OR NOT EXISTS (
       SELECT 1 FROM public.allergens
       WHERE id = '00000000-0000-4000-8000-000000000003' AND code = 'sandbox-sentinel-allergen'
     ) THEN
    RAISE EXCEPTION 'allergens sentinel was changed or removed.';
  END IF;

  FOR item IN
    SELECT * FROM (VALUES
      ('products', ARRAY['id', 'name']::text[]),
      ('ingredients', ARRAY['id', 'name_ko']::text[]),
      ('allergens', ARRAY['code', 'id']::text[])
    ) AS expected(table_name, column_names)
  LOOP
    SELECT array_agg(column_name ORDER BY column_name) INTO actual_names
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = item.table_name;
    IF actual_names IS DISTINCT FROM item.column_names THEN
      RAISE EXCEPTION 'Bootstrap table public.% changed. Expected columns %, found %.', item.table_name, item.column_names, actual_names;
    END IF;
  END LOOP;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('products', 'ingredients', 'allergens')
      AND column_name = 'id'
      AND data_type <> 'uuid'
  ) THEN
    RAISE EXCEPTION 'A bootstrap id column is no longer UUID.';
  END IF;

  RAISE NOTICE 'PASS: Phase 1 migration created 11 empty tables with expected RLS, policies, FKs, constraints, indexes, and untouched sentinels.';
END
$$;
