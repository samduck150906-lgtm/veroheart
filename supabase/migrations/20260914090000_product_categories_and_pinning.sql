-- 관리자 콘솔에서 (1) 앱 카테고리 목록과 노출 순서를 직접 관리하고,
-- (2) 특정 제품을 목록 상단에 고정할 수 있게 한다.
--
-- 카테고리는 지금까지 Home.tsx / Search.tsx / AdminProducts.tsx 에 각각
-- 하드코딩돼 있어서 서로 값이 달랐다(앱 3개 vs 관리자 8개). 이 테이블이
-- 단일 원본이 되고, 앱은 활성 카테고리만 순서대로 읽는다.

BEGIN;

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

-- 앱(anon)은 활성 카테고리만 읽는다. 쓰기는 service_role(admin-write)만 한다.
DROP POLICY IF EXISTS product_categories_public_select ON public.product_categories;
CREATE POLICY product_categories_public_select ON public.product_categories
  FOR SELECT
  TO anon, authenticated
  USING (is_active);

-- 대량 임포트 제품 438건의 main_category 가 영문('food'/'snack')이라 앱의 한글
-- 카테고리 칩('사료'/'간식')과 한 건도 매칭되지 않았다. 칩이 거르는 값과 같은
-- 표기로 정규화한다. product_type 은 내부 분류라 그대로 둔다.
UPDATE public.products SET main_category = '사료' WHERE BTRIM(main_category) = 'food';
UPDATE public.products SET main_category = '간식' WHERE BTRIM(main_category) = 'snack';
UPDATE public.products SET main_category = '영양제' WHERE BTRIM(main_category) IN ('supplement', 'supplements');

-- 기존 앱 카테고리 3종을 먼저 고정 순서로 넣는다(현재 Home.tsx 문구 그대로).
INSERT INTO public.product_categories (name, hint, sort_order) VALUES
  ('사료', '매일 먹는 주식', 10),
  ('간식', '훈련·보상용', 20),
  ('영양제', '부족한 영양 보충', 30)
ON CONFLICT (name) DO NOTHING;

-- 정규화 후에도 남는 main_category 값은 빠짐없이 등록한다. 앱 칩으로 쓸지는
-- 아직 정해지지 않았으므로 비활성으로 넣고 관리자가 켜도록 한다.
INSERT INTO public.product_categories (name, sort_order, is_active)
SELECT
  BTRIM(p.main_category),
  100 + (ROW_NUMBER() OVER (ORDER BY BTRIM(p.main_category)))::INTEGER,
  FALSE
FROM (SELECT DISTINCT main_category FROM public.products) AS p
WHERE NULLIF(BTRIM(p.main_category), '') IS NOT NULL
ON CONFLICT (name) DO NOTHING;

-- 정규화로 더 이상 쓰이지 않는 영문 카테고리 행은 남기지 않는다.
DELETE FROM public.product_categories AS c
WHERE c.name IN ('food', 'snack', 'supplement', 'supplements')
  AND NOT EXISTS (
    SELECT 1 FROM public.products AS p WHERE BTRIM(p.main_category) = c.name
  );

-- ── 제품 상단 고정 ──────────────────────────────────────────────────────────
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pinned_order INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_products_pinned
  ON public.products (pinned_order, created_at DESC)
  WHERE is_pinned;

COMMENT ON COLUMN public.products.is_pinned IS
  'TRUE 면 사용자 앱 목록·검색 결과 상단에 고정 노출한다. 광고 슬롯(is_sponsored)과는 별개의 운영 고정이다.';
COMMENT ON COLUMN public.products.pinned_order IS
  '고정 제품끼리의 노출 순서. 작을수록 먼저 나온다.';

COMMIT;
