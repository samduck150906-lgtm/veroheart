-- 쿠팡 파트너스 등 수동 발급 링크 (전체 URL). coupang_product_id와 병행 가능 — 앱은 링크 우선 사용.
--
-- 전제: public.products 가 이미 있어야 합니다.
--   Supabase CLI: migrations 폴더 전체 적용 시 20250403120000_veroheart_schema.sql 가 먼저 실행됩니다.
--   SQL Editor만 쓰는 경우: 아래 DO 블록 전에 20250403120000_veroheart_schema.sql 을 먼저 실행하세요.

DO $mig$
BEGIN
  IF to_regclass('public.products') IS NULL THEN
    RAISE EXCEPTION
      'public.products 테이블이 없습니다. supabase/migrations/20250403120000_veroheart_schema.sql 을 먼저 적용한 뒤 다시 실행하세요.';
  END IF;

  ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS coupang_link TEXT;

  COMMENT ON COLUMN public.products.coupang_link IS '쿠팡 파트너스 단축/랜딩 URL (https://...)';
END
$mig$;
