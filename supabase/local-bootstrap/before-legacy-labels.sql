-- LOCAL EMPTY-DATABASE BOOTSTRAP ONLY. Never add this file to the production ledger.
-- The historical label migration references four product IDs absent from the ledger.
-- Keep those orphan label rows out instead of inventing products or disabling FK checks.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.products) THEN
    RAISE EXCEPTION 'Local bootstrap requires an empty products table';
  END IF;
END $$;

CREATE SCHEMA local_bootstrap;
REVOKE ALL ON SCHEMA local_bootstrap FROM PUBLIC, anon, authenticated;
CREATE TABLE local_bootstrap.skipped_rows(table_name text NOT NULL, product_id uuid NOT NULL);

CREATE FUNCTION local_bootstrap.skip_known_orphan_label()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, local_bootstrap AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.products WHERE id = NEW.product_id) THEN RETURN NEW; END IF;
  IF NEW.product_id NOT IN (
    'ec8be15a-7fbd-4782-8c55-f8d8c8ace13c'::uuid,
    'e5337da4-1c3e-4eb7-b0c7-9d053c549b7e'::uuid,
    '55d047e0-44b1-434f-922c-86f19af0cd66'::uuid,
    '042e1eab-736a-4b77-b1b1-3da9e16eea27'::uuid
  ) THEN RAISE EXCEPTION 'Unexpected missing product in local bootstrap: %', NEW.product_id; END IF;
  INSERT INTO local_bootstrap.skipped_rows VALUES (TG_TABLE_NAME, NEW.product_id);
  RETURN NULL;
END $$;

CREATE TRIGGER local_bootstrap_orphan_guard BEFORE INSERT ON public.product_ingredients
FOR EACH ROW EXECUTE FUNCTION local_bootstrap.skip_known_orphan_label();
CREATE TRIGGER local_bootstrap_orphan_guard BEFORE INSERT ON public.nutritional_profiles
FOR EACH ROW EXECUTE FUNCTION local_bootstrap.skip_known_orphan_label();
