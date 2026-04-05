-- veroheart / Petty — 앱(supabase.ts) 기준 통합 스키마
-- idempotent: 기존 객체가 있으면 건너뜀 또는 IF NOT EXISTS

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ─── ENUMs ─────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.risk_level_enum AS ENUM ('safe', 'caution', 'danger');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.pet_type_enum AS ENUM ('dog', 'cat');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.age_group_enum AS ENUM ('baby', 'adult', 'senior');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── users ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nickname TEXT NOT NULL DEFAULT 'Petty',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── pets ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  pet_type public.pet_type_enum NOT NULL,
  age_group public.age_group_enum NOT NULL,
  weight NUMERIC(5,2),
  conditions TEXT[] DEFAULT '{}',
  allergies TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── products (target_pet_type: dog | cat | all — TEXT) ─────────────────────
CREATE TABLE IF NOT EXISTS public.products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  brand_name TEXT NOT NULL,
  product_type TEXT NOT NULL DEFAULT 'food',
  target_pet_type TEXT,
  image_url TEXT,
  avg_rating NUMERIC(3,2) DEFAULT 0.0,
  review_count INTEGER DEFAULT 0,
  min_price INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS main_category TEXT,
  ADD COLUMN IF NOT EXISTS sub_category TEXT,
  ADD COLUMN IF NOT EXISTS target_life_stage TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS formulation TEXT,
  ADD COLUMN IF NOT EXISTS product_health_concerns TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS has_risk_factors TEXT[] DEFAULT '{}';

-- ─── ingredients & product_ingredients ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ingredients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name_ko TEXT NOT NULL,
  name_en TEXT,
  risk_level public.risk_level_enum NOT NULL DEFAULT 'safe',
  description TEXT,
  caution_conditions TEXT[] DEFAULT '{}',
  allergy_triggers TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT ingredients_name_ko_key UNIQUE (name_ko)
);

CREATE TABLE IF NOT EXISTS public.product_ingredients (
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES public.ingredients(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  PRIMARY KEY (product_id, ingredient_id)
);

-- ─── reviews ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── favorites, recent_views, comparisons ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.favorites (
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS public.recent_views (
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS public.comparisons (
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, product_id)
);

-- ─── cart & orders ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  order_id_ext TEXT NOT NULL,
  payment_key TEXT,
  status TEXT DEFAULT 'pending',
  total_amount INTEGER NOT NULL,
  shipping_address TEXT,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  CONSTRAINT orders_order_id_ext_key UNIQUE (order_id_ext)
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL,
  price_at_purchase INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── analysis_reports ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.analysis_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  raw_text TEXT,
  analysis_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ingredient_synonyms (OCR) ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ingredient_synonyms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ingredient_id UUID REFERENCES public.ingredients(id) ON DELETE CASCADE,
  synonym_name TEXT NOT NULL,
  language TEXT DEFAULT 'ko',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT ingredient_synonyms_synonym_name_key UNIQUE (synonym_name)
);

CREATE INDEX IF NOT EXISTS idx_synonyms_name ON public.ingredient_synonyms USING GIN (synonym_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_products_main_category ON public.products (main_category);
CREATE INDEX IF NOT EXISTS idx_products_brand ON public.products (brand_name);
CREATE INDEX IF NOT EXISTS idx_products_min_price ON public.products (min_price);

-- ─── Auth: public.users 자동 생성 ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, nickname, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Petty' || floor(random() * 1000)::text),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recent_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredient_synonyms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view and edit own profile" ON public.users;
CREATE POLICY "Users can view and edit own profile" ON public.users
  FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can manage own pets" ON public.pets;
CREATE POLICY "Users can manage own pets" ON public.pets
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can view products" ON public.products;
CREATE POLICY "Anyone can view products" ON public.products FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can view ingredients" ON public.ingredients;
CREATE POLICY "Anyone can view ingredients" ON public.ingredients FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can view product_ingredients" ON public.product_ingredients;
CREATE POLICY "Anyone can view product_ingredients" ON public.product_ingredients FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage their own cart" ON public.cart_items;
CREATE POLICY "Users can manage their own cart" ON public.cart_items
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create their own orders" ON public.orders;
CREATE POLICY "Users can view their own orders" ON public.orders
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own orders" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = user_id AND status = 'pending');

DROP POLICY IF EXISTS "Users can view their own order items" ON public.order_items;
CREATE POLICY "Users can view their own order items" ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id AND o.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert order items for own orders" ON public.order_items;
CREATE POLICY "Users can insert order items for own orders" ON public.order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id AND o.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can view own favorites" ON public.favorites;
CREATE POLICY "Users can view own favorites" ON public.favorites
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own recent_views" ON public.recent_views;
CREATE POLICY "Users can view own recent_views" ON public.recent_views
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own comparisons" ON public.comparisons;
CREATE POLICY "Users can view own comparisons" ON public.comparisons
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can read reviews" ON public.reviews;
CREATE POLICY "Anyone can read reviews" ON public.reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users insert own reviews" ON public.reviews;
CREATE POLICY "Users insert own reviews" ON public.reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own reviews" ON public.reviews;
CREATE POLICY "Users delete own reviews" ON public.reviews
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own reports" ON public.analysis_reports;
CREATE POLICY "Users insert own reports" ON public.analysis_reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users view own reports" ON public.analysis_reports;
CREATE POLICY "Users view own reports" ON public.analysis_reports
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own reports" ON public.analysis_reports;
CREATE POLICY "Users delete own reports" ON public.analysis_reports
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can view synonyms" ON public.ingredient_synonyms;
CREATE POLICY "Anyone can view synonyms" ON public.ingredient_synonyms FOR SELECT USING (true);

-- 서비스/관리 작업용: 상품·성분 INSERT/UPDATE는 Supabase Dashboard 또는 service_role 로 수행 권장
-- (anon INSERT products가 필요하면 별도 정책 추가)
