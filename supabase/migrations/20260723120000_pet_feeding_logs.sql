-- 20260723120000_pet_feeding_logs.sql
--
-- 목적: 마이페이지 "반려동물별 식이(섭취) 다이어리" 기능을 위한 스키마.
--   - pets 에 선택 컬럼(breed, image_url) 비파괴적으로 추가
--   - pet_feeding_logs 테이블 신설 (반려동물별 일별 섭취 기록)
--   - 사용자는 자신의 반려동물 기록만 조회/생성/수정/삭제 (RLS)
--
-- 규칙: idempotent (IF NOT EXISTS / DROP POLICY IF EXISTS)
-- 성분 분석/제품/검색 등 기존 스키마는 일절 변경하지 않는다(추가 전용).

-- ─── pets: 다이어리 카드 표기용 선택 컬럼 (비파괴적) ────────────────────────
ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS breed TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- ─── pet_feeding_logs ────────────────────────────────────────────────────────
-- product_type: 기존 products.product_type 규칙과 동일 값 사용
--   'food'(사료) | 'snack'(간식) | 'supplement'(영양제) | 'custom'(직접 입력)
-- meal_period: 시간대 라벨(선택) — 'morning'|'lunch'|'dinner'|'snack'|'other'
CREATE TABLE IF NOT EXISTS public.pet_feeding_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE NOT NULL,
  -- 공식 제품 참조. 직접 입력 제품은 NULL.
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_type TEXT NOT NULL DEFAULT 'food',
  -- 직접 입력 제품명 (is_custom_product = true 일 때 사용)
  custom_product_name TEXT,
  is_custom_product BOOLEAN NOT NULL DEFAULT false,
  feeding_date DATE NOT NULL,
  feeding_time TIME,
  meal_period TEXT,
  amount NUMERIC(10,2),
  unit TEXT,
  memo TEXT,
  -- 기호도(1~5). 기록하지 않을 수 있어 NULL 허용.
  preference_level SMALLINT CHECK (preference_level BETWEEN 1 AND 5),
  reaction_note TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- product_type 는 허용된 값만
  CONSTRAINT pet_feeding_logs_product_type_chk
    CHECK (product_type IN ('food', 'snack', 'supplement', 'custom')),
  -- 공식 제품이거나 직접 입력 제품명 중 하나는 반드시 있어야 함
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
SET search_path = ''
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

-- 조회: 본인 기록만
DROP POLICY IF EXISTS "Users can view own feeding logs" ON public.pet_feeding_logs;
CREATE POLICY "Users can view own feeding logs" ON public.pet_feeding_logs
  FOR SELECT USING (auth.uid() = user_id);

-- 생성: 본인 user_id + 대상 반려동물이 본인 소유여야 함
DROP POLICY IF EXISTS "Users can insert own feeding logs" ON public.pet_feeding_logs;
CREATE POLICY "Users can insert own feeding logs" ON public.pet_feeding_logs
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.pets p
      WHERE p.id = pet_id AND p.user_id = auth.uid()
    )
  );

-- 수정: 본인 기록 + 이동 대상 반려동물도 본인 소유여야 함
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

-- 삭제: 본인 기록만
DROP POLICY IF EXISTS "Users can delete own feeding logs" ON public.pet_feeding_logs;
CREATE POLICY "Users can delete own feeding logs" ON public.pet_feeding_logs
  FOR DELETE USING (auth.uid() = user_id);

-- 실시간(선택): 앱의 admin-data-sync 채널과 별개. 기록 변경은 클라이언트에서
-- 낙관적 업데이트 + 재조회로 반영하므로 별도 publication 설정은 요구하지 않는다.
