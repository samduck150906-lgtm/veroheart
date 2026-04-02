-- Supabase Schema for 베로로 (VeroRo)

-- 1. Users Extension (managed by Supabase Auth)
CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  nickname text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. User Pet Profiles
CREATE TABLE public.pet_profiles (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  species text NOT NULL,
  age integer,
  health_concerns text[],
  allergies text[],
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Products
CREATE TABLE public.products (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  brand text NOT NULL,
  name text NOT NULL,
  category text,
  price integer NOT NULL,
  image_url text,
  reviews_count integer DEFAULT 0,
  average_rating numeric(3,2) DEFAULT 0.0,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Ingredients Dictionary
CREATE TABLE public.ingredients (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name_ko text NOT NULL,
  name_en text,
  purpose text,
  risk_level text CHECK (risk_level IN ('safe', 'warning', 'danger')) NOT NULL
);

-- 5. Product Ingredients Mapping (Many-to-Many)
CREATE TABLE public.product_ingredients (
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  ingredient_id uuid REFERENCES public.ingredients(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, ingredient_id)
);

-- 6. Orders (Commerce)
CREATE TABLE public.orders (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id),
  total_amount integer NOT NULL,
  payment_status text DEFAULT 'pending',
  order_key text UNIQUE, -- For Toss Payments
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Dummy Data Insert (For getting started)
-- YOU CAN RUN THIS SCRIPT IN THE SUPABASE SQL EDITOR.
