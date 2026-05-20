-- ==========================================
-- 베로로(Veroro) 전면 재구축용 PostgreSQL DDL 스키마 설계
-- 1. pg_trgm 익스텐션 활성화
-- 2. 핵심 5개 테이블 (products, nutritional_profiles, ingredient_dictionary, product_ingredients, analysis_results) 생성
-- 3. pg_trgm 기반 GIN 퍼지 인덱스 생성
-- ==========================================

-- 1. pg_trgm 익스텐션 활성화 (Fuzzy Search 지원)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. 핵심 테이블 DDL 정의

-- A. products (제품 기본 정보 테이블)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    brand_name TEXT NOT NULL,
    min_price INTEGER NOT NULL DEFAULT 0,
    image_url TEXT,
    main_category TEXT NOT NULL CHECK (main_category IN ('food', 'snack', 'supplement', 'other')),
    sub_category TEXT, -- 'dry' (건식), 'wet' (습식) 등
    target_pet_type TEXT NOT NULL CHECK (target_pet_type IN ('dog', 'cat', 'all')),
    intended_life_stage TEXT NOT NULL CHECK (intended_life_stage IN ('Puppy', 'Adult', 'Senior', 'All')),
    coupang_product_id TEXT UNIQUE,
    coupang_link TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- B. nutritional_profiles (영양 보증치 및 칼로리 정보 테이블 - AAFCO & FEDIAF 규격)
CREATE TABLE IF NOT EXISTS public.nutritional_profiles (
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE PRIMARY KEY,
    crude_protein NUMERIC(5,2) NOT NULL, -- 조단백 %
    crude_fat NUMERIC(5,2) NOT NULL,     -- 조지방 %
    crude_fiber NUMERIC(5,2) NOT NULL,   -- 조섬유 %
    crude_ash NUMERIC(5,2) NOT NULL,     -- 조회분 %
    moisture NUMERIC(5,2) NOT NULL,      -- 수분 %
    calcium NUMERIC(5,2),                -- 칼슘 % (선택)
    phosphorus NUMERIC(5,2),             -- 인 % (선택)
    total_dietary_fiber NUMERIC(5,2),    -- 총 식이섬유 % (AAFCO 2024 규정 대응)
    calories_per_kg NUMERIC(6,1),        -- kcal/kg (칼로리 밀도)
    protein_calories_pct NUMERIC(4,1),   -- 단백질 기여 칼로리 %
    fat_calories_pct NUMERIC(4,1),       -- 지방 기여 칼로리 %
    carb_calories_pct NUMERIC(4,1),      -- 탄수화물 기여 칼로리 %
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- C. ingredient_dictionary (표준화된 원료 사전 테이블)
CREATE TABLE IF NOT EXISTS public.ingredient_dictionary (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    ingredient_name TEXT UNIQUE NOT NULL,      -- 표준 한국어 성분명 (예: '뼈바른 닭고기')
    ingredient_name_en TEXT,                   -- 영문명 (선택)
    category TEXT,                             -- 성분 분류 (예: '육류', '방부제', '유산균')
    risk_level TEXT NOT NULL CHECK (risk_level IN ('safe', 'caution', 'danger')),
    description TEXT,                          -- 성분 설명 및 잠재적 수의학적 위험 이유
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- D. product_ingredients (제품과 원료의 N:M 매핑 테이블)
CREATE TABLE IF NOT EXISTS public.product_ingredients (
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    ingredient_id UUID REFERENCES public.ingredient_dictionary(id) ON DELETE CASCADE,
    display_order INTEGER, -- 성분표상 가중치/표기 순서
    PRIMARY KEY (product_id, ingredient_id)
);

-- E. analysis_results (미리 계산된 점수와 등급 캐싱 테이블)
CREATE TABLE IF NOT EXISTS public.analysis_results (
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE PRIMARY KEY,
    score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
    grade VARCHAR(2) NOT NULL CHECK (grade IN ('A+', 'A', 'B', 'C', 'D', 'F')),
    penalties JSONB DEFAULT '[]'::jsonb, -- 감점 사유 리스트
    bonuses JSONB DEFAULT '[]'::jsonb,   -- 가점 사유 리스트
    aafco_passed BOOLEAN DEFAULT TRUE,
    fediaf_warnings TEXT[] DEFAULT '{}',
    allergy_ingredients TEXT[] DEFAULT '{}', -- 해당 제품에서 발생할 수 있는 주의 알레르기원
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. pg_trgm 기반 GIN 퍼지 인덱스 생성 (초고속 검색 최적화)
-- products 테이블의 제품명(name) 컬럼 GIN 인덱스
CREATE INDEX IF NOT EXISTS idx_products_name_trgm 
ON public.products 
USING gin (name gin_trgm_ops);

-- ingredient_dictionary 테이블의 성분명(ingredient_name) 컬럼 GIN 인덱스
CREATE INDEX IF NOT EXISTS idx_ingredients_name_trgm 
ON public.ingredient_dictionary 
USING gin (ingredient_name gin_trgm_ops);

-- 4. Fuzzy Search 쿼리 예시 스크립트 코멘트
-- SELECT * FROM public.products 
-- WHERE name % '달고기' 
-- ORDER BY similarity(name, '달고기') DESC 
-- LIMIT 10;
