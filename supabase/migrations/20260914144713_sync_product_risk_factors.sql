CREATE OR REPLACE FUNCTION public.refresh_product_risk_factors(p_product_id UUID)
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
  SET has_risk_factors = ARRAY(
    SELECT DISTINCT i.name_ko
    FROM public.product_ingredients AS pi
    JOIN public.ingredients AS i ON i.id = pi.ingredient_id
    WHERE pi.product_id = p_product_id
      AND i.risk_level IN ('caution', 'danger')
      AND NULLIF(BTRIM(i.name_ko), '') IS NOT NULL
    ORDER BY i.name_ko
  )
  WHERE p.id = p_product_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_product_risk_factors_from_link()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM public.refresh_product_risk_factors(OLD.product_id);
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM public.refresh_product_risk_factors(NEW.product_id);
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_product_risk_factors_from_ingredient()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_product_id UUID;
BEGIN
  FOR v_product_id IN
    SELECT DISTINCT pi.product_id
    FROM public.product_ingredients AS pi
    WHERE pi.ingredient_id = NEW.id
  LOOP
    PERFORM public.refresh_product_risk_factors(v_product_id);
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS product_ingredients_sync_risk_factors ON public.product_ingredients;
CREATE TRIGGER product_ingredients_sync_risk_factors
  AFTER INSERT OR UPDATE OF product_id, ingredient_id OR DELETE ON public.product_ingredients
  FOR EACH ROW EXECUTE FUNCTION public.sync_product_risk_factors_from_link();

DROP TRIGGER IF EXISTS ingredients_sync_product_risk_factors ON public.ingredients;
CREATE TRIGGER ingredients_sync_product_risk_factors
  AFTER UPDATE OF risk_level, name_ko ON public.ingredients
  FOR EACH ROW
  WHEN (OLD.risk_level IS DISTINCT FROM NEW.risk_level OR OLD.name_ko IS DISTINCT FROM NEW.name_ko)
  EXECUTE FUNCTION public.sync_product_risk_factors_from_ingredient();

UPDATE public.products AS p
SET has_risk_factors = ARRAY(
  SELECT DISTINCT i.name_ko
  FROM public.product_ingredients AS pi
  JOIN public.ingredients AS i ON i.id = pi.ingredient_id
  WHERE pi.product_id = p.id
    AND i.risk_level IN ('caution', 'danger')
    AND NULLIF(BTRIM(i.name_ko), '') IS NOT NULL
  ORDER BY i.name_ko
);

REVOKE ALL ON FUNCTION public.refresh_product_risk_factors(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_product_risk_factors_from_link() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_product_risk_factors_from_ingredient() FROM PUBLIC, anon, authenticated;;
