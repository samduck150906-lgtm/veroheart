-- ============================================================================
-- Phase 1 / 06 — product_ingredient_inputs (제품 원재료 원문·순서 보존, 비파괴, 멱등)
-- ----------------------------------------------------------------------------
-- 운영 product_ingredients = (product_id, ingredient_id, sort_order) 뿐 → 라벨 원문 미보존.
-- canonical 병합 시 표면형(예: '동결건조 유기농 닭고기')이 소실되므로,
-- 병합 "이전에" 현재 상태를 이 테이블로 스냅샷한다.
-- ⚠ 이 파일은 테이블만 생성한다. 데이터 채움(백필)은 07 스크립트(별도 승인)에서 수행.
--    기존 product_ingredients 는 변경하지 않는다.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.product_ingredient_inputs (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id              uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  raw_ingredient_name     text NOT NULL,        -- 현재 ingredients.name_ko 스냅샷(=라벨 표면형)
  normalized_input        text,                 -- 정규화 키(추후)
  canonical_ingredient_id uuid REFERENCES public.ingredients(id),
  display_order           integer NOT NULL,     -- 현재 sort_order 보존
  source_text             text,                 -- (가능 시) 라벨 원문 전체
  match_type              text NOT NULL DEFAULT 'legacy_link', -- legacy_link/exact/alias/fuzzy/unmatched
  match_confidence        numeric,
  review_status           text NOT NULL DEFAULT 'auto_suggested',
  legacy_ingredient_id    uuid,                 -- 스냅샷 당시 연결된 표면형 ingredient id(추적)
  created_at              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pii_match_type_chk CHECK (match_type IN
    ('legacy_link','exact','alias','fuzzy','unmatched')),
  CONSTRAINT pii_review_chk CHECK (review_status IN
    ('auto_suggested','manually_reviewed','expert_reviewed','rejected'))
);

CREATE INDEX IF NOT EXISTS idx_pii_product   ON public.product_ingredient_inputs (product_id);
CREATE INDEX IF NOT EXISTS idx_pii_canonical ON public.product_ingredient_inputs (canonical_ingredient_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_pii_product_order
  ON public.product_ingredient_inputs (product_id, display_order, raw_ingredient_name);

ALTER TABLE public.product_ingredient_inputs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies
     WHERE schemaname='public' AND tablename='product_ingredient_inputs' AND policyname='pii_read') THEN
    CREATE POLICY pii_read ON public.product_ingredient_inputs FOR SELECT USING (true);
  END IF;
END $$;

COMMIT;

-- ----------------------------------------------------------------------------
-- 07 (백필, 별도 실행/승인) — 원문 스냅샷. 기존 데이터 읽기→신규 테이블 쓰기(비파괴).
-- ----------------------------------------------------------------------------
-- INSERT INTO public.product_ingredient_inputs
--   (product_id, raw_ingredient_name, display_order, legacy_ingredient_id, match_type)
-- SELECT pi.product_id, i.name_ko, COALESCE(pi.sort_order,0), i.id, 'legacy_link'
-- FROM public.product_ingredients pi
-- JOIN public.ingredients i ON i.id = pi.ingredient_id
-- ON CONFLICT DO NOTHING;
