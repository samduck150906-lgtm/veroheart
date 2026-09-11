-- 리뷰 원본과 products.review_count / avg_rating의 불일치를 제거한다.
-- INSERT, UPDATE(평점/제품 변경), DELETE를 모두 처리하고 기존 행도 백필한다.

BEGIN;

CREATE OR REPLACE FUNCTION public.refresh_product_review_aggregate(p_product_id UUID)
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
  SET
    review_count = (
      SELECT COUNT(*)::INTEGER
      FROM public.reviews AS r
      WHERE r.product_id = p_product_id
    ),
    avg_rating = COALESCE((
      SELECT ROUND(AVG(r.rating)::NUMERIC, 2)
      FROM public.reviews AS r
      WHERE r.product_id = p_product_id
    ), 0)
  WHERE p.id = p_product_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_product_review_aggregate()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM public.refresh_product_review_aggregate(OLD.product_id);
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE')
     AND (TG_OP = 'INSERT' OR NEW.product_id IS DISTINCT FROM OLD.product_id OR NEW.rating IS DISTINCT FROM OLD.rating)
  THEN
    PERFORM public.refresh_product_review_aggregate(NEW.product_id);
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reviews_sync_product_aggregate ON public.reviews;
CREATE TRIGGER reviews_sync_product_aggregate
  AFTER INSERT OR UPDATE OF product_id, rating OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.sync_product_review_aggregate();

-- 마이그레이션 이전 리뷰까지 한 번에 맞춘다.
UPDATE public.products AS p
SET
  review_count = aggregate.review_count,
  avg_rating = aggregate.avg_rating
FROM (
  SELECT
    p2.id,
    COUNT(r.id)::INTEGER AS review_count,
    COALESCE(ROUND(AVG(r.rating)::NUMERIC, 2), 0) AS avg_rating
  FROM public.products AS p2
  LEFT JOIN public.reviews AS r ON r.product_id = p2.id
  GROUP BY p2.id
) AS aggregate
WHERE p.id = aggregate.id;

REVOKE ALL ON FUNCTION public.refresh_product_review_aggregate(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_product_review_aggregate() FROM PUBLIC, anon, authenticated;

COMMIT;
