-- Real Product Data Ingestion Script

-- 1. Ensure all unique ingredients from the 5 major brands are present
INSERT INTO public.ingredients (name_ko, name_en, risk_level, description) VALUES
('쌀', 'Rice', 'safe', '에너지원인 저알러지 탄수화물'),
('계육분', 'Chicken Meal', 'safe', '닭고기를 건조 분쇄한 고단백 원료'),
('닭 지방', 'Chicken Fat', 'safe', '오메가-6와 에너지를 공급하는 동물성 지방'),
('밀 글루텐', 'Wheat Gluten', 'caution', '식물성 단백질로 소화 민감성 확인 필요'),
('완두 섬유', 'Pea Fiber', 'safe', '장 건강을 돕는 식이섬유'),
('사탕무박', 'Beet Pulp', 'safe', '변 상태를 개선하는 프리바이오틱 섬유질'),
('가금류박', 'Poultry Meal', 'safe', '가금류를 가공하여 단백질 효율을 높인 원료'),
('대두유', 'Soybean Oil', 'safe', '필수 지방산을 공급하는 식물성 유지'),
('프락토올리고당', 'FOS', 'safe', '장내 유익균 보조제 (프리바이오틱스)'),
('보리지 오일', 'Borage Oil', 'safe', '피부 건강에 좋은 감마리놀렌산 공급원'),
('녹차 추출물', 'Green Tea Extract', 'safe', '노화 방지와 구강 관리 보조제'),
('가수분해 동물 단백질', 'Hydrolyzed Animal Protein', 'safe', '알러지 최소화를 위해 쪼갠 단백질'),
('L-카르니틴', 'L-Carnitine', 'safe', '지방 연소와 심장 건강에 도움'),
('닭 신선육', 'Fresh Chicken', 'safe', '냉각 처리를 거치지 않은 순수 단백질'),
('칠면조 신선육', 'Fresh Turkey', 'safe', '고품질 생육 단백질원'),
('닭 간', 'Chicken Liver', 'safe', '비타민A와 미네랄이 풍부한 식자재'),
('건조 감자', 'Dried Potato', 'safe', 'L.I.D. 사료의 주요 탄수화물원'),
('오리분말', 'Duck Meal', 'safe', '오리고기 농축 단백질'),
('생오리', 'Fresh Duck', 'safe', '고품질 생육 오리 단백질'),
('유채유', 'Canola Oil', 'safe', '오메가-3가 함유된 건강한 식물성 기름'),
('감자단백질', 'Potato Protein', 'safe', '농축된 식물성 단백질원'),
('천연향료', 'Natural Flavor', 'safe', '기호성을 높여주는 천연 성분'),
('DL-메티오닌', 'DL-Methionine', 'safe', '필수 아미노산 및 요로 관리'),
('L-리신', 'L-Lysine', 'safe', '성장과 면역에 필수적인 아미노산'),
('비오틴', 'Biotin', 'safe', '피부와 모질 개선 비타민 B7'),
('탄산칼슘', 'Calcium Carbonate', 'safe', '뼈 성격에 필요한 필수 미네랄'),
('옥수수 글루텐', 'Corn Gluten Meal', 'caution', '단백질 수치를 높이기 위해 사용되는 식물성 원료'),
('가공 가금류 육분', 'Processed Poultry Meal', 'safe', '고단백 동물성 가공분'),
('동물성 지방', 'Animal Fat', 'safe', '에너지원이 되는 정제 유지'),
('어유', 'Fish Oil', 'safe', 'DHA와 EPA가 풍부한 생선 기름'),
('비타민 C', 'Vitamin C', 'safe', '항산화와 관절 건강 보조'),
('신선 월아이', 'Fresh Walleye', 'safe', '흰살생선의 일종으로 기호성이 좋음'),
('강황', 'Turmeric', 'safe', '항염 효과가 뛰어난 천연 향신료')
ON CONFLICT (name_ko) DO NOTHING;

-- 2. Insert Real Products
INSERT INTO public.products (id, name, brand_name, product_type, target_pet_type, min_price, image_url) VALUES
('00000000-0000-0000-0000-000000000201', '로얄캐닌 미니 인도어 어덜트', '로얄캐닌', 'food', 'dog', 15000, 'https://www.royalcanin.com/kr/-/media/royal-canin/korea/products/retail-products/pdp/mini_indoor_adult_fop_ko.png'),
('00000000-0000-0000-0000-000000000202', '오리젠 캣 앤 키튼', '오리젠', 'food', 'cat', 45000, 'https://orijen.ca/wp-content/uploads/2021/04/OR_Cat_Kitten_1.8kg_Front.png'),
('00000000-0000-0000-0000-000000000203', 'L.I.D. 감자 & 오리 건식 사료', '내추럴발란스', 'food', 'dog', 28000, 'https://www.naturalbalanceinc.com/wp-content/uploads/2021/01/LID_PotatoDuck_DryDog_5lb.png'),
('00000000-0000-0000-0000-000000000204', '퓨리나 프로플랜 스테릴라이즈드', '퓨리나', 'food', 'cat', 32000, 'https://purina.co.kr/sites/default/files/2021-03/pro-plan-cat-indoor-adult-1.5kg.png'),
('00000000-0000-0000-0000-000000000205', '아카나 와일드 프레이리 독', '아카나', 'food', 'dog', 38000, 'https://acana.ca/wp-content/uploads/2021/04/AC_Wild_Prairie_Dog_2kg_Front.png')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  brand_name = EXCLUDED.brand_name,
  min_price = EXCLUDED.min_price,
  image_url = EXCLUDED.image_url;

