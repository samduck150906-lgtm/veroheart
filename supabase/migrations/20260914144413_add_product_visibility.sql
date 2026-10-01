ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_visible BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE public.products
SET is_visible = TRUE
WHERE is_visible IS NULL;

CREATE INDEX IF NOT EXISTS idx_products_visible_created_at
  ON public.products (is_visible, created_at DESC);

COMMENT ON COLUMN public.products.is_visible IS
  'TRUE면 사용자 앱 목록·검색·상세에 노출. FALSE면 관리자 콘솔에서만 관리.';;
