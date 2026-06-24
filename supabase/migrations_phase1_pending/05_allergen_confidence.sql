-- ============================================================================
-- Phase 1 / 05 — ingredient_allergen_map 신뢰도 확장 (비파괴, 멱등)
-- ----------------------------------------------------------------------------
-- 기존 confidence CHECK: ('exact','derived'). 'trace' 추가 + relation_type 컬럼.
-- 현재 행 수 0 → 데이터 영향 없음. (운영 실측 기준)
-- 엔진 의도:
--   exact → conflict(하드캡)  /  trace → caution  /  derived → watch(경고만)
-- 이 매핑으로 "닭 지방(fat_derivative→derived)"이 "닭고기(exact)"와 다른 강도를 갖는다.
-- ============================================================================

BEGIN;

-- confidence 허용값 확장
ALTER TABLE public.ingredient_allergen_map
  DROP CONSTRAINT IF EXISTS ingredient_allergen_map_confidence_check;
ALTER TABLE public.ingredient_allergen_map
  ADD CONSTRAINT ingredient_allergen_map_confidence_check
  CHECK (confidence IN ('exact','derived','trace'));

-- 파생 관계·근거 컬럼 추가
ALTER TABLE public.ingredient_allergen_map
  ADD COLUMN IF NOT EXISTS relation_type text,   -- ingredient_aliases.relation_type 와 동일 어휘
  ADD COLUMN IF NOT EXISTS source_id uuid REFERENCES public.sources(id),
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'auto_suggested';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='allergen_map_review_chk') THEN
    ALTER TABLE public.ingredient_allergen_map ADD CONSTRAINT allergen_map_review_chk
      CHECK (review_status IN ('auto_suggested','manually_reviewed','expert_reviewed','rejected'));
  END IF;
END $$;

COMMIT;
