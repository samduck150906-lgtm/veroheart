-- 1. Updates to Products Table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS main_category TEXT,
ADD COLUMN IF NOT EXISTS sub_category TEXT,
ADD COLUMN IF NOT EXISTS target_life_stage TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS formulation TEXT,
ADD COLUMN IF NOT EXISTS product_health_concerns TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS has_risk_factors TEXT[] DEFAULT '{}';

-- 2. Seed some categories based on user list
-- We can use check constraints or just keep it as text for flexibility
-- but let's define the 8 recommended top-level categories in comments for logic:
-- 1. 사료 (Food)
-- 2. 간식 (Snack)
-- 3. 영양제 (Supplement)
-- 4. 구강관리 (Dental)
-- 5. 피부·목욕·위생 (Skin/Bath)
-- 6. 눈·귀·민감부위 케어 (Sensitive Care)
-- 7. 배변/모래/패드 (Waste Management)
-- 8. 생활용품·환경안전 (Living/Environment)

-- 3. Update existing products to match new structure
UPDATE public.products SET 
  main_category = '사료', 
  sub_category = '건식사료',
  target_life_stage = '{"성체", "시니어"}',
  formulation = '건식',
  product_health_concerns = '{"관절"}'
WHERE name LIKE '%조인트%';

UPDATE public.products SET 
  main_category = '간식', 
  sub_category = '트릿',
  target_life_stage = '{"퍼피·키튼", "성체"}',
  formulation = '트릿'
WHERE product_type = 'snack';

UPDATE public.products SET 
  main_category = '구강관리', 
  sub_category = '덴탈껌',
  target_life_stage = '{"성체"}',
  formulation = '껌'
WHERE product_type = 'dental';

-- 4. Update seed data script to handle more categories later
-- (Handled in seed_data task)
