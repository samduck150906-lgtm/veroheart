-- 스캔(바코드)→상품 매핑을 위한 products.barcode 컬럼.
-- nullable + 부분 유니크 인덱스(값이 있을 때만 유일, NULL 다수 허용) — 비파괴적 추가.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS barcode text;

COMMENT ON COLUMN public.products.barcode IS 'EAN/UPC 바코드. 앱 스캐너가 상품 매핑에 사용.';

CREATE UNIQUE INDEX IF NOT EXISTS products_barcode_key
  ON public.products (barcode)
  WHERE barcode IS NOT NULL;
