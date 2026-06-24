-- ============================================================================
-- Phase 1 / 01 — ingredients 컬럼 확장 (비파괴, 멱등)
-- ----------------------------------------------------------------------------
-- 목적: canonical/파생형/종별위험/태그/검수상태 컬럼을 추가한다.
-- 원칙:
--   * 기존 컬럼/데이터 변경·삭제 없음 (ADD COLUMN IF NOT EXISTS 만 사용)
--   * dog_risk/cat_risk 는 기존 risk_level 을 복제하지 않고 'unknown' 으로 시작
--   * 기존 risk_level 은 legacy_risk_level 로 "보존"만 함 (앱은 이 컬럼을 읽지 않음)
--   * 자동 추론 결과는 inference_status='auto_suggested' 로 격리 → 검수 전 판정 미사용
-- 적용 대상: Supabase 브랜치/개발 환경에서 먼저 검증. 운영 직접 적용 금지.
-- ============================================================================

BEGIN;

ALTER TABLE public.ingredients
  ADD COLUMN IF NOT EXISTS canonical_name_ko  text,
  ADD COLUMN IF NOT EXISTS canonical_name_en  text,
  ADD COLUMN IF NOT EXISTS category           text,        -- animal_protein / animal_fat / carbohydrate ...
  ADD COLUMN IF NOT EXISTS source_group       text,        -- chicken / beef / salmon ... (원료 기원)
  ADD COLUMN IF NOT EXISTS ingredient_form    text,        -- muscle/meal/protein/broth/fat/oil/liver/heart/...
  ADD COLUMN IF NOT EXISTS dog_risk           text NOT NULL DEFAULT 'unknown', -- unknown/safe/caution/danger
  ADD COLUMN IF NOT EXISTS cat_risk           text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS allergen_tags      text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS nutrition_tags     text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS risk_tags          text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS default_severity   text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS evidence_level     text,        -- regulatory/veterinary/nutrition_guideline/internal_policy
  ADD COLUMN IF NOT EXISTS review_status      text NOT NULL DEFAULT 'draft',        -- draft → verified
  ADD COLUMN IF NOT EXISTS inference_status   text NOT NULL DEFAULT 'auto_suggested',-- auto_suggested/manually_reviewed/expert_reviewed/rejected
  ADD COLUMN IF NOT EXISTS is_canonical       boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS merged_into        uuid REFERENCES public.ingredients(id),
  ADD COLUMN IF NOT EXISTS legacy_risk_level  text,        -- 기존 risk_level 보존본
  ADD COLUMN IF NOT EXISTS updated_at         timestamptz NOT NULL DEFAULT now();

-- 종별 위험/판정 상태 값 검증 (멱등: 있으면 건너뜀)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ingredients_dog_risk_chk') THEN
    ALTER TABLE public.ingredients ADD CONSTRAINT ingredients_dog_risk_chk
      CHECK (dog_risk IN ('unknown','safe','caution','danger'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ingredients_cat_risk_chk') THEN
    ALTER TABLE public.ingredients ADD CONSTRAINT ingredients_cat_risk_chk
      CHECK (cat_risk IN ('unknown','safe','caution','danger'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ingredients_inference_status_chk') THEN
    ALTER TABLE public.ingredients ADD CONSTRAINT ingredients_inference_status_chk
      CHECK (inference_status IN ('auto_suggested','manually_reviewed','expert_reviewed','rejected'));
  END IF;
END $$;

-- 기존 risk_level → legacy_risk_level 보존 (신규 컬럼만 채움, 기존 컬럼 불변)
UPDATE public.ingredients
   SET legacy_risk_level = risk_level::text
 WHERE legacy_risk_level IS NULL;

-- 인덱스 (검색/병합용)
CREATE INDEX IF NOT EXISTS idx_ingredients_source_group ON public.ingredients (source_group);
CREATE INDEX IF NOT EXISTS idx_ingredients_form         ON public.ingredients (ingredient_form);
CREATE INDEX IF NOT EXISTS idx_ingredients_is_canonical ON public.ingredients (is_canonical);
CREATE INDEX IF NOT EXISTS idx_ingredients_merged_into  ON public.ingredients (merged_into);

COMMIT;
