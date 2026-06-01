-- 1. EXTENSIVE INGREDIENTS LIST
INSERT INTO public.ingredients (name_ko, name_en, risk_level, description, caution_conditions, allergy_triggers) VALUES
-- Meats & Proteins (Generally Safe)
('소고기', 'Beef', 'safe', '고단백질 원료로 대부분의 반려동물에게 안전합니다.', '{}', '{"beef"}'),
('양고기', 'Lamb', 'safe', '저알러지 단백질원으로 선호됩니다.', '{}', '{"lamb"}'),
('칠면조', 'Turkey', 'safe', '소화가 잘 되는 고단백 저지방 원료입니다.', '{}', '{"poultry"}'),
('오리고기', 'Duck', 'safe', '불포화지방산이 풍부한 단백질원입니다.', '{}', '{"duck"}'),
('흰살생선', 'White Fish', 'safe', '오메가-3와 단백질이 풍부합니다.', '{}', '{"fish"}'),
('멸치', 'Anchovy', 'safe', '칼슘과 오메가-3가 풍부하며 소화가 잘 됩니다.', '{}', '{"fish"}'),
('명태', 'Pollock', 'safe', '저지방 고단백질 생선 원료입니다.', '{}', '{"fish"}'),
('가수분해 대두', 'Hydrolyzed Soy', 'safe', '단백질 분자를 쪼개 알러지 반응을 최소화했습니다.', '{}', '{}'),
('가수분해 연어', 'Hydrolyzed Salmon', 'safe', '생선 알러지가 있는 반려동물에게도 비교적 안전합니다.', '{}', '{}'),
('닭고기', 'Chicken', 'safe', '대중적인 가금류 단백질원입니다.', '{}', '{"chicken"}'),
('돼지고기', 'Pork', 'safe', '양질의 단백질과 비타민 B1이 풍부합니다.', '{}', '{"pork"}'),
('말고기', 'Horse Meat', 'safe', '저지방 고단백질로 알러지 식이요법에 사용됩니다.', '{}', '{}'),
('캥거루', 'Kangaroo', 'safe', '희귀 단백질원으로 중증 알러지 모델에 좋습니다.', '{}', '{}'),
('토끼고기', 'Rabbit', 'safe', '기호성이 좋고 지방이 적은 화이트 미트입니다.', '{}', '{}'),
('메추리', 'Quail', 'safe', '소화가 쉬운 작은 가금류 단백질입니다.', '{}', '{}'),
('계란', 'Egg', 'safe', '생물가가 가장 높은 완벽한 단백질원입니다.', '{}', '{"egg"}'),
('참치', 'Tuna', 'caution', '고단백이나 수은 함량 주의가 필요합니다.', '{}', '{"fish"}'),
('고등어', 'Mackerel', 'safe', '오메가-3가 매우 풍부한 등푸른 생선입니다.', '{}', '{"fish"}'),

-- Grains & Starches
('현미', 'Brown Rice', 'safe', '에너지원이 되는 통곡물입니다.', '{}', '{}'),
('귀리', 'Oats', 'safe', '식이섬유가 풍부하고 소화가 잘 됩니다.', '{}', '{}'),
('보리', 'Barley', 'safe', '저항성 전분이 포함된 탄수화물원입니다.', '{}', '{}'),
('고구마', 'Sweet Potato', 'safe', '비타민과 식이섬유가 풍부한 건강한 탄수화물입니다.', '{}', '{}'),
('감자', 'Potato', 'safe', '일반적인 탄수화물원이지만 혈당지수가 높을 수 있습니다.', '{}', '{}'),
('완두콩', 'Peas', 'safe', '식물성 단백질과 식이섬유를 제공합니다.', '{}', '{}'),
('옥수수', 'Corn', 'caution', '알러지 유발 가능성이 있으며 소화율이 다를 수 있습니다.', '{}', '{"corn"}'),
('밀', 'Wheat', 'caution', '글루텐 알러지가 있는 소수에게 문제가 될 수 있습니다.', '{}', '{"wheat"}'),
('타피오카', 'Tapioca', 'safe', '곡물을 대신하는 전분원으로 그레인프리에 주로 쓰입니다.', '{}', '{}'),

-- Vegetables & Fruits
('당근', 'Carrot', 'safe', '비타민 A와 베타카로틴이 풍부합니다.', '{}', '{}'),
('브로콜리', 'Broccoli', 'safe', '항산화 물질이 풍부합니다.', '{}', '{}'),
('사과', 'Apple', 'safe', '비타민과 펙틴이 풍부합니다 (씨앗은 제외).', '{}', '{}'),
('블루베리', 'Blueberry', 'safe', '강력한 항산화 효과가 있습니다.', '{}', '{}'),
('시금치', 'Spinach', 'safe', '철분과 비타민이 풍부하지만 결석 주의 필요.', '{"kidney"}', '{}'),
('호박', 'Pumpkin', 'safe', '소화를 돕고 설사나 변비에 효과적입니다.', '{}', '{}'),
('크랜베리', 'Cranberry', 'safe', '요로 건강 유지에 도움을 줍니다.', '{"kidney"}', '{}'),
('바나나', 'Banana', 'safe', '칼륨과 에너지를 공급합니다.', '{}', '{}'),
('배', 'Pear', 'safe', '식이섬유가 풍부하고 수분이 많습니다.', '{}', '{}'),

