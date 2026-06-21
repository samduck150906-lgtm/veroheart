-- ─────────────────────────────────────────────────────────────────────────────
-- 베로로 궁합 점수 알고리즘 v2 — DB 스키마 확장
-- 신규: pets 확장 필드 / products 열량·중량 / 궁합 캐시 테이블
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. pets 테이블 확장 ───────────────────────────────────────────────────────

-- 중성화 여부
ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS is_neutered BOOLEAN DEFAULT false;

-- 활동량 ('low' | 'moderate' | 'high')
ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS activity_level TEXT DEFAULT 'moderate'
  CONSTRAINT pets_activity_level_check CHECK (activity_level IN ('low', 'moderate', 'high'));

-- 현재 급여 중인 사료 (브랜드 + 상품명)
ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS current_food JSONB DEFAULT NULL;
-- 예: { "brand": "로얄캐닌", "name": "미니 어덜트" }

-- 월 예산 (원, KRW)
ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS monthly_budget INTEGER DEFAULT NULL;

-- breed (품종)
ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS breed TEXT DEFAULT NULL;

-- ── 2. products 테이블 확장 ──────────────────────────────────────────────────

-- 포장 중량(g) — 가성비 계산에 사용
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS packaging_weight_g INTEGER DEFAULT NULL;

-- 실측/표기 열량 (kcal/100g) — 급여량 계산에 사용
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS kcal_per_100g NUMERIC(6, 2) DEFAULT NULL;

-- ── 3. ingredients 테이블 확장 ───────────────────────────────────────────────

-- 기능성 이점 태그 (건강 고민 적합성 계산에 활용)
-- 예: 'joint', 'skin', 'digestive', 'kidney', 'weight', 'dental'
ALTER TABLE public.ingredients
  ADD COLUMN IF NOT EXISTS functional_benefit TEXT DEFAULT NULL;

-- 알러지 확장 그룹 (알러지 유사 성분 감지에 활용)
-- 예: 'chicken' — 닭고기, 닭분말, 계육 등을 하나로 묶는 그룹 키
ALTER TABLE public.ingredients
  ADD COLUMN IF NOT EXISTS allergen_group TEXT DEFAULT NULL;

-- ── 4. compatibility_results (궁합 점수 캐시) ─────────────────────────────────

CREATE TABLE IF NOT EXISTS public.compatibility_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- 관계 키
  pet_id  UUID REFERENCES public.pets(id)     ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,

  -- 최종 점수 및 등급
  match_score  INTEGER NOT NULL CHECK (match_score BETWEEN 0 AND 100),
  grade        TEXT    NOT NULL CHECK (grade IN ('A', 'B', 'C', 'D', 'F')),

  -- 텍스트 결과
  summary              TEXT,
  positive_reasons     TEXT[]   DEFAULT '{}',
  caution_reasons      TEXT[]   DEFAULT '{}',
  feeding_guide        TEXT,
  alternative_conditions TEXT[] DEFAULT '{}',

  -- 점수 항목별 세부 (JSONB)
  -- { allergySafety, healthConcernFit, nutritionalBalance, petFit,
  --   warningRisk, reviewTrust, valueForMoney }
  breakdown JSONB DEFAULT NULL,

  -- 플래그
  capped        BOOLEAN  DEFAULT false, -- 하드캡 적용 여부
  raw_score     INTEGER  DEFAULT NULL,  -- 하드캡 이전 원점수

  -- 메타
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (pet_id, product_id) -- 동일 (펫, 상품) 쌍은 1건만 유지 (upsert)
);

-- RLS
ALTER TABLE public.compatibility_results ENABLE ROW LEVEL SECURITY;

-- 소유자(본인 펫)만 결과 조회·갱신 허용
CREATE POLICY "Owner can read own compatibility results"
  ON public.compatibility_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.pets p
      WHERE p.id = pet_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Owner can upsert own compatibility results"
  ON public.compatibility_results FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pets p
      WHERE p.id = pet_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Owner can update own compatibility results"
  ON public.compatibility_results FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.pets p
      WHERE p.id = pet_id AND p.user_id = auth.uid()
    )
  );

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_compatibility_pet_id
  ON public.compatibility_results (pet_id);

CREATE INDEX IF NOT EXISTS idx_compatibility_product_id
  ON public.compatibility_results (product_id);

CREATE INDEX IF NOT EXISTS idx_compatibility_score
  ON public.compatibility_results (match_score DESC);

-- ── 5. products.allergen_safe_list (알러지 안전 목록 캐시) ───────────────────
-- 상품이 특정 알러겐을 포함하지 않음을 사전 검증·태깅한 필드
-- 예: ['chicken', 'wheat'] → 해당 알러겐 없음을 보장
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS allergen_free_tags TEXT[] DEFAULT '{}';

-- GIN 인덱스 (allergen_free_tags 배열 검색 최적화)
CREATE INDEX IF NOT EXISTS idx_products_allergen_free_tags
  ON public.products USING GIN (allergen_free_tags);

-- GIN 인덱스 (health_concerns 배열 검색 최적화)
CREATE INDEX IF NOT EXISTS idx_products_health_concerns
  ON public.products USING GIN (product_health_concerns);

-- ── 6. 뷰: 궁합 점수 포함 상품 요약 ──────────────────────────────────────────
CREATE OR REPLACE VIEW public.products_with_compatibility AS
SELECT
  p.id,
  p.name,
  p.brand_name,
  p.min_price,
  p.image_url,
  p.avg_rating,
  p.review_count,
  p.target_pet_type,
  p.target_life_stage,
  p.product_health_concerns,
  p.packaging_weight_g,
  p.kcal_per_100g,
  p.allergen_free_tags,
  cr.match_score,
  cr.grade,
  cr.summary,
  cr.positive_reasons,
  cr.caution_reasons,
  cr.feeding_guide,
  cr.computed_at
FROM public.products p
LEFT JOIN public.compatibility_results cr ON cr.product_id = p.id;
