-- SANDBOX ONLY: remove the bootstrap sentinels and minimal prerequisite tables.
-- NEVER run this file against production project nlutpmjloryqdomgbqrr.
-- Run only after phase1_sandbox_rollback.sql has passed.

BEGIN;

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
      RAISE EXCEPTION 'Cleanup blocked: public.% still exists. Run and verify rollback first.', table_name;
    END IF;
  END LOOP;

  IF (SELECT count(*) FROM public.products) <> 1
     OR NOT EXISTS (
       SELECT 1 FROM public.products
       WHERE id = '00000000-0000-4000-8000-000000000001' AND name = 'SANDBOX SENTINEL PRODUCT'
     ) THEN
    RAISE EXCEPTION 'Cleanup blocked: products is not the expected sandbox bootstrap table.';
  END IF;
  IF (SELECT count(*) FROM public.ingredients) <> 1
     OR NOT EXISTS (
       SELECT 1 FROM public.ingredients
       WHERE id = '00000000-0000-4000-8000-000000000002' AND name_ko = 'SANDBOX SENTINEL INGREDIENT'
     ) THEN
    RAISE EXCEPTION 'Cleanup blocked: ingredients is not the expected sandbox bootstrap table.';
  END IF;
  IF (SELECT count(*) FROM public.allergens) <> 1
     OR NOT EXISTS (
       SELECT 1 FROM public.allergens
       WHERE id = '00000000-0000-4000-8000-000000000003' AND code = 'sandbox-sentinel-allergen'
     ) THEN
    RAISE EXCEPTION 'Cleanup blocked: allergens is not the expected sandbox bootstrap table.';
  END IF;
END
$$;

DELETE FROM public.products
WHERE id = '00000000-0000-4000-8000-000000000001';
DELETE FROM public.ingredients
WHERE id = '00000000-0000-4000-8000-000000000002';
DELETE FROM public.allergens
WHERE id = '00000000-0000-4000-8000-000000000003';

DROP TABLE public.products;
DROP TABLE public.ingredients;
DROP TABLE public.allergens;

DO $$
BEGIN
  IF to_regclass('public.products') IS NOT NULL
     OR to_regclass('public.ingredients') IS NOT NULL
     OR to_regclass('public.allergens') IS NOT NULL THEN
    RAISE EXCEPTION 'Cleanup failed: a bootstrap table still exists.';
  END IF;
  RAISE NOTICE 'PASS: sandbox bootstrap tables and sentinels were removed.';
END
$$;

COMMIT;
