-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS
CREATE TYPE pet_type_enum AS ENUM ('dog', 'cat');
CREATE TYPE age_group_enum AS ENUM ('baby', 'adult', 'senior');
CREATE TYPE product_type_enum AS ENUM ('food', 'snack', 'supplement', 'dental', 'litter', 'shampoo', 'pad', 'toy');
CREATE TYPE risk_level_enum AS ENUM ('safe', 'caution', 'danger');

-- 3. TABLES
-- Users
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nickname TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pets
CREATE TABLE public.pets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  pet_type pet_type_enum NOT NULL,
  age_group age_group_enum NOT NULL,
  weight NUMERIC(5,2),
  conditions TEXT[] DEFAULT '{}',
  allergies TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products
CREATE TABLE public.products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  brand_name TEXT NOT NULL,
  product_type product_type_enum NOT NULL,
  target_pet_type pet_type_enum,
  image_url TEXT,
  avg_rating NUMERIC(3,2) DEFAULT 0.0,
  review_count INTEGER DEFAULT 0,
  min_price INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ingredients
CREATE TABLE public.ingredients (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name_ko TEXT NOT NULL UNIQUE,
  name_en TEXT,
  risk_level risk_level_enum NOT NULL DEFAULT 'safe',
  description TEXT,
  caution_conditions TEXT[] DEFAULT '{}',
  allergy_triggers TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product-Ingredients
CREATE TABLE public.product_ingredients (
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES public.ingredients(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  PRIMARY KEY (product_id, ingredient_id)
);

-- Reviews
CREATE TABLE public.reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  pet_id UUID REFERENCES public.pets(id) ON DELETE SET NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  content TEXT NOT NULL,
  images TEXT[] DEFAULT '{}', 
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Review Topics
CREATE TABLE public.review_topics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  review_id UUID REFERENCES public.reviews(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  topic_name TEXT NOT NULL,
  is_positive BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Personalization
CREATE TABLE public.favorites (
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, product_id)
);

CREATE TABLE public.recent_views (
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, product_id)
);

CREATE TABLE public.comparisons (
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, product_id)
);

-- 4. Auth Auto-Profile Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, nickname, avatar_url)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'full_name', '베로' || floor(random() * 1000)::text), COALESCE(new.raw_user_meta_data->>'avatar_url', ''));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- OCR
CREATE TABLE public.ingredient_synonyms (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  ingredient_id UUID REFERENCES public.ingredients(id) ON DELETE CASCADE,
  synonym_name TEXT NOT NULL, 
  language TEXT DEFAULT 'ko',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(synonym_name) 
);

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_synonyms_name ON public.ingredient_synonyms USING GIN (synonym_name gin_trgm_ops);

-- Seed
INSERT INTO public.ingredients (name_ko, name_en, risk_level, caution_conditions, allergy_triggers) VALUES
('연어', 'Salmon', 'safe', '{}', '{"fish"}'),
('가수분해 닭고기', 'Hydrolyzed Chicken', 'safe', '{}', '{}'),
('닭고기 부산물', 'Chicken By-product', 'caution', '{}', '{"chicken"}'),
('비트펄프', 'Beet Pulp', 'caution', '{"digestive"}', '{}'),
('비에이치에이(BHA)', 'BHA', 'danger', '{"kidney", "liver"}', '{}'),
('포도씨 추출물', 'Grape Seed Extract', 'danger', '{"kidney"}', '{}')
ON CONFLICT (name_ko) DO NOTHING;

INSERT INTO public.products (id, name, brand_name, product_type, target_pet_type, min_price) VALUES
('00000000-0000-0000-0000-000000000001', '조인트 케어 무첨가 건강사료', '베로밀', 'food', 'dog', 24000),
('00000000-0000-0000-0000-000000000002', '데일리 치킨 스낵 밀', '냠냠펫', 'snack', 'cat', 8500),
('00000000-0000-0000-0000-000000000003', '슈퍼 유산균 덴탈츄', '퍼피본', 'dental', 'dog', 15000)
ON CONFLICT DO NOTHING;
