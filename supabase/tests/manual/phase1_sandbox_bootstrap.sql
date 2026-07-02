-- SANDBOX ONLY: bootstrap the minimum legacy tables required by the Phase 1 migration.
-- NEVER run this file against production project nlutpmjloryqdomgbqrr.
-- No production data, credentials, or secrets are required.
--
-- Repository evidence:
-- * supabase/migrations/20250403120000_veroro_schema.sql defines
--   products.id and ingredients.id as UUID primary keys.
-- * supabase/migrations/20260408090000_personalized_allergy_scoring.sql defines
--   allergens.id as a UUID primary key.
-- * supabase/migrations/20260630090000_non_destructive_ingredient_schema.sql
--   references only those three existing tables, always through their id columns.

BEGIN;

DO $$
DECLARE
  relation_name text;
BEGIN
  IF to_regprocedure('gen_random_uuid()') IS NULL THEN
    RAISE EXCEPTION 'gen_random_uuid() is unavailable. Stop: this is not a compatible Supabase PostgreSQL sandbox.';
  END IF;

  FOREACH relation_name IN ARRAY ARRAY[
    'products',
    'ingredients',
    'allergens',
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
  ]
  LOOP
    IF to_regclass(format('public.%I', relation_name)) IS NOT NULL THEN
      RAISE EXCEPTION 'Expected an empty sandbox, but public.% already exists.', relation_name;
    END IF;
  END LOOP;
END
$$;

-- Minimal columns only. These are intentionally not copies of production tables.
CREATE TABLE public.products (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE public.ingredients (
  id UUID PRIMARY KEY,
  name_ko TEXT NOT NULL
);

CREATE TABLE public.allergens (
  id UUID PRIMARY KEY,
  code TEXT NOT NULL UNIQUE
);

INSERT INTO public.products (id, name)
VALUES ('00000000-0000-4000-8000-000000000001', 'SANDBOX SENTINEL PRODUCT');

INSERT INTO public.ingredients (id, name_ko)
VALUES ('00000000-0000-4000-8000-000000000002', 'SANDBOX SENTINEL INGREDIENT');

INSERT INTO public.allergens (id, code)
VALUES ('00000000-0000-4000-8000-000000000003', 'sandbox-sentinel-allergen');

COMMIT;
