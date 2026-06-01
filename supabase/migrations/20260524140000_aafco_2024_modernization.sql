-- AAFCO 2024 현대화 규정 및 고성능 GIN 트리그램 인덱싱 마이그레이션 통합 스크립트

-- 1. pg_trgm 확장 프로그램 활성화 (Fuzzy 퍼지 오타 검색용)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. nutritional_profiles (영양 성분 프로필) 테이블 신규 생성 (없을 시)
CREATE TABLE IF NOT EXISTS public.nutritional_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE UNIQUE NOT NULL,
  crude_protein NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
  crude_fat NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
  crude_fiber NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
  crude_ash NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
  moisture NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
  calcium NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
  phosphorus NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
  total_dietary_fiber NUMERIC(5, 2) DEFAULT NULL,
  caloric_distribution JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. analysis_results (점수 및 등급 캐싱) 테이블 신규 생성 (없을 시)
CREATE TABLE IF NOT EXISTS public.analysis_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE UNIQUE NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  grade VARCHAR(2) NOT NULL DEFAULT 'F',
  penalties JSONB DEFAULT NULL,
  bonuses JSONB DEFAULT NULL,
  warnings JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. RLS 보안 활성화 및 전체 조회 권한 허용 (기존 테이블 정책 대칭성 유지)
ALTER TABLE public.nutritional_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view nutritional_profiles" ON public.nutritional_profiles;
CREATE POLICY "Anyone can view nutritional_profiles" 
ON public.nutritional_profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can view analysis_results" ON public.analysis_results;
CREATE POLICY "Anyone can view analysis_results" 
ON public.analysis_results FOR SELECT USING (true);

-- 5. products 테이블 제품명(name) GIN 트리그램 인덱스 구축
CREATE INDEX IF NOT EXISTS idx_products_name_trgm 
ON public.products 
USING gin (name gin_trgm_ops);

-- 6. ingredients 테이블 성분명(name_ko) GIN 트리그램 인덱스 구축 (ingredients 테이블명 보정 적용)
CREATE INDEX IF NOT EXISTS idx_ingredients_name_trgm 
ON public.ingredients 
USING gin (name_ko gin_trgm_ops);
