-- Remove the narrowly scoped local guard immediately after the one legacy migration.
DO $$ DECLARE skipped integer; BEGIN
  SELECT count(*) INTO skipped FROM local_bootstrap.skipped_rows;
  IF skipped = 0 THEN RAISE EXCEPTION 'Expected missing historical product rows were not encountered'; END IF;
  IF EXISTS (SELECT 1 FROM public.products) THEN RAISE EXCEPTION 'Local bootstrap must not create placeholder products'; END IF;
  RAISE NOTICE 'Local bootstrap skipped % orphan ingredient/nutrition rows for four absent historical products', skipped;
END $$;
DROP TRIGGER local_bootstrap_orphan_guard ON public.product_ingredients;
DROP TRIGGER local_bootstrap_orphan_guard ON public.nutritional_profiles;
DROP SCHEMA local_bootstrap CASCADE;
