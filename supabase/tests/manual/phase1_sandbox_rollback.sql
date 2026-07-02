-- SANDBOX ONLY: roll back only the 11 tables created by the Phase 1 migration.
-- NEVER run this file against production project nlutpmjloryqdomgbqrr.
-- The bootstrap tables and their sentinel rows must survive this script.

BEGIN;

-- Reverse dependency order. CASCADE is intentionally not used so an unexpected
-- dependent object stops rollback instead of being removed silently.
DROP TABLE IF EXISTS public.canonical_ingredient_review_queue;
DROP TABLE IF EXISTS public.canonical_ingredient_allergen_map;
DROP TABLE IF EXISTS public.product_ingredient_label_items;
DROP TABLE IF EXISTS public.product_ingredient_label_sets;
DROP TABLE IF EXISTS public.canonical_analysis_rule_evidence;
DROP TABLE IF EXISTS public.canonical_analysis_rules;
DROP TABLE IF EXISTS public.canonical_ingredient_evidence;
DROP TABLE IF EXISTS public.canonical_ingredient_aliases;
DROP TABLE IF EXISTS public.ingredient_evidence_sources;
DROP TABLE IF EXISTS public.canonical_ingredients;
DROP TABLE IF EXISTS public.analysis_engine_versions;

DO $$
DECLARE
  table_name text;
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
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      RAISE EXCEPTION 'Rollback failed: public.% still exists.', table_name;
    END IF;
  END LOOP;

  IF to_regclass('public.products') IS NULL
     OR to_regclass('public.ingredients') IS NULL
     OR to_regclass('public.allergens') IS NULL THEN
    RAISE EXCEPTION 'Rollback removed a bootstrap table.';
  END IF;

  IF (SELECT count(*) FROM public.products) <> 1
     OR NOT EXISTS (
       SELECT 1 FROM public.products
       WHERE id = '00000000-0000-4000-8000-000000000001' AND name = 'SANDBOX SENTINEL PRODUCT'
     ) THEN
    RAISE EXCEPTION 'products sentinel did not survive rollback.';
  END IF;
  IF (SELECT count(*) FROM public.ingredients) <> 1
     OR NOT EXISTS (
       SELECT 1 FROM public.ingredients
       WHERE id = '00000000-0000-4000-8000-000000000002' AND name_ko = 'SANDBOX SENTINEL INGREDIENT'
     ) THEN
    RAISE EXCEPTION 'ingredients sentinel did not survive rollback.';
  END IF;
  IF (SELECT count(*) FROM public.allergens) <> 1
     OR NOT EXISTS (
       SELECT 1 FROM public.allergens
       WHERE id = '00000000-0000-4000-8000-000000000003' AND code = 'sandbox-sentinel-allergen'
     ) THEN
    RAISE EXCEPTION 'allergens sentinel did not survive rollback.';
  END IF;

  RAISE NOTICE 'PASS: all 11 Phase 1 tables were removed; bootstrap tables and sentinels remain.';
END
$$;

COMMIT;
