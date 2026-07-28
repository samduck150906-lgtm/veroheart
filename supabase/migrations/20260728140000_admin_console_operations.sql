-- 20260728140000_admin_console_operations.sql
--
-- 목적: 관리자 콘솔 운영 기능(성분 CRUD · 제품 원재료 편집 · 미매칭 큐 검수 ·
--       시스템 설정 · 제품 이미지 업로드 · 목록 페이지네이션)을 실제로 동작시키기
--       위한 최소 스키마 보강.
--
-- 원칙
--   - 비파괴(non-destructive): 컬럼/테이블 삭제 없음, 기존 마이그레이션 수정 없음.
--   - 멱등(idempotent): IF NOT EXISTS / ON CONFLICT / DROP POLICY IF EXISTS.
--   - RLS 완화 금지: 관리자 쓰기는 전부 service_role(admin-write Edge Function) 경유.
--     이 파일은 ingredients/products 에 anon write 정책을 추가하지 않는다.
--
-- 추가되는 것
--   1. ingredients.category                 — 관리자 성분 분류(기존 UI가 쓰던 미존재 컬럼)
--   2. unmatched_ingredients 검수 컬럼      — 매핑 대상·검수자·검수시각·메모·샘플 제품
--   2-b. 익명 쓰기 정책 제거                — unmatched_update / banners ALL (운영 실측 확인)
--   3. log_unmatched_ingredient(text, uuid) — 샘플 제품까지 기록하는 오버로드
--   4. app_settings                         — 런타임 시스템 설정(공개 키만 anon SELECT)
--   5. admin_audit_log                      — 관리자 쓰기 감사 로그(service_role 전용)
--   6. storage bucket 'product-images'      — 제품 이미지(공개 버킷, 쓰기는 service_role 전용)
--   7. admin_replace_product_ingredients()  — 제품 원재료 원자적 교체 RPC
--   8. 검색·페이지네이션 인덱스
--
-- 롤백 고려사항
--   - 컬럼/테이블 추가는 그대로 두어도 기존 동작에 영향이 없다.
--   - 되돌리려면 7번 함수와 5·4번 테이블을 DROP 하면 된다(데이터 손실 주의).
--   - storage bucket 은 객체가 남아 있으면 삭제되지 않는다.

BEGIN;

-- ─── 1) ingredients.category ────────────────────────────────────────────────
-- 관리자 성분 관리 UI가 category 를 저장해 왔으나 컬럼이 존재하지 않아
-- (RLS 이전에) 저장 자체가 실패하던 문제를 해소한다.
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

-- FK 는 참조 테이블이 실제로 존재할 때만 건다(캐노니컬 스키마 미적용 환경 대비).
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

-- 상태 값 제약. 기존 행이 쓰던 'resolved' 도 허용해 마이그레이션이 실패하지 않게 한다.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unmatched_ingredients_status_check') THEN
    ALTER TABLE public.unmatched_ingredients
      ADD CONSTRAINT unmatched_ingredients_status_check
      CHECK (status IN ('pending', 'mapped', 'resolved', 'ignored'));
  END IF;
END $$;

-- ─── 2-b) 큐/배너의 익명 쓰기 정책 제거 ─────────────────────────────────────
-- 운영 DB 실측(2026-07-28): 20260714120000_tighten_banner_and_queue_rls.sql 이
-- 아직 적용되지 않아 아래 두 정책이 살아 있다.
--   - unmatched_ingredients.unmatched_update : FOR UPDATE USING (true)
--     → 익명 사용자가 검수 큐의 임의 행 상태를 바꿀 수 있다. 관리자 검수 화면이
--       이 큐를 쓰기 시작하므로 반드시 닫는다(검수 갱신은 service_role 로만).
--   - banners."Allow admin all access on banners" : FOR ALL USING(true) WITH CHECK(true)
--     → 이름만 admin 이고 역할 검증이 없어 누구나 배너를 조작할 수 있다.
-- 두 정책 모두 "권한 축소"이며 service_role 은 RLS 를 우회하므로 운영 쓰기에는 영향이 없다.
-- 위 마이그레이션이 나중에 적용돼도 DROP ... IF EXISTS 라 충돌하지 않는다.
DROP POLICY IF EXISTS unmatched_update ON public.unmatched_ingredients;
DROP POLICY IF EXISTS "Allow admin all access on banners" ON public.banners;

-- ─── 3) 미매칭 기록 오버로드 (샘플 제품 포함) ───────────────────────────────
-- 기존 1-인자 함수는 그대로 유지한다(호출부 호환).
CREATE OR REPLACE FUNCTION public.log_unmatched_ingredient(p_raw text, p_product_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- ─── 4) app_settings ────────────────────────────────────────────────────────
-- 런타임에 바꿀 수 있는 설정만 담는다. 배포가 필요한 환경변수는 넣지 않는다.
CREATE TABLE IF NOT EXISTS public.app_settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL DEFAULT 'null'::jsonb,
  is_public   BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  TEXT
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- 공개로 표시된 키만 anon 이 읽을 수 있다. 쓰기 정책은 만들지 않는다(service_role 전용).
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

-- ─── 5) admin_audit_log ─────────────────────────────────────────────────────
-- RLS 를 켜되 정책을 만들지 않는다 → service_role 만 접근 가능.
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
-- 공개 읽기(사용자 앱이 img src 로 직접 사용). 업로드/삭제는 정책을 만들지 않아
-- service_role(admin-write Edge Function)만 가능하다.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  3145728, -- 3MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- storage.objects 에 SELECT 정책을 만들지 않는다.
-- public = true 버킷은 /object/public/<bucket>/<path> 로 RLS 검사 없이 서빙되므로
-- 사용자 앱의 <img src="...publicUrl"> 는 정책 없이도 동작한다.
-- 반대로 광범위한 SELECT 정책을 두면 클라이언트가 버킷 전체 파일 목록까지
-- 조회할 수 있어 의도보다 넓은 노출이 된다(Supabase security advisor 0025).
DROP POLICY IF EXISTS "product_images_public_read" ON storage.objects;

-- ─── 7) 제품 원재료 원자적 교체 RPC ─────────────────────────────────────────
-- Edge Function 에서 delete + insert 를 나눠 실행하면 중간 실패 시 원재료가
-- 사라진 상태로 남는다. 단일 트랜잭션(함수 호출)으로 교체한다.
--
-- security: SECURITY DEFINER + search_path 고정 + PUBLIC 실행권한 회수.
--           service_role 만 실행할 수 있으므로 anon 이 호출할 수 없다.
CREATE OR REPLACE FUNCTION public.admin_replace_product_ingredients(
  p_product_id uuid,
  p_items      jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- 존재하지 않는 ingredient_id 가 하나라도 있으면 전체를 거부한다.
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
    -- 같은 성분이 두 번 오면 더 앞 순서만 남긴다(중복 연결 차단).
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
$$;

REVOKE ALL ON FUNCTION public.admin_replace_product_ingredients(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_replace_product_ingredients(uuid, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.admin_replace_product_ingredients(uuid, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_replace_product_ingredients(uuid, jsonb) TO service_role;

-- ─── 8) 검색·페이지네이션 인덱스 ────────────────────────────────────────────
-- 관리자 목록이 전건 조회에서 range 페이지네이션으로 바뀌면서
-- created_at 정렬과 ilike 검색이 매 페이지마다 수행된다.
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
  ON public.unmatched_ingredients (status, occurrences DESC);

COMMIT;
