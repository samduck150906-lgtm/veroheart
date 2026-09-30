-- ── 1. pets 테이블 확장 ───────────────────────────────────────────────────────

ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS is_neutered BOOLEAN DEFAULT false;

ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS activity_level TEXT DEFAULT 'moderate'
  CONSTRAINT pets_activity_level_check CHECK (activity_level IN ('low', 'moderate', 'high'));

ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS current_food JSONB DEFAULT NULL;

ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS monthly_budget INTEGER DEFAULT NULL;

ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS breed TEXT DEFAULT NULL;

-- ── 2. products 테이블 확장 ──────────────────────────────────────────────────

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS packaging_weight_g INTEGER DEFAULT NULL;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS kcal_per_100g NUMERIC(6, 2) DEFAULT NULL;

-- ── 3. ingredients 테이블 확장 ───────────────────────────────────────────────

ALTER TABLE public.ingredients
  ADD COLUMN IF NOT EXISTS functional_benefit TEXT DEFAULT NULL;

ALTER TABLE public.ingredients
  ADD COLUMN IF NOT EXISTS allergen_group TEXT DEFAULT NULL;

-- ── 4. compatibility_results (궁합 점수 캐시) ─────────────────────────────────

CREATE TABLE IF NOT EXISTS public.compatibility_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pet_id  UUID REFERENCES public.pets(id)     ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  match_score  INTEGER NOT NULL CHECK (match_score BETWEEN 0 AND 100),
  grade        TEXT    NOT NULL CHECK (grade IN ('A', 'B', 'C', 'D', 'F')),
  summary              TEXT,
  positive_reasons     TEXT[]   DEFAULT '{}',
  caution_reasons      TEXT[]   DEFAULT '{}',
  feeding_guide        TEXT,
  alternative_conditions TEXT[] DEFAULT '{}',
  breakdown JSONB DEFAULT NULL,
  capped        BOOLEAN  DEFAULT false,
  raw_score     INTEGER  DEFAULT NULL,
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (pet_id, product_id)
);

ALTER TABLE public.compatibility_results ENABLE ROW LEVEL SECURITY;

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

CREATE INDEX IF NOT EXISTS idx_compatibility_pet_id
  ON public.compatibility_results (pet_id);

CREATE INDEX IF NOT EXISTS idx_compatibility_product_id
  ON public.compatibility_results (product_id);

CREATE INDEX IF NOT EXISTS idx_compatibility_score
  ON public.compatibility_results (match_score DESC);

-- ── 5. products 알러지 안전 태그 ─────────────────────────────────────────────

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS allergen_free_tags TEXT[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_products_allergen_free_tags
  ON public.products USING GIN (allergen_free_tags);

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
LEFT JOIN public.compatibility_results cr ON cr.product_id = p.id;;