-- Beneficial Additives
('연어오일', 'Salmon Oil', 'safe', '피부와 모질 개선에 도움을 주는 오메가-3 공급원입니다.', '{}', '{"fish"}'),
('로즈마리 추출물', 'Rosemary Extract', 'safe', '천연 보존제 역할을 하는 항산화제입니다.', '{}', '{}'),
('유산균', 'Probiotics', 'safe', '장 건강과 면역력 증진에 도움을 줍니다.', '{}', '{}'),
('글루코사민', 'Glucosamine', 'safe', '관절 건강과 연골 재생에 도움을 줍니다.', '{}', '{}'),
('콘드로이친', 'Chondroitin', 'safe', '관절 보조제로 널리 쓰입니다.', '{}', '{}'),
('타우린', 'Taurine', 'safe', '심장 건강과 시력 보호에 필수적입니다 (고양이에게 필수).', '{}', '{}'),
('유카 추출물', 'Yucca Extract', 'safe', '변 냄새를 감소시키는 데 도움을 줍니다.', '{}', '{}'),

-- Vitamins & Minerals
('비타민 A', 'Vitamin A', 'safe', '시력과 면역력에 필수적입니다.', '{}', '{}'),
('비타민 D3', 'Vitamin D3', 'safe', '칼슘 흡수와 뼈 건강에 필수적입니다.', '{}', '{}'),
('비타민 E', 'Vitamin E', 'safe', '세포 손상을 막는 항산화 비타민입니다.', '{}', '{}'),
('비타민 B12', 'Vitamin B12', 'safe', '에너지 대사와 신경계에 중요합니다.', '{}', '{}'),
('판토텐산 칼슘', 'Calcium Pantothenate', 'safe', '에너지 대사를 돕는 비타민 B5입니다.', '{}', '{}'),
('엽산', 'Folic Acid', 'safe', '세포 분열과 혈액 생성에 중요합니다.', '{}', '{}'),
('황산아연', 'Zinc Sulfate', 'safe', '피부 건강과 면역에 필수적인 미네랄입니다.', '{}', '{}'),

-- Cautionary / Controversial
('소르빈산 칼륨', 'Potassium Sorbate', 'caution', '곰팡이 억제 보존제이나 민감한 아이는 주의.', '{}', '{}'),
('구연산', 'Citric Acid', 'safe', '천연 산도조절제이자 보존제입니다.', '{}', '{}'),
('혼합 토코페롤', 'Mixed Tocopherols', 'safe', '비타민 E 기반의 천연 산화방지제입니다.', '{}', '{}'),
('카라기난', 'Carrageenan', 'caution', '습식 사료 정제제로 쓰이나 장내 염증 논란이 있습니다.', '{"digestive"}', '{}'),
('구아검', 'Guar Gum', 'caution', '점증제로 쓰이며 과도하면 연변을 유발할 수 있습니다.', '{"digestive"}', '{}'),
('소금', 'Salt', 'caution', '과도한 염분은 신장과 심장에 부담을 줄 수 있습니다.', '{"kidney", "heart"}', '{}'),
('마늘', 'Garlic', 'caution', '소량은 유익할 수 있으나 다량 섭취 시 독성이 있습니다.', '{}', '{}'),
('양파', 'Onion', 'danger', '반들동물에게 매우 위험하며 적혈구를 파괴합니다.', '{}', '{}'),
('포도', 'Grape', 'danger', '급성 신부전을 유발할 수 있는 매우 위험한 성분입니다.', '{"kidney"}', '{}'),
('초콜릿', 'Chocolate', 'danger', '카페인과 테오브로민이 중독 증상을 일으킵니다.', '{}', '{}'),
('자일리톨', 'Xylitol', 'danger', '매우 적은 양으로도 저혈당과 간 손상을 유발합니다.', '{"liver"}', '{}'),
('비에이치티(BHT)', 'BHT', 'danger', '인공 산화방지제로 암 유발 가능성이 논란이 됩니다.', '{}', '{}'),
('비에이치에이(BHA)', 'BHA', 'danger', '화학적 보존료로 발암 가능성 논란이 있습니다.', '{}', '{}'),
('에톡시퀸', 'Ethoxyquin', 'danger', '살충제 유래 보존료로 간 손상 위험이 있습니다.', '{"liver"}', '{}'),
('적색 40호', 'Red 40', 'danger', '인공 색소로 알러지나 과잉행동을 유발할 수 있습니다.', '{}', '{}')
ON CONFLICT (name_ko) DO UPDATE SET 
  name_en = EXCLUDED.name_en,
  risk_level = EXCLUDED.risk_level,
  description = EXCLUDED.description,
  caution_conditions = EXCLUDED.caution_conditions,
  allergy_triggers = EXCLUDED.allergy_triggers;

-- 2. ADDITIONAL PRODUCTS FOR REALISTIC DATA
INSERT INTO public.products (id, name, brand_name, product_type, target_pet_type, min_price, image_url) VALUES
('00000000-0000-0000-0000-000000000101', '어덜트 치킨 위드 라이스', '내추럴발란스', 'food', 'dog', 32000, 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?q=80&w=400&auto=format&fit=crop'),
('00000000-0000-0000-0000-000000000102', '고메 연어 스테이크', '시저', 'snack', 'dog', 4500, 'https://images.unsplash.com/photo-1544436486-c74384097491?q=80&w=400&auto=format&fit=crop'),
('00000000-0000-0000-0000-000000000103', '인도어 7+ 노령묘 사료', '로얄캐닌', 'food', 'cat', 48000, 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?q=80&w=400&auto=format&fit=crop'),
('00000000-0000-0000-0000-000000000104', '동결건조 북어 트릿', '펫프렌즈', 'snack', 'cat', 12000, 'https://images.unsplash.com/photo-1554692998-0d26844432d0?q=80&w=400&auto=format&fit=crop'),
('00000000-0000-0000-0000-000000000105', '피부케어 힙앤조인트', '웰츠', 'supplement', 'dog', 25000, 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?q=80&w=400&auto=format&fit=crop')
ON CONFLICT (id) DO NOTHING;
