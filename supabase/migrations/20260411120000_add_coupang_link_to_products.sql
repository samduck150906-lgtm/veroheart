-- 쿠팡 파트너스 등 수동 발급 링크 (전체 URL). coupang_product_id와 병행 가능 — 앱은 링크 우선 사용.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS coupang_link TEXT;

COMMENT ON COLUMN public.products.coupang_link IS '쿠팡 파트너스 단축/랜딩 URL (https://...)';
