-- 관리자 콘솔에서 사용자 앱 제품 노출 여부를 제어한다.
-- 기존 제품은 서비스 연속성을 위해 모두 노출 상태로 시작한다.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_visible BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE public.products
SET is_visible = TRUE
WHERE is_visible IS NULL;

CREATE INDEX IF NOT EXISTS idx_products_visible_created_at
  ON public.products (is_visible, created_at DESC);

COMMENT ON COLUMN public.products.is_visible IS
  'TRUE면 사용자 앱 목록·검색·상세에 노출. FALSE면 관리자 콘솔에서만 관리.';
