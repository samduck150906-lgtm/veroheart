BEGIN;

-- Keep the display category and machine type consistent for every writer,
-- including admin batch edits. Custom category names keep their explicit type.
CREATE OR REPLACE FUNCTION public.normalize_product_classification()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.main_category := NULLIF(btrim(regexp_replace(NEW.main_category, '\s+', ' ', 'g')), '');
  NEW.sub_category := NULLIF(btrim(regexp_replace(NEW.sub_category, '\s+', ' ', 'g')), '');
  IF NEW.main_category IS NULL THEN
    NEW.main_category := CASE NEW.product_type
      WHEN 'food' THEN '사료' WHEN 'snack' THEN '간식' WHEN 'supplement' THEN '영양제'
      ELSE NULL END;
  END IF;
  NEW.product_type := CASE NEW.main_category
    WHEN '사료' THEN 'food' WHEN '간식' THEN 'snack' WHEN '영양제' THEN 'supplement'
    ELSE NEW.product_type END;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.normalize_product_classification() FROM PUBLIC;

DROP TRIGGER IF EXISTS products_normalize_classification ON public.products;
CREATE TRIGGER products_normalize_classification
  BEFORE INSERT OR UPDATE OF main_category, sub_category, product_type ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.normalize_product_classification();

-- No visibility, verification, or ingredient claims are changed by this repair.
UPDATE public.products SET main_category = main_category
WHERE main_category IS DISTINCT FROM NULLIF(btrim(regexp_replace(main_category, '\s+', ' ', 'g')), '')
  OR sub_category IS DISTINCT FROM NULLIF(btrim(regexp_replace(sub_category, '\s+', ' ', 'g')), '')
  OR (NULLIF(btrim(main_category), '') IS NULL AND product_type IN ('food', 'snack', 'supplement'))
  OR (main_category = '사료' AND product_type IS DISTINCT FROM 'food')
  OR (main_category = '간식' AND product_type IS DISTINCT FROM 'snack')
  OR (main_category = '영양제' AND product_type IS DISTINCT FROM 'supplement');

COMMIT;
