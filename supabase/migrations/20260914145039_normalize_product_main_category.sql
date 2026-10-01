UPDATE public.products SET main_category = '사료' WHERE BTRIM(main_category) = 'food';
UPDATE public.products SET main_category = '간식' WHERE BTRIM(main_category) = 'snack';
UPDATE public.products SET main_category = '영양제' WHERE BTRIM(main_category) IN ('supplement', 'supplements');

INSERT INTO public.product_categories (name, sort_order, is_active)
SELECT
  BTRIM(p.main_category),
  100 + (ROW_NUMBER() OVER (ORDER BY BTRIM(p.main_category)))::INTEGER,
  FALSE
FROM (SELECT DISTINCT main_category FROM public.products) AS p
WHERE NULLIF(BTRIM(p.main_category), '') IS NOT NULL
ON CONFLICT (name) DO NOTHING;

DELETE FROM public.product_categories AS c
WHERE c.name IN ('food', 'snack', 'supplement', 'supplements')
  AND NOT EXISTS (
    SELECT 1 FROM public.products AS p WHERE BTRIM(p.main_category) = c.name
  );;
