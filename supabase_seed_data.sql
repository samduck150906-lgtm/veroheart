-- 1. Clear existing products/ingredients to re-seed (Optional, careful with IDs)
-- TRUNCATE public.product_ingredients, public.products, public.ingredients CASCADE;

-- 2. Insert Real Ingredients
INSERT INTO public.ingredients (name_ko, name_en, risk_level, description, caution_conditions, allergy_triggers)
VALUES 
('생닭고기', 'Fresh Chicken', 'safe', '고품질 단백질원', '', '닭고기 알레르기 유무 확인'),
('생연어', 'Fresh Salmon', 'safe', '오메가-3가 풍부한 단백질원', '피부 건강 도움', '연어 알레르기'),
('감자', 'Potato', 'safe', '탄수화물 공급원', '당뇨 주의', ''),
('완두콩', 'Peas', 'safe', '식물성 단백질 및 섬유질', '', ''),
('가수분해 닭고기', 'Hydrolyzed Chicken', 'safe', '알레르기 반응을 줄인 단백질', '식이 알레르기 관리용', ''),
('옥수수', 'Corn', 'warning', '저가형 탄수화물 충전제', '곡물 알레르기 유발 가능', '곡물'),
('밀', 'Wheat', 'warning', '글루텐 함유 충전제', '글루텐 불내증 주의', '글루텐, 곡물'),
('육류 부산물', 'Meat By-products', 'danger', '출처가 불분명한 도축 부산물', '영양 불균형 및 소화 불량 위험', ''),
('인공 색소', 'Artificial Colors', 'danger', '시각적 효과를 위한 화학 첨가물', '발암 물질 논란 및 과잉 행동 유발', '인공색소'),
('BHA', 'Butylated Hydroxyanisole', 'danger', '화학적 산화방지제', '유해성 논란 (발암 가능성)', ''),
('비트 펄프', 'Beet Pulp', 'safe', '섬유질 공급원, 변 상태 개선', '소화 건강 도움', ''),
('글루코사민', 'Glucosamine', 'safe', '관절 보호 및 연골 건강', '관절 건강 도움', ''),
('오메가-3', 'Omega-3 Fatty Acids', 'safe', '피부 및 피모 건강 개선', '피부 건강 도움', ''),
('유산균', 'Probiotics', 'safe', '장내 유익균 증식 도움', '소화 건강 도움', '')
ON CONFLICT (name_ko) DO NOTHING;

-- 3. Insert Real-world Products
INSERT INTO public.products (id, brand_name, name, product_type, image_url, avg_rating, review_count, min_price)
VALUES 
('d1e3c5a7-1234-4567-8901-234567890abc', '로얄캐닌', '미디엄 어덜트', '강아지 사료', 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=400&q=80', 4.8, 1250, 45000),
('e2f4d6b8-2345-5678-9012-34567890abcd', '오리젠', '오리지널 도그', '강아지 사료', 'https://images.unsplash.com/photo-1544433488-14226f981e7d?w=400&q=80', 4.9, 890, 82000),
('f3g5e7c9-3456-6789-0123-4567890abcde', '나우 프레쉬', '그레인프리 어덜트 도그', '강아지 사료', 'https://images.unsplash.com/photo-1568640347023-a616a30bc3bd?w=400&q=80', 4.7, 560, 58000),
('a4h6f8d0-4567-7890-1234-567890abcdef', '마트표 저가사료', '알뜰 영양사료', '강아지 사료', 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=400&q=80', 3.2, 120, 15000),
('b5i7g9e1-5678-8901-2345-67890abcdef0', '로얄캐닌', '인도어 어덜트 캣', '고양이 사료', 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&q=80', 4.8, 2100, 38000)
ON CONFLICT (id) DO UPDATE SET brand_name = EXCLUDED.brand_name, name = EXCLUDED.name;

-- 4. Map Ingredients to Products (Example mapping)
-- Note: Simplified mapping for demonstration
INSERT INTO public.product_ingredients (product_id, ingredient_id)
SELECT p.id, i.id
FROM public.products p, public.ingredients i
WHERE p.name = '미디엄 어덜트' AND i.name_ko IN ('가수분해 닭고기', '옥수수', '비트 펄프', '글루코사민')
ON CONFLICT DO NOTHING;

INSERT INTO public.product_ingredients (product_id, ingredient_id)
SELECT p.id, i.id
FROM public.products p, public.ingredients i
WHERE p.name = '오리지널 도그' AND i.name_ko IN ('생닭고기', '생연어', '감자', '완두콩', '글루코사민', '오메가-3', '유산균')
ON CONFLICT DO NOTHING;

INSERT INTO public.product_ingredients (product_id, ingredient_id)
SELECT p.id, i.id
FROM public.products p, public.ingredients i
WHERE p.name = '알뜰 영양사료' AND i.name_ko IN ('육류 부산물', '옥수수', '밀', '인공 색소', 'BHA')
ON CONFLICT DO NOTHING;
