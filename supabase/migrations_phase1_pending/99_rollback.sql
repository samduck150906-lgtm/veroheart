-- ============================================================================
-- Phase 1 / 99 — 롤백 (전체 비파괴 복귀)
-- ----------------------------------------------------------------------------
-- Phase 1 에서 "추가"한 객체만 제거한다. 기존 객체/데이터는 건드리지 않는다.
-- 순서: 의존성 역순. 멱등(IF EXISTS).
-- 주의: 01의 legacy_risk_level 백필은 신규 컬럼이라 컬럼 DROP 으로 함께 사라진다.
--       기존 risk_level 등 원본 컬럼은 전혀 손대지 않았으므로 영향 없음.
-- ============================================================================

BEGIN;

-- 06
DROP TABLE IF EXISTS public.product_ingredient_inputs;

-- 05 (추가분만 되돌림: 컬럼 제거 + confidence 제약 원복)
ALTER TABLE public.ingredient_allergen_map DROP CONSTRAINT IF EXISTS allergen_map_review_chk;
ALTER TABLE public.ingredient_allergen_map
  DROP COLUMN IF EXISTS relation_type,
  DROP COLUMN IF EXISTS source_id,
  DROP COLUMN IF EXISTS review_status;
ALTER TABLE public.ingredient_allergen_map DROP CONSTRAINT IF EXISTS ingredient_allergen_map_confidence_check;
ALTER TABLE public.ingredient_allergen_map
  ADD CONSTRAINT ingredient_allergen_map_confidence_check
  CHECK (confidence IN ('exact','derived'));   -- 원래 정의로 복원

-- 04
DROP TABLE IF EXISTS public.engine_versions;

-- 03
DROP TABLE IF EXISTS public.rule_sources;
DROP TABLE IF EXISTS public.ingredient_sources;
DROP TABLE IF EXISTS public.sources;

-- 02
DROP TABLE IF EXISTS public.ingredient_aliases;

-- 01 (추가 컬럼/제약/인덱스 제거)
ALTER TABLE public.ingredients DROP CONSTRAINT IF EXISTS ingredients_dog_risk_chk;
ALTER TABLE public.ingredients DROP CONSTRAINT IF EXISTS ingredients_cat_risk_chk;
ALTER TABLE public.ingredients DROP CONSTRAINT IF EXISTS ingredients_inference_status_chk;
DROP INDEX IF EXISTS public.idx_ingredients_source_group;
DROP INDEX IF EXISTS public.idx_ingredients_form;
DROP INDEX IF EXISTS public.idx_ingredients_is_canonical;
DROP INDEX IF EXISTS public.idx_ingredients_merged_into;
ALTER TABLE public.ingredients
  DROP COLUMN IF EXISTS canonical_name_ko,
  DROP COLUMN IF EXISTS canonical_name_en,
  DROP COLUMN IF EXISTS category,
  DROP COLUMN IF EXISTS source_group,
  DROP COLUMN IF EXISTS ingredient_form,
  DROP COLUMN IF EXISTS dog_risk,
  DROP COLUMN IF EXISTS cat_risk,
  DROP COLUMN IF EXISTS allergen_tags,
  DROP COLUMN IF EXISTS nutrition_tags,
  DROP COLUMN IF EXISTS risk_tags,
  DROP COLUMN IF EXISTS default_severity,
  DROP COLUMN IF EXISTS evidence_level,
  DROP COLUMN IF EXISTS review_status,
  DROP COLUMN IF EXISTS inference_status,
  DROP COLUMN IF EXISTS is_canonical,
  DROP COLUMN IF EXISTS merged_into,
  DROP COLUMN IF EXISTS legacy_risk_level,
  DROP COLUMN IF EXISTS updated_at;

COMMIT;
