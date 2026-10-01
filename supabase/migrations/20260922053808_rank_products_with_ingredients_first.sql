ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS ingredient_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS has_ingredients BOOLEAN
  GENERATED ALWAYS AS (ingredient_count > 0) STORED;

CREATE OR REPLACE FUNCTION public.refresh_product_ingredient_count(p_product_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_product_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.products AS p
  SET ingredient_count = (
    SELECT COUNT(*)
    FROM public.product_ingredients AS pi
    WHERE pi.product_id = p_product_id
  )
  WHERE p.id = p_product_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_product_ingredient_count_from_link()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM public.refresh_product_ingredient_count(OLD.product_id);
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM public.refresh_product_ingredient_count(NEW.product_id);
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS product_ingredients_sync_ingredient_count ON public.product_ingredients;
CREATE TRIGGER product_ingredients_sync_ingredient_count
  AFTER INSERT OR UPDATE OF product_id OR DELETE ON public.product_ingredients
  FOR EACH ROW EXECUTE FUNCTION public.sync_product_ingredient_count_from_link();

UPDATE public.products AS p
SET ingredient_count = (
  SELECT COUNT(*) FROM public.product_ingredients AS pi WHERE pi.product_id = p.id
);

REVOKE ALL ON FUNCTION public.refresh_product_ingredient_count(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_product_ingredient_count_from_link() FROM PUBLIC, anon, authenticated;;
