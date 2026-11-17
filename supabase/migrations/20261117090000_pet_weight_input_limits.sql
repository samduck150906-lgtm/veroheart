BEGIN;
-- Application input limits, not veterinary healthy-weight thresholds.
-- Existing records remain intact; new inserts and weight/species edits validate.
CREATE OR REPLACE FUNCTION private.check_pet_weight_input()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.weight IS NOT NULL AND (
    NEW.weight <= 0 OR NEW.weight::text IN ('NaN', 'Infinity', '-Infinity')
    OR (NEW.pet_type::text = 'dog' AND NEW.weight > 150)
    OR (NEW.pet_type::text = 'cat' AND NEW.weight > 30)
  ) THEN
    RAISE EXCEPTION 'pet_weight_out_of_supported_range' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS pets_weight_input_limit ON public.pets;
CREATE TRIGGER pets_weight_input_limit BEFORE INSERT OR UPDATE OF weight, pet_type
ON public.pets FOR EACH ROW EXECUTE FUNCTION private.check_pet_weight_input();
COMMIT;
