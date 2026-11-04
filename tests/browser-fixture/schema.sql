-- Synthetic minimal PostgreSQL/Supabase-shaped fixture, NOT a production snapshot.
CREATE ROLE anon;
CREATE TABLE products(id UUID PRIMARY KEY,name TEXT,display_name TEXT,variant_name TEXT,net_weight_text TEXT,slug TEXT,
 catalog_source TEXT,catalog_source_url TEXT,catalog_source_note TEXT,requires_veterinary_guidance BOOLEAN NOT NULL DEFAULT FALSE,analysis_status TEXT,brand_name TEXT,manufacturer_name TEXT,product_type TEXT,main_category TEXT,sub_category TEXT,
 target_pet_type TEXT,target_life_stage TEXT[],formulation TEXT,product_health_concerns TEXT[],has_risk_factors TEXT[],
 verification_status TEXT,verified_at TIMESTAMPTZ,barcode TEXT,kcal_per_100g NUMERIC,image_url TEXT,review_count INT DEFAULT 0,avg_rating NUMERIC DEFAULT 0,
 is_visible BOOLEAN,is_pinned BOOLEAN DEFAULT FALSE,pinned_order INT,has_ingredients BOOLEAN DEFAULT TRUE,created_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE ingredients(id UUID PRIMARY KEY,name_ko TEXT,name_en TEXT,risk_level TEXT,description TEXT);
CREATE TABLE product_ingredients(product_id UUID REFERENCES products,ingredient_id UUID REFERENCES ingredients,sort_order INT);
CREATE TABLE canonical_ingredients(id UUID PRIMARY KEY,canonical_name_ko TEXT,canonical_name_en TEXT,status TEXT,legacy_ingredient_id UUID REFERENCES ingredients);
CREATE TABLE product_ingredient_label_sets(id UUID PRIMARY KEY,product_id UUID REFERENCES products,is_current BOOLEAN);
CREATE TABLE product_ingredient_label_items(label_set_id UUID REFERENCES product_ingredient_label_sets,display_order INT,raw_ingredient_text TEXT,match_status TEXT,
 legacy_ingredient_id UUID REFERENCES ingredients,canonical_ingredient_id UUID REFERENCES canonical_ingredients);
CREATE TABLE nutritional_profiles(product_id UUID REFERENCES products,crude_protein NUMERIC,crude_fat NUMERIC,crude_fiber NUMERIC,crude_ash NUMERIC,moisture NUMERIC,calcium NUMERIC,phosphorus NUMERIC);
CREATE TABLE product_categories(id UUID PRIMARY KEY,name TEXT,hint TEXT,sort_order INT,is_active BOOLEAN,parent_id UUID);
CREATE TABLE app_settings(key TEXT,value JSONB);
CREATE TABLE product_ratings(id UUID,product_id UUID,rating INT,created_at TIMESTAMPTZ,is_mine BOOLEAN);
INSERT INTO products(id,name,brand_name,product_type,main_category,target_pet_type,catalog_source,analysis_status,verification_status,is_visible)
SELECT ('10000000-0000-4000-8000-'||lpad(n::TEXT,12,'0'))::UUID,
 '합성 테스트 '||CASE n WHEN 1 THEN '영양 없음' WHEN 2 THEN '일부 영양' WHEN 3 THEN '기초 영양' WHEN 4 THEN '기준 미달' WHEN 5 THEN '위험 성분' ELSE '수의사 상담' END||' 긴 제품명 연어맛 3kg',
 '합성브랜드','food','사료','dog','admin','ready','reviewed',TRUE FROM generate_series(1,6) n;
INSERT INTO products(id,name,brand_name,product_type,is_visible,verification_status)
VALUES('10000000-0000-4000-8000-000000000007','숨긴 합성 제품','합성브랜드','food',FALSE,'verified'),
 ('10000000-0000-4000-8000-000000000008','검수 대기 합성 제품','합성브랜드','food',FALSE,'pending');
INSERT INTO ingredients VALUES
 ('20000000-0000-4000-8000-000000000001','닭고기','Chicken','safe','합성'),
 ('20000000-0000-4000-8000-000000000002','연어','Salmon','safe','합성'),
 ('20000000-0000-4000-8000-000000000003','타우린','Taurine','safe','합성'),
 ('20000000-0000-4000-8000-000000000004','유산균','Probiotic','safe','합성'),
 ('20000000-0000-4000-8000-000000000005','글루코사민','Glucosamine','safe','합성'),
 ('20000000-0000-4000-8000-000000000006','합성 위험 원료','Fixture danger','danger','합성');
INSERT INTO product_ingredients SELECT p.id,i.id,row_number() OVER(PARTITION BY p.id ORDER BY i.id) FROM products p CROSS JOIN ingredients i WHERE i.risk_level='safe';
INSERT INTO product_ingredients VALUES('10000000-0000-4000-8000-000000000005','20000000-0000-4000-8000-000000000006',6);
INSERT INTO nutritional_profiles VALUES
 ('10000000-0000-4000-8000-000000000002',30,15,NULL,NULL,10,NULL,NULL),
 ('10000000-0000-4000-8000-000000000003',30,15,3,8,10,1,0.8),
 ('10000000-0000-4000-8000-000000000004',0,0,NULL,NULL,10,NULL,NULL),
 ('10000000-0000-4000-8000-000000000006',30,15,3,8,10,NULL,NULL);
INSERT INTO product_categories VALUES('30000000-0000-4000-8000-000000000001','사료','합성 분류',0,TRUE,NULL);
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_products ON products FOR SELECT TO anon USING(is_visible AND verification_status IN('pending','reviewed','verified'));
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
