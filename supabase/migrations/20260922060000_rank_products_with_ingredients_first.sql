-- 목록 상단이 "원재료 미입력" 제품으로 채워지는 것을 구조로 막는다.
--
-- 사용자 목록은 최신순이라, 제품명만 수집하고 원재료를 못 채운 묶음이 들어오면
-- 첫 화면이 통째로 "원료 정보 부족"이 된다. 2026-09-22 기준 노출 제품 459개 중
-- 145개가 원재료 0건이었고, 하필 그 묶음이 최근에 들어와 첫 50개 중 45개를
-- 차지했다 — 연결이 끊긴 것처럼 보이지만 실제로는 채워지지 않은 데이터였다.
--
-- 제품을 감추는 대신 뒤로 보낸다. 카탈로그와 검색은 그대로 두고, 분석할 수 있는
-- 제품이 먼저 보이게만 한다. 정렬 기준은 개수가 아니라 "있다/없다"다 — 원재료
-- 40개짜리 사료가 5개짜리 간식보다 늘 위로 가면 목록이 그것대로 한쪽으로 쏠린다.
--
-- products.ingredient_count 는 has_risk_factors 와 같은 성격의 파생 캐시다.
-- 단일 원본은 product_ingredients 이고, 트리거가 그 값을 따라간다.

BEGIN;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS ingredient_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS has_ingredients BOOLEAN
  GENERATED ALWAYS AS (ingredient_count > 0) STORED;

CREATE OR REPLACE FUNCTION public.refresh_product_ingredient_count(p_product_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_product_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.products AS p
  SET ingredient_count = (
    SELECT COUNT(*)
    FROM public.product_ingredients AS pi
    WHERE pi.product_id = p_product_id
  )
  WHERE p.id = p_product_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_product_ingredient_count_from_link()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM public.refresh_product_ingredient_count(OLD.product_id);
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM public.refresh_product_ingredient_count(NEW.product_id);
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS product_ingredients_sync_ingredient_count ON public.product_ingredients;
CREATE TRIGGER product_ingredients_sync_ingredient_count
  AFTER INSERT OR UPDATE OF product_id OR DELETE ON public.product_ingredients
  FOR EACH ROW EXECUTE FUNCTION public.sync_product_ingredient_count_from_link();

-- 기존 제품 전체 백필. 원재료가 없으면 0 이 되고, has_ingredients 가 따라서 false 가 된다.
UPDATE public.products AS p
SET ingredient_count = (
  SELECT COUNT(*) FROM public.product_ingredients AS pi WHERE pi.product_id = p.id
);

REVOKE ALL ON FUNCTION public.refresh_product_ingredient_count(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_product_ingredient_count_from_link() FROM PUBLIC, anon, authenticated;

COMMIT;
