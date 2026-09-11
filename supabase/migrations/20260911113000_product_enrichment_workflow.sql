-- 제품 누락 데이터를 삭제/숨김으로 처리하지 않고 출처와 검수 상태가 남는 운영 큐로 만든다.

BEGIN;

CREATE TABLE IF NOT EXISTS public.product_data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN (
    'manufacturer', 'brand_official', 'official_distributor', 'retailer', 'label_image', 'other'
  )),
  source_url TEXT NOT NULL,
  source_title TEXT,
  retrieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fields_verified TEXT[] NOT NULL DEFAULT '{}',
  confidence TEXT NOT NULL DEFAULT 'unverified' CHECK (confidence IN (
    'official', 'high', 'medium_high', 'medium', 'low', 'unverified'
  )),
  raw_ingredient_text TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, source_url)
);

CREATE TABLE IF NOT EXISTS public.product_enrichment_queue (
  product_id UUID PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'in_progress', 'needs_variant', 'ready_for_review', 'completed', 'blocked'
  )),
  missing_fields TEXT[] NOT NULL DEFAULT '{}',
  review_note TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_data_sources_product_id
  ON public.product_data_sources(product_id);
CREATE INDEX IF NOT EXISTS idx_product_enrichment_queue_status
  ON public.product_enrichment_queue(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_enrichment_queue_missing_fields
  ON public.product_enrichment_queue USING GIN(missing_fields);

ALTER TABLE public.product_data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_enrichment_queue ENABLE ROW LEVEL SECURITY;

-- service_role 기반 admin-write만 읽고 쓴다. 공개 정책은 만들지 않는다.
REVOKE ALL ON TABLE public.product_data_sources FROM anon, authenticated;
REVOKE ALL ON TABLE public.product_enrichment_queue FROM anon, authenticated;

-- 반복 실행 가능한 최초 큐 백필. 이미 운영자가 지정한 status/note는 보존한다.
INSERT INTO public.product_enrichment_queue (product_id, missing_fields)
SELECT
  p.id,
  ARRAY_REMOVE(ARRAY[
    CASE WHEN NOT EXISTS (
      SELECT 1 FROM public.product_ingredients AS pi WHERE pi.product_id = p.id
    ) THEN 'ingredients' END,
    CASE WHEN NOT EXISTS (
      SELECT 1 FROM public.nutritional_profiles AS np WHERE np.product_id = p.id
    ) THEN 'nutrition' END,
    CASE WHEN NULLIF(BTRIM(p.barcode), '') IS NULL THEN 'barcode' END,
    CASE WHEN NULLIF(BTRIM(p.image_url), '') IS NULL THEN 'image' END
  ]::TEXT[], NULL)
FROM public.products AS p
WHERE
  NOT EXISTS (SELECT 1 FROM public.product_ingredients AS pi WHERE pi.product_id = p.id)
  OR NOT EXISTS (SELECT 1 FROM public.nutritional_profiles AS np WHERE np.product_id = p.id)
  OR NULLIF(BTRIM(p.barcode), '') IS NULL
  OR NULLIF(BTRIM(p.image_url), '') IS NULL
ON CONFLICT (product_id) DO UPDATE
  SET missing_fields = EXCLUDED.missing_fields,
      updated_at = NOW()
  WHERE product_enrichment_queue.status NOT IN ('in_progress', 'needs_variant', 'blocked');

CREATE OR REPLACE FUNCTION public.refresh_product_enrichment_queue(p_product_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_missing TEXT[];
BEGIN
  IF p_product_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.products WHERE id = p_product_id) THEN
    RETURN;
  END IF;

  SELECT ARRAY_REMOVE(ARRAY[
    CASE WHEN NOT EXISTS (
      SELECT 1 FROM public.product_ingredients AS pi WHERE pi.product_id = p.id
    ) THEN 'ingredients' END,
    CASE WHEN NOT EXISTS (
      SELECT 1 FROM public.nutritional_profiles AS np WHERE np.product_id = p.id
    ) THEN 'nutrition' END,
    CASE WHEN NULLIF(BTRIM(p.barcode), '') IS NULL THEN 'barcode' END,
    CASE WHEN NULLIF(BTRIM(p.image_url), '') IS NULL THEN 'image' END
  ]::TEXT[], NULL)
  INTO v_missing
  FROM public.products AS p
  WHERE p.id = p_product_id;

  INSERT INTO public.product_enrichment_queue (product_id, status, missing_fields)
  VALUES (
    p_product_id,
    CASE WHEN CARDINALITY(v_missing) = 0 THEN 'ready_for_review' ELSE 'pending' END,
    v_missing
  )
  ON CONFLICT (product_id) DO UPDATE
  SET missing_fields = EXCLUDED.missing_fields,
      status = CASE
        WHEN CARDINALITY(EXCLUDED.missing_fields) = 0
             AND product_enrichment_queue.status IN ('pending', 'in_progress')
          THEN 'ready_for_review'
        ELSE product_enrichment_queue.status
      END,
      updated_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_product_enrichment_queue()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM public.refresh_product_enrichment_queue(OLD.product_id);
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM public.refresh_product_enrichment_queue(NEW.product_id);
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_product_enrichment_queue_from_product()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM public.refresh_product_enrichment_queue(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_sync_enrichment_queue ON public.products;
CREATE TRIGGER products_sync_enrichment_queue
  AFTER INSERT OR UPDATE OF barcode, image_url ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.sync_product_enrichment_queue_from_product();

DROP TRIGGER IF EXISTS product_ingredients_sync_enrichment_queue ON public.product_ingredients;
CREATE TRIGGER product_ingredients_sync_enrichment_queue
  AFTER INSERT OR UPDATE OF product_id OR DELETE ON public.product_ingredients
  FOR EACH ROW EXECUTE FUNCTION public.sync_product_enrichment_queue();

DROP TRIGGER IF EXISTS nutritional_profiles_sync_enrichment_queue ON public.nutritional_profiles;
CREATE TRIGGER nutritional_profiles_sync_enrichment_queue
  AFTER INSERT OR UPDATE OF product_id OR DELETE ON public.nutritional_profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_product_enrichment_queue();

REVOKE ALL ON FUNCTION public.refresh_product_enrichment_queue(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_product_enrichment_queue() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_product_enrichment_queue_from_product() FROM PUBLIC, anon, authenticated;

COMMIT;
