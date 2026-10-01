ALTER TABLE public.product_categories
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.product_categories(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_product_categories_parent
  ON public.product_categories (parent_id, sort_order, name);

COMMENT ON COLUMN public.product_categories.parent_id IS
  'NULL 이면 메인 카테고리(products.main_category), 값이 있으면 그 카테고리의 서브 카테고리(products.sub_category).';

DROP INDEX IF EXISTS public.product_categories_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS product_categories_root_name_key
  ON public.product_categories (name)
  WHERE parent_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS product_categories_child_name_key
  ON public.product_categories (parent_id, name)
  WHERE parent_id IS NOT NULL;

INSERT INTO public.product_categories (name, parent_id, sort_order, is_active)
SELECT
  sub.sub_category,
  parent.id,
  10 * (ROW_NUMBER() OVER (PARTITION BY parent.id ORDER BY sub.sub_category))::INTEGER,
  TRUE
FROM (
  SELECT DISTINCT BTRIM(main_category) AS main_category, BTRIM(sub_category) AS sub_category
  FROM public.products
  WHERE NULLIF(BTRIM(sub_category), '') IS NOT NULL
    AND NULLIF(BTRIM(main_category), '') IS NOT NULL
) AS sub
JOIN public.product_categories AS parent
  ON parent.name = sub.main_category AND parent.parent_id IS NULL
ON CONFLICT DO NOTHING;;
