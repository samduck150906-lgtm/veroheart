CREATE TABLE IF NOT EXISTS public.product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  hint TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS product_categories_name_key
  ON public.product_categories (name);
CREATE INDEX IF NOT EXISTS idx_product_categories_order
  ON public.product_categories (is_active, sort_order, name);

COMMENT ON TABLE public.product_categories IS
  '앱 홈·검색 카테고리 칩과 관리자 제품 분류의 단일 원본. products.main_category 의 텍스트 값과 name 이 일치해야 매칭된다.';
COMMENT ON COLUMN public.product_categories.hint IS '홈 카테고리 카드의 한 줄 설명.';
COMMENT ON COLUMN public.product_categories.sort_order IS '작을수록 먼저 노출된다.';

ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_categories_public_select ON public.product_categories;
CREATE POLICY product_categories_public_select ON public.product_categories
  FOR SELECT
  TO anon, authenticated
  USING (is_active);

INSERT INTO public.product_categories (name, hint, sort_order) VALUES
  ('사료', '매일 먹는 주식', 10),
  ('간식', '훈련·보상용', 20),
  ('영양제', '부족한 영양 보충', 30)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.product_categories (name, sort_order, is_active)
SELECT
  BTRIM(p.main_category),
  100 + (ROW_NUMBER() OVER (ORDER BY BTRIM(p.main_category)))::INTEGER,
  FALSE
FROM (SELECT DISTINCT main_category FROM public.products) AS p
WHERE NULLIF(BTRIM(p.main_category), '') IS NOT NULL
ON CONFLICT (name) DO NOTHING;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pinned_order INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_products_pinned
  ON public.products (pinned_order, created_at DESC)
  WHERE is_pinned;

COMMENT ON COLUMN public.products.is_pinned IS
  'TRUE 면 사용자 앱 목록·검색 결과 상단에 고정 노출한다. 광고 슬롯(is_sponsored)과는 별개의 운영 고정이다.';
COMMENT ON COLUMN public.products.pinned_order IS
  '고정 제품끼리의 노출 순서. 작을수록 먼저 나온다.';;
