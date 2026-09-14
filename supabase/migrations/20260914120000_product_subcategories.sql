-- 서브 카테고리도 등록해서 고르게 한다.
--
-- 지금까지 제품의 서브 카테고리는 자유 입력이라 'dry' / 'snack' 같은 값이
-- 제각각 들어갔다. 메인 카테고리와 같은 테이블에 부모-자식으로 두어 관리
-- 화면 하나로 다루고, 제품 폼에서는 선택한 메인 카테고리의 자식만 보여 준다.

BEGIN;

ALTER TABLE public.product_categories
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.product_categories(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_product_categories_parent
  ON public.product_categories (parent_id, sort_order, name);

COMMENT ON COLUMN public.product_categories.parent_id IS
  'NULL 이면 메인 카테고리(products.main_category), 값이 있으면 그 카테고리의 서브 카테고리(products.sub_category).';

-- 이름 유니크 제약은 "같은 부모 안에서"로 좁힌다. 서로 다른 메인 카테고리 아래
-- 같은 이름의 서브 카테고리(예: 사료/건식, 간식/건식)를 둘 수 있어야 한다.
DROP INDEX IF EXISTS public.product_categories_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS product_categories_root_name_key
  ON public.product_categories (name)
  WHERE parent_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS product_categories_child_name_key
  ON public.product_categories (parent_id, name)
  WHERE parent_id IS NOT NULL;

-- 운영 DB 에 이미 쓰이는 sub_category 값을 해당 메인 카테고리 아래로 등록한다.
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
ON CONFLICT DO NOTHING;

COMMIT;

-- 검수 대기 제품을 앱에서 숨길지 여부. 검수가 끝나기 전에 켜면 목록이 비므로
-- 기본은 꺼짐이며, 관리자 콘솔 → 시스템 설정에서 켠다.
INSERT INTO public.app_settings (key, value, is_public, description) VALUES
  ('hide_unverified_products', 'false'::jsonb, TRUE,
   '켜면 검수 완료(verified) 제품만 사용자 앱에 노출한다. 검수가 끝나기 전에 켜면 목록이 비므로 기본은 false.')
ON CONFLICT (key) DO UPDATE SET is_public = TRUE;