-- 3. Link Real Products with Ingredients
-- Product 201 (Royal Canin): 쌀, 계육분, 옥수수, 현미, 닭 지방 ...
INSERT INTO public.product_ingredients (product_id, ingredient_id, sort_order)
SELECT '00000000-0000-0000-0000-000000000201'::uuid, id, 1 FROM public.ingredients WHERE name_ko = '쌀' UNION ALL
SELECT '00000000-0000-0000-0000-000000000201'::uuid, id, 2 FROM public.ingredients WHERE name_ko = '계육분' UNION ALL
SELECT '00000000-0000-0000-0000-000000000201'::uuid, id, 3 FROM public.ingredients WHERE name_ko = '옥수수' UNION ALL
SELECT '00000000-0000-0000-0000-000000000201'::uuid, id, 4 FROM public.ingredients WHERE name_ko = '현미' UNION ALL
SELECT '00000000-0000-0000-0000-000000000201'::uuid, id, 5 FROM public.ingredients WHERE name_ko = '닭 지방'
ON CONFLICT DO NOTHING;

-- Product 202 (Orijen): 닭 신선육, 칠면조 신선육, 가다랑어, 연어 ...
INSERT INTO public.product_ingredients (product_id, ingredient_id, sort_order)
SELECT '00000000-0000-0000-0000-000000000202'::uuid, id, 1 FROM public.ingredients WHERE name_ko = '닭 신선육' UNION ALL
SELECT '00000000-0000-0000-0000-000000000202'::uuid, id, 2 FROM public.ingredients WHERE name_ko = '칠면조 신선육' UNION ALL
SELECT '00000000-0000-0000-0000-000000000202'::uuid, id, 3 FROM public.ingredients WHERE name_ko = '가다랑어' UNION ALL
SELECT '00000000-0000-0000-0000-000000000202'::uuid, id, 4 FROM public.ingredients WHERE name_ko = '연어'
ON CONFLICT DO NOTHING;

-- Product 203 (Natural Balance): 건조 감자, 오리분말, 생오리, 유채유 ...
INSERT INTO public.product_ingredients (product_id, ingredient_id, sort_order)
SELECT '00000000-0000-0000-0000-000000000203'::uuid, id, 1 FROM public.ingredients WHERE name_ko = '건조 감자' UNION ALL
SELECT '00000000-0000-0000-0000-000000000203'::uuid, id, 2 FROM public.ingredients WHERE name_ko = '오리분말' UNION ALL
SELECT '00000000-0000-0000-0000-000000000203'::uuid, id, 3 FROM public.ingredients WHERE name_ko = '생오리' UNION ALL
SELECT '00000000-0000-0000-0000-000000000203'::uuid, id, 4 FROM public.ingredients WHERE name_ko = '유채유'
ON CONFLICT DO NOTHING;

-- Product 204 (Purina): 닭고기, 쌀, 옥수수 글루텐, 가공 가금류 육분 ...
INSERT INTO public.product_ingredients (product_id, ingredient_id, sort_order)
SELECT '00000000-0000-0000-0000-000000000204'::uuid, id, 1 FROM public.ingredients WHERE name_ko = '닭고기' UNION ALL
SELECT '00000000-0000-0000-0000-000000000204'::uuid, id, 2 FROM public.ingredients WHERE name_ko = '쌀' UNION ALL
SELECT '00000000-0000-0000-0000-000000000204'::uuid, id, 3 FROM public.ingredients WHERE name_ko = '옥수수 글루텐' UNION ALL
SELECT '00000000-0000-0000-0000-000000000204'::uuid, id, 4 FROM public.ingredients WHERE name_ko = '가공 가금류 육분'
ON CONFLICT DO NOTHING;

-- Product 205 (Acana): 신선 닭고기, 신선 칠면조고기, 신선 가다랑어 ...
INSERT INTO public.product_ingredients (product_id, ingredient_id, sort_order)
SELECT '00000000-0000-0000-0000-000000000205'::uuid, id, 1 FROM public.ingredients WHERE name_ko = '신선 닭고기' UNION ALL
SELECT '00000000-0000-0000-0000-000000000205'::uuid, id, 2 FROM public.ingredients WHERE name_ko = '신선 칠면조고기' UNION ALL
SELECT '00000000-0000-0000-0000-000000000205'::uuid, id, 3 FROM public.ingredients WHERE name_ko = '신선 가다랑어' UNION ALL
SELECT '00000000-0000-0000-0000-000000000205'::uuid, id, 4 FROM public.ingredients WHERE name_ko = '건조 닭고기'
ON CONFLICT DO NOTHING;
