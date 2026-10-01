-- 20260728140000_admin_console_operations.sql
-- 관리자 콘솔 운영 기능(성분 CRUD · 제품 원재료 편집 · 미매칭 큐 검수 ·
-- 시스템 설정 · 제품 이미지 업로드 · 목록 페이지네이션)을 동작시키기 위한 최소 스키마 보강.
-- 비파괴 · 멱등. RLS 완화 없음(관리자 쓰기는 service_role Edge Function 경유).

-- ─── 1) ingredients.category ────────────────────────────────────────────────
ALTER TABLE public.ingredients
  ADD COLUMN IF NOT EXISTS category TEXT;

-- ─── 2) unmatched_ingredients 검수 컬럼 ─────────────────────────────────────
ALTER TABLE public.unmatched_ingredients
  ADD COLUMN IF NOT EXISTS sample_product_id UUID,
  ADD COLUMN IF NOT EXISTS mapped_ingredient_id UUID,
  ADD COLUMN IF NOT EXISTS mapped_canonical_ingredient_id UUID,
  ADD COLUMN IF NOT EXISTS review_note TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_by TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unmatched_ingredients_sample_product_fk'
  ) THEN
    ALTER TABLE public.unmatched_ingredients
      ADD CONSTRAINT unmatched_ingredients_sample_product_fk
      FOREIGN KEY (sample_product_id) REFERENCES public.products(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unmatched_ingredients_mapped_ingredient_fk'
  ) THEN
    ALTER TABLE public.unmatched_ingredients
      ADD CONSTRAINT unmatched_ingredients_mapped_ingredient_fk
      FOREIGN KEY (mapped_ingredient_id) REFERENCES public.ingredients(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'canonical_ingredients')
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'unmatched_ingredients_mapped_canonical_fk'
     ) THEN
    ALTER TABLE public.unmatched_ingredients
      ADD CONSTRAINT unmatched_ingredients_mapped_canonical_fk
      FOREIGN KEY (mapped_canonical_ingredient_id)
      REFERENCES public.canonical_ingredients(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unmatched_ingredients_status_check') THEN
    ALTER TABLE public.unmatched_ingredients
      ADD CONSTRAINT unmatched_ingredients_status_check
      CHECK (status IN ('pending', 'mapped', 'resolved', 'ignored'));
  END IF;
END $$;

-- ─── 2-b) 큐/배너의 익명 쓰기 정책 제거 (권한 축소) ─────────────────────────
DROP POLICY IF EXISTS unmatched_update ON public.unmatched_ingredients;
DROP POLICY IF EXISTS "Allow admin all access on banners" ON public.banners;

-- ─── 3) 미매칭 기록 오버로드 (샘플 제품 포함) ───────────────────────────────
CREATE OR REPLACE FUNCTION public.log_unmatched_ingredient(p_raw text, p_product_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_norm text;
BEGIN
  v_norm := lower(regexp_replace(coalesce(p_raw, ''), '\s+', '', 'g'));
  IF v_norm = '' THEN RETURN; END IF;
  INSERT INTO public.unmatched_ingredients (normalized_name, raw_name, sample_product_id)
  VALUES (v_norm, p_raw, p_product_id)
  ON CONFLICT (normalized_name) DO UPDATE
    SET occurrences = public.unmatched_ingredients.occurrences + 1,
        last_seen_at = now(),
        sample_product_id = COALESCE(public.unmatched_ingredients.sample_product_id, EXCLUDED.sample_product_id);
END;
$fn$;

-- ─── 4) app_settings ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.app_settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL DEFAULT 'null'::jsonb,
  is_public   BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  TEXT
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_settings_public_read ON public.app_settings;
CREATE POLICY app_settings_public_read
  ON public.app_settings FOR SELECT
  USING (is_public);

