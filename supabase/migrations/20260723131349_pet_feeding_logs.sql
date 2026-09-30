-- 20260723120000_pet_feeding_logs.sql
-- 목적: 마이페이지 "반려동물별 식이(섭취) 다이어리" 기능을 위한 스키마.

-- ─── pets: 다이어리 카드 표기용 선택 컬럼 (비파괴적) ────────────────────────
ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS breed TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- ─── pet_feeding_logs ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pet_feeding_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_type TEXT NOT NULL DEFAULT 'food',
  custom_product_name TEXT,
  is_custom_product BOOLEAN NOT NULL DEFAULT false,
  feeding_date DATE NOT NULL,
  feeding_time TIME,
  meal_period TEXT,
  amount NUMERIC(10,2),
  unit TEXT,
  memo TEXT,
  preference_level SMALLINT CHECK (preference_level BETWEEN 1 AND 5),
  reaction_note TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT pet_feeding_logs_product_type_chk
    CHECK (product_type IN ('food', 'snack', 'supplement', 'custom')),
  CONSTRAINT pet_feeding_logs_product_presence_chk
    CHECK (
      product_id IS NOT NULL
      OR (custom_product_name IS NOT NULL AND length(btrim(custom_product_name)) > 0)
    )
);

-- ─── 필수 인덱스 ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_feeding_logs_user_id ON public.pet_feeding_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_feeding_logs_pet_id ON public.pet_feeding_logs (pet_id);
CREATE INDEX IF NOT EXISTS idx_feeding_logs_feeding_date ON public.pet_feeding_logs (feeding_date);
CREATE INDEX IF NOT EXISTS idx_feeding_logs_product_id ON public.pet_feeding_logs (product_id);
CREATE INDEX IF NOT EXISTS idx_feeding_logs_pet_date ON public.pet_feeding_logs (pet_id, feeding_date);

-- ─── updated_at 자동 갱신 트리거 ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_feeding_log_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_feeding_logs_updated_at ON public.pet_feeding_logs;
CREATE TRIGGER trg_feeding_logs_updated_at
  BEFORE UPDATE ON public.pet_feeding_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_feeding_log_updated_at();

-- ─── RLS: 본인 소유 기록만 접근 ──────────────────────────────────────────────
ALTER TABLE public.pet_feeding_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own feeding logs" ON public.pet_feeding_logs;
CREATE POLICY "Users can view own feeding logs" ON public.pet_feeding_logs
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own feeding logs" ON public.pet_feeding_logs;
CREATE POLICY "Users can insert own feeding logs" ON public.pet_feeding_logs
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.pets p
      WHERE p.id = pet_id AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own feeding logs" ON public.pet_feeding_logs;
CREATE POLICY "Users can update own feeding logs" ON public.pet_feeding_logs
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.pets p
      WHERE p.id = pet_id AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete own feeding logs" ON public.pet_feeding_logs;
CREATE POLICY "Users can delete own feeding logs" ON public.pet_feeding_logs
  FOR DELETE USING (auth.uid() = user_id);;