INSERT INTO public.app_settings (key, value, is_public, description) VALUES
  ('maintenance_mode',    'false'::jsonb, TRUE,  '점검 모드. true 면 사용자 앱에 점검 안내를 노출한다.'),
  ('signup_enabled',      'true'::jsonb,  TRUE,  '신규 회원 가입 허용 여부.'),
  ('viral_event_visible', 'true'::jsonb,  TRUE,  '바이럴 이벤트 진입 노출 여부.'),
  ('service_notice',      '{"enabled": false, "message": ""}'::jsonb, TRUE, '서비스 공지 배너.'),
  ('phase2_alias_observation_enabled', 'false'::jsonb, TRUE,
     'Phase 2 별칭 리졸버 관찰 모드. 점수·판정에는 영향이 없고 미매칭 큐 적재만 수행한다.')
ON CONFLICT (key) DO NOTHING;

-- ─── 5) admin_audit_log (RLS 켜고 정책 없음 = service_role 전용) ────────────
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor        TEXT NOT NULL DEFAULT 'unknown',
  action       TEXT NOT NULL,
  target_table TEXT,
  target_id    TEXT,
  detail       JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at
  ON public.admin_audit_log (created_at DESC);

-- ─── 6) 제품 이미지 버킷 ────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  3145728,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "product_images_public_read" ON storage.objects;
CREATE POLICY "product_images_public_read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'product-images');

-- ─── 7) 제품 원재료 원자적 교체 RPC ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_replace_product_ingredients(
  p_product_id uuid,
  p_items      jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_items   jsonb := COALESCE(p_items, '[]'::jsonb);
  v_invalid integer;
  v_count   integer;
BEGIN
  IF p_product_id IS NULL THEN
    RAISE EXCEPTION 'product_id is required';
  END IF;

  IF jsonb_typeof(v_items) <> 'array' THEN
    RAISE EXCEPTION 'items must be a json array';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = p_product_id) THEN
    RAISE EXCEPTION 'product not found: %', p_product_id;
  END IF;

  SELECT count(*) INTO v_invalid
  FROM (
    SELECT DISTINCT (e->>'ingredient_id')::uuid AS iid
    FROM jsonb_array_elements(v_items) AS e
  ) s
  LEFT JOIN public.ingredients ing ON ing.id = s.iid
  WHERE ing.id IS NULL;

  IF v_invalid > 0 THEN
    RAISE EXCEPTION 'unknown ingredient_id count: %', v_invalid;
  END IF;

  WITH incoming AS (
    SELECT DISTINCT ON (iid) iid, ord
    FROM (
      SELECT (e->>'ingredient_id')::uuid AS iid,
             COALESCE(NULLIF(e->>'sort_order', '')::int, 0) AS ord
      FROM jsonb_array_elements(v_items) AS e
    ) t
    ORDER BY iid, ord
  ),
  removed AS (
    DELETE FROM public.product_ingredients pi
    WHERE pi.product_id = p_product_id
      AND NOT EXISTS (SELECT 1 FROM incoming i WHERE i.iid = pi.ingredient_id)
    RETURNING 1
  ),
  upserted AS (
    INSERT INTO public.product_ingredients (product_id, ingredient_id, sort_order)
    SELECT p_product_id, i.iid, i.ord FROM incoming i
    ON CONFLICT (product_id, ingredient_id)
      DO UPDATE SET sort_order = EXCLUDED.sort_order
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM upserted;

  RETURN COALESCE(v_count, 0);
END;
$fn$;

REVOKE ALL ON FUNCTION public.admin_replace_product_ingredients(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_replace_product_ingredients(uuid, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.admin_replace_product_ingredients(uuid, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_replace_product_ingredients(uuid, jsonb) TO service_role;

-- ─── 8) 검색·페이지네이션 인덱스 ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_products_created_at
  ON public.products (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_products_name_trgm
  ON public.products USING GIN (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_products_brand_name_trgm
  ON public.products USING GIN (brand_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_ingredients_name_ko_trgm
  ON public.ingredients USING GIN (name_ko gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_product_ingredients_ingredient_id
  ON public.product_ingredients (ingredient_id);

CREATE INDEX IF NOT EXISTS idx_unmatched_ingredients_status_occurrences
  ON public.unmatched_ingredients (status, occurrences DESC);;
