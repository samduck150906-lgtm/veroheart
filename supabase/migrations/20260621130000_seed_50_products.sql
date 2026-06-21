-- 베로로 상품 시드 데이터 v2 — 50개 주요 한국 반려동물 사료/간식/영양제
-- 멱등(idempotent): 이미 존재하는 name+brand_name 조합은 SKIP
-- 바코드는 개발/테스트용 임의 값 (실제 EAN-13 형식)

BEGIN;

-- ────────────────────────────────────────────────────────────
-- 성분 사전 보강 (upsert — 동일 name_ko면 무시)
-- ────────────────────────────────────────────────────────────
INSERT INTO public.ingredients (name_ko, name_en, risk_level, description, caution_conditions, allergy_triggers)
VALUES
  ('닭고기', 'Chicken', 'safe', '양질의 동물성 단백질원입니다.', '{}', '{"chicken","poultry"}'),
  ('연어', 'Salmon', 'safe', '오메가3가 풍부한 생선 단백질원입니다.', '{}', '{"fish","salmon"}'),
  ('소고기', 'Beef', 'safe', '단백질과 철분이 풍부합니다.', '{}', '{"beef"}'),
  ('양고기', 'Lamb', 'safe', '저알러지 단백질원으로 민감한 반려동물에게 적합합니다.', '{}', '{"lamb"}'),
  ('오리고기', 'Duck', 'safe', '저알러지 단백질원입니다.', '{}', '{"duck","poultry"}'),
  ('칠면조', 'Turkey', 'safe', '저지방 고단백질 원료입니다.', '{}', '{"turkey","poultry"}'),
  ('청어', 'Herring', 'safe', '오메가3 DHA/EPA가 풍부합니다.', '{}', '{"fish","herring"}'),
  ('고등어', 'Mackerel', 'safe', '오메가3가 풍부한 생선입니다.', '{}', '{"fish"}'),
  ('참치', 'Tuna', 'safe', '고단백 생선 원료입니다.', '{"과량 섭취 시 수은 축적 가능성"}', '{"fish","tuna"}'),
  ('대구', 'Cod', 'safe', '저지방 흰살 생선입니다.', '{}', '{"fish"}'),
  ('닭간', 'Chicken Liver', 'safe', '비타민A와 철분이 풍부합니다.', '{"과량 섭취 시 비타민A 과잉 주의"}', '{"chicken","poultry"}'),
  ('닭가슴살', 'Chicken Breast', 'safe', '저지방 고단백질 원료입니다.', '{}', '{"chicken","poultry"}'),
  ('현미', 'Brown Rice', 'safe', '소화 가능한 복합 탄수화물 원료입니다.', '{}', '{"grain"}'),
  ('귀리', 'Oats', 'safe', '식이섬유가 풍부한 곡물입니다.', '{}', '{"grain","gluten"}'),
  ('고구마', 'Sweet Potato', 'safe', '글루텐 프리 탄수화물원으로 식이섬유가 풍부합니다.', '{}', '{}'),
  ('감자', 'Potato', 'safe', '글루텐 프리 탄수화물원입니다.', '{}', '{}'),
  ('완두콩', 'Peas', 'safe', '식물성 단백질과 식이섬유를 제공합니다.', '{}', '{"legume"}'),
  ('당근', 'Carrots', 'safe', '베타카로틴과 식이섬유가 풍부합니다.', '{}', '{}'),
  ('브로콜리', 'Broccoli', 'safe', '항산화 비타민이 풍부합니다.', '{}', '{}'),
  ('블루베리', 'Blueberries', 'safe', '항산화 물질이 풍부한 과일입니다.', '{}', '{}'),
  ('연어유', 'Salmon Oil', 'safe', '오메가3 DHA/EPA가 풍부합니다.', '{}', '{"fish"}'),
  ('아마씨', 'Flaxseed', 'safe', '오메가3와 식이섬유를 제공합니다.', '{}', '{}'),
  ('코코넛오일', 'Coconut Oil', 'safe', '중쇄지방산(MCT)을 함유합니다.', '{}', '{}'),
  ('해바라기씨유', 'Sunflower Oil', 'safe', '오메가6 지방산을 제공합니다.', '{}', '{}'),
  ('글루코사민', 'Glucosamine', 'safe', '관절 건강 지원 기능성 성분입니다.', '{}', '{}'),
  ('콘드로이틴', 'Chondroitin', 'safe', '연골 보호 기능성 성분입니다.', '{}', '{}'),
  ('프로바이오틱스', 'Probiotics', 'safe', '장내 유익균을 증가시킵니다.', '{}', '{}'),
  ('프리바이오틱스', 'Prebiotics', 'safe', '장내 유익균의 먹이가 됩니다.', '{}', '{}'),
  ('타우린', 'Taurine', 'safe', '고양이 필수 아미노산으로 심장과 눈 건강에 중요합니다.', '{}', '{}'),
  ('아르기닌', 'Arginine', 'safe', '고양이 필수 아미노산입니다.', '{}', '{}'),
  ('비타민E', 'Vitamin E', 'safe', '항산화 비타민입니다.', '{}', '{}'),
  ('비타민C', 'Vitamin C', 'safe', '면역 기능을 지원합니다.', '{}', '{}'),
  ('아연', 'Zinc', 'safe', '피부와 면역 기능에 필요한 미네랄입니다.', '{}', '{}'),
  ('오메가3', 'Omega-3', 'safe', '피부·피모·인지 기능에 도움을 줍니다.', '{}', '{"fish"}'),
  ('옥수수', 'Corn', 'warning', '일부 반려동물에서 알레르기를 유발할 수 있습니다.', '{"옥수수 알레르기 반려동물 주의"}', '{"corn","grain"}'),
  ('밀', 'Wheat', 'warning', '글루텐을 함유하여 일부 반려동물에게 소화 문제를 일으킬 수 있습니다.', '{"글루텐 민감 반려동물 주의"}', '{"wheat","grain","gluten"}'),
  ('대두', 'Soy', 'warning', '식물성 단백질이지만 일부에서 알레르기를 유발합니다.', '{"대두 알레르기 반려동물 주의"}', '{"soy","legume"}'),
  ('카라기난', 'Carrageenan', 'warning', '장 건강에 부정적 영향을 줄 수 있다는 연구가 있습니다.', '{"소화 민감 반려동물 주의"}', '{}'),
  ('인공향료', 'Artificial Flavoring', 'warning', '인공 향미 증진제입니다.', '{"민감한 반려동물 주의"}', '{}'),
  ('인공색소', 'Artificial Coloring', 'warning', '식품 색소로 영양적 가치가 없습니다.', '{"민감한 반려동물 주의"}', '{}'),
  ('BHA', 'BHA', 'danger', '부틸히드록시아니솔. 동물 실험에서 발암 가능성이 제기된 합성 산화방지제입니다.', '{"장기 섭취 주의"}', '{}'),
  ('BHT', 'BHT', 'danger', '부틸히드록시톨루엔. 합성 산화방지제로 장기 섭취 시 간 독성 우려가 있습니다.', '{"장기 섭취 주의"}', '{}'),
  ('에톡시퀸', 'Ethoxyquin', 'danger', '살충제 성분에서 유래한 합성 산화방지제입니다.', '{"장기 섭취 주의"}', '{}'),
  ('자일리톨', 'Xylitol', 'danger', '개에게 매우 독성이 강한 당알코올입니다.', '{"개에게 절대 금지"}', '{}'),
  ('양파분말', 'Onion Powder', 'danger', '개와 고양이에게 독성이 있으며 용혈성 빈혈을 유발합니다.', '{"개·고양이 금지"}', '{}'),
  ('마늘', 'Garlic', 'danger', '고양이에게는 독성, 개에게도 과량 시 독성이 있습니다.', '{"고양이 금지", "과량 주의"}', '{}'),
  ('포도', 'Grape', 'danger', '개에게 신부전을 유발할 수 있습니다.', '{"개에게 절대 금지"}', '{}'),
  ('소금', 'Salt', 'warning', '과량 섭취 시 신장에 부담을 줄 수 있습니다.', '{"과량 급여 주의", "신장질환 주의"}', '{}'),
  ('설탕', 'Sugar', 'warning', '비만, 충치, 당뇨 위험을 높입니다.', '{"비만 위험 반려동물 주의"}', '{}'),
  ('닭부산물', 'Chicken By-Products', 'warning', '닭고기의 비정육 부위로 영양가는 있으나 품질이 일정하지 않습니다.', '{"출처 확인 권장"}', '{"chicken","poultry"}'),
  ('어분', 'Fish Meal', 'safe', '건조 농축 어류 단백질입니다.', '{"출처 확인 권장"}', '{"fish"}'),
  ('육분', 'Meat Meal', 'warning', '동물성 원료의 건조 분말로 출처가 불명확할 수 있습니다.', '{"출처 확인 권장"}', '{}'),
  ('소화효소', 'Digestive Enzymes', 'safe', '소화를 돕는 효소 혼합물입니다.', '{}', '{}'),
  ('혼합토코페롤', 'Mixed Tocopherols', 'safe', '천연 비타민E 유래 항산화제로 안전합니다.', '{}', '{}')
ON CONFLICT (name_ko) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 상품 50개 등록
-- ────────────────────────────────────────────────────────────

-- 임시 테이블로 삽입할 상품 목록 관리
DO $$
DECLARE
  pid UUID;
  ing_id UUID;
BEGIN

-- ══════════════════════════════════════
-- 강아지 건식 사료 (16개)
-- ══════════════════════════════════════

-- 1. 로얄캐닌 미니 어덜트
INSERT INTO public.products (name, brand_name, product_type, target_pet_type, target_life_stage, formulation, product_health_concerns, min_price, avg_rating, review_count, barcode)
VALUES ('미니 어덜트 (Mini Adult)', '로얄캐닌', 'food', 'dog', '{"adult"}', '건식', '{"소화","구강"}', 28000, 4.3, 1240, '3182550708326')
ON CONFLICT DO NOTHING RETURNING id INTO pid;
IF pid IS NULL THEN SELECT id INTO pid FROM public.products WHERE name='미니 어덜트 (Mini Adult)' AND brand_name='로얄캐닌'; END IF;
FOR ing_id IN SELECT id FROM public.ingredients WHERE name_ko IN ('닭고기','현미','귀리','닭부산물','혼합토코페롤') LOOP
  INSERT INTO public.product_ingredients (product_id, ingredient_id) VALUES (pid, ing_id) ON CONFLICT DO NOTHING;
END LOOP;

-- 2. 로얄캐닌 X-Small 어덜트
INSERT INTO public.products (name, brand_name, product_type, target_pet_type, target_life_stage, formulation, product_health_concerns, min_price, avg_rating, review_count, barcode)
VALUES ('X-Small 어덜트', '로얄캐닌', 'food', 'dog', '{"adult"}', '건식', '{"소화","구강"}', 32000, 4.2, 890, '3182550804424')
ON CONFLICT DO NOTHING RETURNING id INTO pid;
IF pid IS NULL THEN SELECT id INTO pid FROM public.products WHERE name='X-Small 어덜트' AND brand_name='로얄캐닌'; END IF;
FOR ing_id IN SELECT id FROM public.ingredients WHERE name_ko IN ('닭고기','현미','귀리','닭부산물','혼합토코페롤') LOOP
  INSERT INTO public.product_ingredients (product_id, ingredient_id) VALUES (pid, ing_id) ON CONFLICT DO NOTHING;
END LOOP;

-- 3. 오리젠 오리지널 독
INSERT INTO public.products (name, brand_name, product_type, target_pet_type, target_life_stage, formulation, product_health_concerns, min_price, avg_rating, review_count, barcode)
VALUES ('오리지널 (Original Dog)', '오리젠', 'food', 'dog', '{"adult","all"}', '건식', '{"피부","면역","근육"}', 52000, 4.7, 2150, '0064992000050')
ON CONFLICT DO NOTHING RETURNING id INTO pid;
IF pid IS NULL THEN SELECT id INTO pid FROM public.products WHERE name='오리지널 (Original Dog)' AND brand_name='오리젠'; END IF;
FOR ing_id IN SELECT id FROM public.ingredients WHERE name_ko IN ('닭고기','칠면조','연어','청어','고등어','연어유','혼합토코페롤') LOOP
  INSERT INTO public.product_ingredients (product_id, ingredient_id) VALUES (pid, ing_id) ON CONFLICT DO NOTHING;
END LOOP;

-- 4. 오리젠 식스피시
INSERT INTO public.products (name, brand_name, product_type, target_pet_type, target_life_stage, formulation, product_health_concerns, min_price, avg_rating, review_count, barcode)
VALUES ('식스 피시 (Six Fish)', '오리젠', 'food', 'dog', '{"adult","all"}', '건식', '{"피부","관절","오메가3"}', 55000, 4.6, 1820, '0064992000067')
ON CONFLICT DO NOTHING RETURNING id INTO pid;
IF pid IS NULL THEN SELECT id INTO pid FROM public.products WHERE name='식스 피시 (Six Fish)' AND brand_name='오리젠'; END IF;
FOR ing_id IN SELECT id FROM public.ingredients WHERE name_ko IN ('연어','청어','대구','고등어','참치','연어유','혼합토코페롤') LOOP
  INSERT INTO public.product_ingredients (product_id, ingredient_id) VALUES (pid, ing_id) ON CONFLICT DO NOTHING;
END LOOP;

-- 5. 아카나 퍼시픽 파이
INSERT INTO public.products (name, brand_name, product_type, target_pet_type, target_life_stage, formulation, product_health_concerns, min_price, avg_rating, review_count, barcode)
VALUES ('퍼시픽 파이 (Pacific Pie)', '아카나', 'food', 'dog', '{"adult","all"}', '건식', '{"피부","오메가3","알레르기"}', 48000, 4.5, 1540, '0064992330031')
ON CONFLICT DO NOTHING RETURNING id INTO pid;
IF pid IS NULL THEN SELECT id INTO pid FROM public.products WHERE name='퍼시픽 파이 (Pacific Pie)' AND brand_name='아카나'; END IF;
FOR ing_id IN SELECT id FROM public.ingredients WHERE name_ko IN ('연어','청어','감자','고구마','연어유','혼합토코페롤') LOOP
  INSERT INTO public.product_ingredients (product_id, ingredient_id) VALUES (pid, ing_id) ON CONFLICT DO NOTHING;
END LOOP;

-- 6. 아카나 람 & 오카나간 사과
INSERT INTO public.products (name, brand_name, product_type, target_pet_type, target_life_stage, formulation, product_health_concerns, min_price, avg_rating, review_count, barcode)
VALUES ('램 & 오카나간 애플 (Lamb & Okanagan Apple)', '아카나', 'food', 'dog', '{"adult","all"}', '건식', '{"알레르기","소화"}', 46000, 4.4, 1230, '0064992330048')
ON CONFLICT DO NOTHING RETURNING id INTO pid;
IF pid IS NULL THEN SELECT id INTO pid FROM public.products WHERE name='램 & 오카나간 애플 (Lamb & Okanagan Apple)' AND brand_name='아카나'; END IF;
FOR ing_id IN SELECT id FROM public.ingredients WHERE name_ko IN ('양고기','감자','고구마','연어유','혼합토코페롤') LOOP
  INSERT INTO public.product_ingredients (product_id, ingredient_id) VALUES (pid, ing_id) ON CONFLICT DO NOTHING;
END LOOP;

-- 7. 힐스 사이언스다이어트 어덜트 스몰바이트
INSERT INTO public.products (name, brand_name, product_type, target_pet_type, target_life_stage, formulation, product_health_concerns, min_price, avg_rating, review_count, barcode)
VALUES ('사이언스다이어트 어덜트 스몰바이트', 'Hills', 'food', 'dog', '{"adult"}', '건식', '{"소화","구강","면역"}', 38000, 4.3, 2340, '0052742134413')
ON CONFLICT DO NOTHING RETURNING id INTO pid;
IF pid IS NULL THEN SELECT id INTO pid FROM public.products WHERE name='사이언스다이어트 어덜트 스몰바이트' AND brand_name='Hills'; END IF;
FOR ing_id IN SELECT id FROM public.ingredients WHERE name_ko IN ('닭고기','현미','귀리','닭간','비타민E','비타민C') LOOP
  INSERT INTO public.product_ingredients (product_id, ingredient_id) VALUES (pid, ing_id) ON CONFLICT DO NOTHING;
END LOOP;

-- 8. 힐스 시니어 7+ 소형견
INSERT INTO public.products (name, brand_name, product_type, target_pet_type, target_life_stage, formulation, product_health_concerns, min_price, avg_rating, review_count, barcode)
VALUES ('사이언스다이어트 시니어 7+ 소형견', 'Hills', 'food', 'dog', '{"senior"}', '건식', '{"관절","심장","인지","소화"}', 42000, 4.4, 1780, '0052742134420')
ON CONFLICT DO NOTHING RETURNING id INTO pid;
IF pid IS NULL THEN SELECT id INTO pid FROM public.products WHERE name='사이언스다이어트 시니어 7+ 소형견' AND brand_name='Hills'; END IF;
FOR ing_id IN SELECT id FROM public.ingredients WHERE name_ko IN ('닭고기','현미','글루코사민','콘드로이틴','오메가3','비타민E') LOOP
  INSERT INTO public.product_ingredients (product_id, ingredient_id) VALUES (pid, ing_id) ON CONFLICT DO NOTHING;
END LOOP;

-- 9. 뉴트로 와일드 레시피 연어
INSERT INTO public.products (name, brand_name, product_type, target_pet_type, target_life_stage, formulation, product_health_concerns, min_price, avg_rating, review_count, barcode)
VALUES ('와일드 레시피 연어 & 고구마', '뉴트로', 'food', 'dog', '{"adult","all"}', '건식', '{"알레르기","피부","오메가3"}', 35000, 4.2, 1120, '0079105100316')
ON CONFLICT DO NOTHING RETURNING id INTO pid;
IF pid IS NULL THEN SELECT id INTO pid FROM public.products WHERE name='와일드 레시피 연어 & 고구마' AND brand_name='뉴트로'; END IF;
FOR ing_id IN SELECT id FROM public.ingredients WHERE name_ko IN ('연어','고구마','감자','연어유','혼합토코페롤') LOOP
  INSERT INTO public.product_ingredients (product_id, ingredient_id) VALUES (pid, ing_id) ON CONFLICT DO NOTHING;
END LOOP;

-- 10. 내추럴발란스 L.I.D. 오리 & 감자
INSERT INTO public.products (name, brand_name, product_type, target_pet_type, target_life_stage, formulation, product_health_concerns, min_price, avg_rating, review_count, barcode)
VALUES ('L.I.D. 오리 & 감자', '내추럴발란스', 'food', 'dog', '{"adult","all"}', '건식', '{"알레르기","피부","소화"}', 40000, 4.3, 980, '0023700440179')
ON CONFLICT DO NOTHING RETURNING id INTO pid;
IF pid IS NULL THEN SELECT id INTO pid FROM public.products WHERE name='L.I.D. 오리 & 감자' AND brand_name='내추럴발란스'; END IF;
FOR ing_id IN SELECT id FROM public.ingredients WHERE name_ko IN ('오리고기','감자','고구마','연어유','혼합토코페롤') LOOP
  INSERT INTO public.product_ingredients (product_id, ingredient_id) VALUES (pid, ing_id) ON CONFLICT DO NOTHING;
END LOOP;

-- 11. 카길 네이처스레시피 그레인프리 연어
INSERT INTO public.products (name, brand_name, product_type, target_pet_type, target_life_stage, formulation, product_health_concerns, min_price, avg_rating, review_count, barcode)
VALUES ('그레인프리 연어 & 고구마 레시피', '네이처스레시피', 'food', 'dog', '{"adult","all"}', '건식', '{"알레르기","피부"}', 30000, 4.1, 760, '0079100943400')
ON CONFLICT DO NOTHING RETURNING id INTO pid;
IF pid IS NULL THEN SELECT id INTO pid FROM public.products WHERE name='그레인프리 연어 & 고구마 레시피' AND brand_name='네이처스레시피'; END IF;
FOR ing_id IN SELECT id FROM public.ingredients WHERE name_ko IN ('연어','고구마','감자','완두콩','연어유') LOOP
  INSERT INTO public.product_ingredients (product_id, ingredient_id) VALUES (pid, ing_id) ON CONFLICT DO NOTHING;
END LOOP;

-- 12. 블루버팔로 라이프소스 비츠 어덜트
INSERT INTO public.products (name, brand_name, product_type, target_pet_type, target_life_stage, formulation, product_health_concerns, min_price, avg_rating, review_count, barcode)
VALUES ('라이프소스 비츠 어덜트 닭고기 & 현미', '블루버팔로', 'food', 'dog', '{"adult"}', '건식', '{"면역","소화","피부"}', 45000, 4.4, 2100, '0859610004148')
ON CONFLICT DO NOTHING RETURNING id INTO pid;
IF pid IS NULL THEN SELECT id INTO pid FROM public.products WHERE name='라이프소스 비츠 어덜트 닭고기 & 현미' AND brand_name='블루버팔로'; END IF;
FOR ing_id IN SELECT id FROM public.ingredients WHERE name_ko IN ('닭고기','현미','귀리','블루베리','당근','비타민E') LOOP
  INSERT INTO public.product_ingredients (product_id, ingredient_id) VALUES (pid, ing_id) ON CONFLICT DO NOTHING;
END LOOP;

-- 13. 메릭 그레인프리 리얼 버팔로 & 스위트포테이토
INSERT INTO public.products (name, brand_name, product_type, target_pet_type, target_life_stage, formulation, product_health_concerns, min_price, avg_rating, review_count, barcode)
VALUES ('그레인프리 리얼 버팔로 & 스위트포테이토', '메릭', 'food', 'dog', '{"adult","all"}', '건식', '{"근육","알레르기","관절"}', 50000, 4.5, 1350, '0022808340118')
ON CONFLICT DO NOTHING RETURNING id INTO pid;
IF pid IS NULL THEN SELECT id INTO pid FROM public.products WHERE name='그레인프리 리얼 버팔로 & 스위트포테이토' AND brand_name='메릭'; END IF;
FOR ing_id IN SELECT id FROM public.ingredients WHERE name_ko IN ('소고기','고구마','감자','완두콩','연어유','글루코사민','콘드로이틴') LOOP
  INSERT INTO public.product_ingredients (product_id, ingredient_id) VALUES (pid, ing_id) ON CONFLICT DO NOTHING;
END LOOP;

-- 14. 강아지 퍼피 사료 — 로얄캐닌 미니 스타터
INSERT INTO public.products (name, brand_name, product_type, target_pet_type, target_life_stage, formulation, product_health_concerns, min_price, avg_rating, review_count, barcode)
VALUES ('미니 스타터 마더 & 베이비독', '로얄캐닌', 'food', 'dog', '{"puppy_kitten","all"}', '건식', '{"소화","면역","성장"}', 34000, 4.4, 1560, '3182550708210')
ON CONFLICT DO NOTHING RETURNING id INTO pid;
IF pid IS NULL THEN SELECT id INTO pid FROM public.products WHERE name='미니 스타터 마더 & 베이비독' AND brand_name='로얄캐닌'; END IF;
FOR ing_id IN SELECT id FROM public.ingredients WHERE name_ko IN ('닭고기','현미','귀리','닭부산물','프로바이오틱스','혼합토코페롤') LOOP
  INSERT INTO public.product_ingredients (product_id, ingredient_id) VALUES (pid, ing_id) ON CONFLICT DO NOTHING;
END LOOP;

-- 15. 힐스 퍼피 스몰&미니
INSERT INTO public.products (name, brand_name, product_type, target_pet_type, target_life_stage, formulation, product_health_concerns, min_price, avg_rating, review_count, barcode)
VALUES ('사이언스다이어트 퍼피 스몰&미니', 'Hills', 'food', 'dog', '{"puppy_kitten"}', '건식', '{"성장","뼈","면역"}', 36000, 4.3, 1890, '0052742148847')
ON CONFLICT DO NOTHING RETURNING id INTO pid;
IF pid IS NULL THEN SELECT id INTO pid FROM public.products WHERE name='사이언스다이어트 퍼피 스몰&미니' AND brand_name='Hills'; END IF;
FOR ing_id IN SELECT id FROM public.ingredients WHERE name_ko IN ('닭고기','현미','닭간','비타민E','비타민C','아연') LOOP
  INSERT INTO public.product_ingredients (product_id, ingredient_id) VALUES (pid, ing_id) ON CONFLICT DO NOTHING;
END LOOP;

-- 16. 퍼피 그레인프리 — 블루버팔로 와일더니스
INSERT INTO public.products (name, brand_name, product_type, target_pet_type, target_life_stage, formulation, product_health_concerns, min_price, avg_rating, review_count, barcode)
VALUES ('와일더니스 퍼피 닭고기', '블루버팔로', 'food', 'dog', '{"puppy_kitten"}', '건식', '{"성장","뼈","근육"}', 42000, 4.5, 1020, '0859610004261')
ON CONFLICT DO NOTHING RETURNING id INTO pid;
IF pid IS NULL THEN SELECT id INTO pid FROM public.products WHERE name='와일더니스 퍼피 닭고기' AND brand_name='블루버팔로'; END IF;
FOR ing_id IN SELECT id FROM public.ingredients WHERE name_ko IN ('닭고기','닭가슴살','완두콩','고구마','연어유','비타민E') LOOP
  INSERT INTO public.product_ingredients (product_id, ingredient_id) VALUES (pid, ing_id) ON CONFLICT DO NOTHING;
END LOOP;

-- ══════════════════════════════════════
-- 강아지 습식 사료 (5개)
-- ══════════════════════════════════════

-- 17. 위스카스 독 닭&야채 파우치
INSERT INTO public.products (name, brand_name, product_type, target_pet_type, target_life_stage, formulation, product_health_concerns, min_price, avg_rating, review_count, barcode)
VALUES ('닭고기 & 야채 파우치', '시저', 'food', 'dog', '{"adult"}', '습식', '{"소화","수분"}', 2500, 4.1, 3200, '0023100113406')
ON CONFLICT DO NOTHING RETURNING id INTO pid;
IF pid IS NULL THEN SELECT id INTO pid FROM public.products WHERE name='닭고기 & 야채 파우치' AND brand_name='시저'; END IF;
FOR ing_id IN SELECT id FROM public.ingredients WHERE name_ko IN ('닭고기','닭간','당근','소금') LOOP
  INSERT INTO public.product_ingredients (product_id, ingredient_id) VALUES (pid, ing_id) ON CONFLICT DO NOTHING;
END LOOP;

-- 18. 로얄캐닌 가스트로 인테스티널 습식
INSERT INTO public.products (name, brand_name, product_type, target_pet_type, target_life_stage, formulation, product_health_concerns, min_price, avg_rating, review_count, barcode)
VALUES ('가스트로 인테스티널 습식', '로얄캐닌', 'food', 'dog', '{"adult","senior"}', '습식', '{"소화","장건강"}', 6500, 4.5, 870, '3182550910699')
ON CONFLICT DO NOTHING RETURNING id INTO pid;
IF pid IS NULL THEN SELECT id INTO pid FROM public.products WHERE name='가스트로 인테스티널 습식' AND brand_name='로얄캐닌'; END IF;
FOR ing_id IN SELECT id FROM public.ingredients WHERE name_ko IN ('닭고기','현미','프로바이오틱스','프리바이오틱스') LOOP
  INSERT INTO public.product_ingredients (product_id, ingredient_id) VALUES (pid, ing_id) ON CONFLICT DO NOTHING;
END LOOP;

-- 19. 메릭 클래식 그레인프리 리얼 터키 습식
INSERT INTO public.products (name, brand_name, product_type, target_pet_type, target_life_stage, formulation, product_health_concerns, min_price, avg_rating, review_count, barcode)
VALUES ('클래식 그레인프리 리얼 터키 습식', '메릭', 'food', 'dog', '{"adult","all"}', '습식', '{"알레르기","근육","수분"}', 4800, 4.4, 650, '0022808420116')
ON CONFLICT DO NOTHING RETURNING id INTO pid;
IF pid IS NULL THEN SELECT id INTO pid FROM public.products WHERE name='클래식 그레인프리 리얼 터키 습식' AND brand_name='메릭'; END IF;
FOR ing_id IN SELECT id FROM public.ingredients WHERE name_ko IN ('칠면조','고구마','당근','완두콩','혼합토코페롤') LOOP
  INSERT INTO public.product_ingredients (product_id, ingredient_id) VALUES (pid, ing_id) ON CONFLICT DO NOTHING;
END LOOP;

-- 20. 내추럴발란스 L.I.D. 연어 습식 캔
INSERT INTO public.products (name, brand_name, product_type, target_pet_type, target_life_stage, formulation, product_health_concerns, min_price, avg_rating, review_count, barcode)
VALUES ('L.I.D. 연어 & 고구마 습식 캔', '내추럴발란스', 'food', 'dog', '{"adult","all"}', '습식', '{"알레르기","피부"}', 5200, 4.2, 540, '0023700440186')
ON CONFLICT DO NOTHING RETURNING id INTO pid;
IF pid IS NULL THEN SELECT id INTO pid FROM public.products WHERE name='L.I.D. 연어 & 고구마 습식 캔' AND brand_name='내추럴발란스'; END IF;
FOR ing_id IN SELECT id FROM public.ingredients WHERE name_ko IN ('연어','고구마','연어유','혼합토코페롤') LOOP
  INSERT INTO public.product_ingredients (product_id, ingredient_id) VALUES (pid, ing_id) ON CONFLICT DO NOTHING;
END LOOP;

-- 21. 오리젠 트레이 비프 & 버터너트스쿼시
INSERT INTO public.products (name, brand_name, product_type, target_pet_type, target_life_stage, formulation, product_health_concerns, min_price, avg_rating, review_count, barcode)
VALUES ('비프 & 버터너트스쿼시 습식 트레이', '오리젠', 'food', 'dog', '{"adult","all"}', '습식', '{"근육","수분","알레르기"}', 5800, 4.6, 430, '0064992700037')
ON CONFLICT DO NOTHING RETURNING id INTO pid;
IF pid IS NULL THEN SELECT id INTO pid FROM public.products WHERE name='비프 & 버터너트스쿼시 습식 트레이' AND brand_name='오리젠'; END IF;
FOR ing_id IN SELECT id FROM public.ingredients WHERE name_ko IN ('소고기','닭간','당근','연어유','혼합토코페롤') LOOP
  INSERT INTO public.product_ingredients (product_id, ingredient_id) VALUES (pid, ing_id) ON CONFLICT DO NOTHING;
END LOOP;

-- ══════════════════════════════════════
-- 고양이 건식 사료 (12개)
-- ══════════════════════════════════════

-- 22. 오리젠 캣 & 키튼
INSERT INTO public.products (name, brand_name, product_type, target_pet_type, target_life_stage, formulation, product_health_concerns, min_price, avg_rating, review_count, barcode)
VALUES ('캣 & 키튼 (Cat & Kitten)', '오리젠', 'food', 'cat', '{"adult","puppy_kitten","all"}', '건식', '{"근육","피부","면역"}', 48000, 4.8, 3200, '0064992100018')
ON CONFLICT DO NOTHING RETURNING id INTO pid;
IF pid IS NULL THEN SELECT id INTO pid FROM public.products WHERE name='캣 & 키튼 (Cat & Kitten)' AND brand_name='오리젠'; END IF;
FOR ing_id IN SELECT id FROM public.ingredients WHERE name_ko IN ('닭고기','칠면조','연어','청어','닭간','타우린','연어유','혼합토코페롤') LOOP
  INSERT INTO public.product_ingredients (product_id, ingredient_id) VALUES (pid, ing_id) ON CONFLICT DO NOTHING;
END LOOP;

-- 23. 로얄캐닌 인도어 캣 어덜트
INSERT INTO public.products (name, brand_name, product_type, target_pet_type, target_life_stage, formulation, product_health_concerns, min_price, avg_rating, review_count, barcode)
VALUES ('인도어 어덜트', '로얄캐닌', 'food', 'cat', '{"adult"}', '건식', '{"소화","체중","구강","헤어볼"}', 32000, 4.3, 2780, '3182550717779')
ON CONFLICT DO NOTHING RETURNING id INTO pid;
IF pid IS NULL THEN SELECT id INTO pid FROM public.products WHERE name='인도어 어덜트' AND brand_name='로얄캐닌'; END IF;
FOR ing_id IN SELECT id FROM public.ingredients WHERE name_ko IN ('닭고기','현미','귀리','닭부산물','타우린','혼합토코페롤') LOOP
  INSERT INTO public.product_ingredients (product_id, ingredient_id) VALUES (pid, ing_id) ON CONFLICT DO NOTHING;
END LOOP;

-- 24. 로얄캐닌 피트니스 & 뷰티 (장모)
INSERT INTO public.products (name, brand_name, product_type, target_pet_type, target_life_stage, formulation, product_health_concerns, min_price, avg_rating, review_count, barcode)
VALUES ('피트니스 & 뷰티 장모종', '로얄캐닌', 'food', 'cat', '{"adult"}', '건식', '{"피부","피모","헤어볼"}', 35000, 4.2, 1340, '3182550717786')
ON CONFLICT DO NOTHING RETURNING id INTO pid;
IF pid IS NULL THEN SELECT id INTO pid FROM public.products WHERE name='피트니스 & 뷰티 장모종' AND brand_name='로얄캐닌'; END IF;
FOR ing_id IN SELECT id FROM public.ingredients WHERE name_ko IN ('닭고기','현미','오메가3','타우린','비타민E','아연') LOOP
  INSERT INTO public.product_ingredients (product_id, ingredient_id) VALUES (pid, ing_id) ON CONFLICT DO NOTHING;
END LOOP;

-- 25. 퓨리나 프로플랜 스테릴라이즈드 연어
INSERT INTO public.products (name, brand_name, product_type, target_pet_type, target_life_stage, formulation, product_health_concerns, min_price, avg_rating, review_count, barcode)
VALUES ('프로플랜 스테릴라이즈드 연어', '퓨리나', 'food', 'cat', '{"adult"}', '건식', '{"비만","체중","신장"}', 32000, 4.3, 2560, '0038100175397')
ON CONFLICT DO NOTHING RETURNING id INTO pid;
IF pid IS NULL THEN SELECT id INTO pid FROM public.products WHERE name='프로플랜 스테릴라이즈드 연어' AND brand_name='퓨리나'; END IF;
FOR ing_id IN SELECT id FROM public.ingredients WHERE name_ko IN ('연어','대구','현미','타우린','혼합토코페롤') LOOP
  INSERT INTO public.product_ingredients (product_id, ingredient_id) VALUES (pid, ing_id) ON CONFLICT DO NOTHING;
END LOOP;

-- 26. 힐스 인도어 어덜트 고양이
INSERT INTO public.products (name, brand_name, product_type, target_pet_type, target_life_stage, formulation, product_health_concerns, min_price, avg_rating, review_count, barcode)
VALUES ('사이언스다이어트 인도어 어덜트', 'Hills', 'food', 'cat', '{"adult"}', '건식', '{"체중","헤어볼","소화"}', 38000, 4.3, 1980, '0052742028505')
ON CONFLICT DO NOTHING RETURNING id INTO pid;
IF pid IS NULL THEN SELECT id INTO pid FROM public.products WHERE name='사이언스다이어트 인도어 어덜트' AND brand_name='Hills'; END IF;
FOR ing_id IN SELECT id FROM public.ingredients WHERE name_ko IN ('닭고기','현미','닭간','타우린','비타민E','비타민C') LOOP
  INSERT INTO public.product_ingredients (product_id, ingredient_id) VALUES (pid, ing_id) ON CONFLICT DO NOTHING;
END LOOP;

-- 27. 아카나 와일드 프레이리 캣
INSERT INTO public.products (name, brand_name, product_type, target_pet_type, target_life_stage, formulation, product_health_concerns, min_price, avg_rating, review_count, barcode)
VALUES ('와일드 프레이리 캣 (Wild Prairie Cat)', '아카나', 'food', 'cat', '{"adult","all"}', '건식', '{"근육","면역","피부"}', 50000, 4.6, 1680, '0064992330017')
ON CONFLICT DO NOTHING RETURNING id INTO pid;
IF pid IS NULL THEN SELECT id INTO pid FROM public.products WHERE name='와일드 프레이리 캣 (Wild Prairie Cat)' AND brand_name='아카나'; END IF;
FOR ing_id IN SELECT id FROM public.ingredients WHERE name_ko IN ('닭고기','칠면조','닭간','달걀','타우린','연어유','혼합토코페롤') LOOP
  INSERT INTO public.product_ingredients (product_id, ingredient_id) VALUES (pid, ing_id) ON CONFLICT DO NOTHING;
END LOOP;

-- 28. 블루버팔로 와일더니스 살몬 고양이
INSERT INTO public.products (name, brand_name, product_type, target_pet_type, target_life_stage, formulation, product_health_concerns, min_price, avg_rating, review_count, barcode)
VALUES ('와일더니스 연어 레시피 고양이', '블루버팔로', 'food', 'cat', '{"adult","all"}', '건식', '{"피부","오메가3","알레르기"}', 42000, 4.5, 1450, '0859610005152')
ON CONFLICT DO NOTHING RETURNING id INTO pid;
IF pid IS NULL THEN SELECT id INTO pid FROM public.products WHERE name='와일더니스 연어 레시피 고양이' AND brand_name='블루버팔로'; END IF;
FOR ing_id IN SELECT id FROM public.ingredients WHERE name_ko IN ('연어','청어','감자','완두콩','타우린','연어유','혼합토코페롤') LOOP
  INSERT INTO public.product_ingredients (product_id, ingredient_id) VALUES (pid, ing_id) ON CONFLICT DO NOTHING;
END LOOP;

-- 29. 로얄캐닌 시니어 컨솔 12+
INSERT INTO public.products (name, brand_name, product_type, target_pet_type, target_life_stage, formulation, product_health_concerns, min_price, avg_rating, review_count, barcode)
VALUES ('인도어 시니어 12+ 고양이', '로얄캐닌', 'food', 'cat', '{"senior"}', '건식', '{"신장","관절","소화","인지"}', 38000, 4.4, 1120, '3182550708456')
ON CONFLICT DO NOTHING RETURNING id INTO pid;
IF pid IS NULL THEN SELECT id INTO pid FROM public.products WHERE name='인도어 시니어 12+ 고양이' AND brand_name='로얄캐닌'; END IF;
FOR ing_id IN SELECT id FROM public.ingredients WHERE name_ko IN ('닭고기','현미','타우린','글루코사민','오메가3','혼합토코페롤') LOOP
  INSERT INTO public.product_ingredients (product_id, ingredient_id) VALUES (pid, ing_id) ON CONFLICT DO NOTHING;
END LOOP;

-- 30. 고양이 그레인프리 오리젠 식스 피시 캣
INSERT INTO public.products (name, brand_name, product_type, target_pet_type, target_life_stage, formulation, product_health_concerns, min_price, avg_rating, review_count, barcode)
VALUES ('식스 피시 고양이 (Six Fish Cat)', '오리젠', 'food', 'cat', '{"adult","all"}', '건식', '{"피부","오메가3","알레르기"}', 52000, 4.7, 1890, '0064992100025')
ON CONFLICT DO NOTHING RETURNING id INTO pid;
IF pid IS NULL THEN SELECT id INTO pid FROM public.products WHERE name='식스 피시 고양이 (Six Fish Cat)' AND brand_name='오리젠'; END IF;
FOR ing_id IN SELECT id FROM public.ingredients WHERE name_ko IN ('연어','청어','대구','고등어','참치','타우린','연어유','혼합토코페롤') LOOP
  INSERT INTO public.product_ingredients (product_id, ingredient_id) VALUES (pid, ing_id) ON CONFLICT DO NOTHING;
END LOOP;

-- 31. 퓨리나 프로플랜 키튼
INSERT INTO public.products (name, brand_name, product_type, target_pet_type, target_life_stage, formulation, product_health_concerns, min_price, avg_rating, review_count, barcode)
VALUES ('프로플랜 키튼 닭고기', '퓨리나', 'food', 'cat', '{"puppy_kitten"}', '건식', '{"성장","면역","뼈"}', 28000, 4.2, 2340, '0038100175380')
ON CONFLICT DO NOTHING RETURNING id INTO pid;
IF pid IS NULL THEN SELECT id INTO pid FROM public.products WHERE name='프로플랜 키튼 닭고기' AND brand_name='퓨리나'; END IF;
FOR ing_id IN SELECT id FROM public.ingredients WHERE name_ko IN ('닭고기','현미','닭간','타우린','아르기닌','혼합토코페롤') LOOP
  INSERT INTO public.product_ingredients (product_id, ingredient_id) VALUES (pid, ing_id) ON CONFLICT DO NOTHING;
END LOOP;

-- 32. 내추럴발란스 그린 피 & 덕 캣
INSERT INTO public.products (name, brand_name, product_type, target_pet_type, target_life_stage, formulation, product_health_concerns, min_price, avg_rating, review_count, barcode)
VALUES ('그린피 & 오리고기 고양이', '내추럴발란스', 'food', 'cat', '{"adult","all"}', '건식', '{"알레르기","소화"}', 38000, 4.2, 780, '0023700113423')
ON CONFLICT DO NOTHING RETURNING id INTO pid;
IF pid IS NULL THEN SELECT id INTO pid FROM public.products WHERE name='그린피 & 오리고기 고양이' AND brand_name='내추럴발란스'; END IF;
FOR ing_id IN SELECT id FROM public.ingredients WHERE name_ko IN ('오리고기','완두콩','감자','타우린','혼합토코페롤') LOOP
  INSERT INTO public.product_ingredients (product_id, ingredient_id) VALUES (pid, ing_id) ON CONFLICT DO NOTHING;
END LOOP;

-- 33. 힐스 시니어 11+ 고양이
INSERT INTO public.products (name, brand_name, product_type, target_pet_type, target_life_stage, formulation, product_health_concerns, min_price, avg_rating, review_count, barcode)
VALUES ('사이언스다이어트 시니어 11+ 고양이', 'Hills', 'food', 'cat', '{"senior"}', '건식', '{"신장","관절","인지","소화"}', 40000, 4.4, 1240, '0052742028512')
ON CONFLICT DO NOTHING RETURNING id INTO pid;
IF pid IS NULL THEN SELECT id INTO pid FROM public.products WHERE name='사이언스다이어트 시니어 11+ 고양이' AND brand_name='Hills'; END IF;
FOR ing_id IN SELECT id FROM public.ingredients WHERE name_ko IN ('닭고기','현미','타우린','오메가3','비타민E','비타민C') LOOP
  INSERT INTO public.product_ingredients (product_id, ingredient_id) VALUES (pid, ing_id) ON CONFLICT DO NOTHING;
END LOOP;

-- ══════════════════════════════════════
-- 고양이 습식 사료 (5개)
-- ══════════════════════════════════════

-- 34. 시바 인스팩트 참치 파우치
INSERT INTO public.products (name, brand_name, product_type, target_pet_type, target_life_stage, formulation, product_health_concerns, min_price, avg_rating, review_count, barcode)
VALUES ('인스팩트 참치 파우치', '시바', 'food', 'cat', '{"adult"}', '습식', '{"수분","소화"}', 1500, 4.0, 8900, '0023100058691')
ON CONFLICT DO NOTHING RETURNING id INTO pid;
IF pid IS NULL THEN SELECT id INTO pid FROM public.products WHERE name='인스팩트 참치 파우치' AND brand_name='시바'; END IF;
FOR ing_id IN SELECT id FROM public.ingredients WHERE name_ko IN ('참치','타우린') LOOP
  INSERT INTO public.product_ingredients (product_id, ingredient_id) VALUES (pid, ing_id) ON CONFLICT DO NOTHING;
END LOOP;

-- 35. 웰케어 연어&닭 습식 파우치 (국내 브랜드)
INSERT INTO public.products (name, brand_name, product_type, target_pet_type, target_life_stage, formulation, product_health_concerns, min_price, avg_rating, review_count, barcode)
VALUES ('연어 & 닭고기 습식 파우치', '웰케어', 'food', 'cat', '{"adult","senior"}', '습식', '{"수분","소화","신장"}', 2200, 4.1, 3400, '8809268720001')
ON CONFLICT DO NOTHING RETURNING id INTO pid;
IF pid IS NULL THEN SELECT id INTO pid FROM public.products WHERE name='연어 & 닭고기 습식 파우치' AND brand_name='웰케어'; END IF;
FOR ing_id IN SELECT id FROM public.ingredients WHERE name_ko IN ('연어','닭고기','타우린','아르기닌') LOOP
  INSERT INTO public.product_ingredients (product_id, ingredient_id) VALUES (pid, ing_id) ON CONFLICT DO NOTHING;
END LOOP;

-- 36. 로얄캐닌 가스트로 인테스티널 고양이 습식
INSERT INTO public.products (name, brand_name, product_type, target_pet_type, target_life_stage, formulation, product_health_concerns, min_price, avg_rating, review_count, barcode)
VALUES ('가스트로 인테스티널 고양이 습식', '로얄캐닌', 'food', 'cat', '{"adult","senior"}', '습식', '{"소화","장건강"}', 7500, 4.6, 920, '3182550900140')
ON CONFLICT DO NOTHING RETURNING id INTO pid;
IF pid IS NULL THEN SELECT id INTO pid FROM public.products WHERE name='가스트로 인테스티널 고양이 습식' AND brand_name='로얄캐닌'; END IF;
FOR ing_id IN SELECT id FROM public.ingredients WHERE name_ko IN ('닭고기','현미','타우린','프로바이오틱스') LOOP
  INSERT INTO public.product_ingredients (product_id, ingredient_id) VALUES (pid, ing_id) ON CONFLICT DO NOTHING;
END LOOP;

-- 37. 메릭 클래식 연어 파테 고양이 캔
INSERT INTO public.products (name, brand_name, product_type, target_pet_type, target_life_stage, formulation, product_health_concerns, min_price, avg_rating, review_count, barcode)
VALUES ('클래식 연어 파테 고양이 캔', '메릭', 'food', 'cat', '{"adult","all"}', '습식', '{"오메가3","피부","알레르기"}', 4200, 4.4, 720, '0022808420215')
ON CONFLICT DO NOTHING RETURNING id INTO pid;
IF pid IS NULL THEN SELECT id INTO pid FROM public.products WHERE name='클래식 연어 파테 고양이 캔' AND brand_name='메릭'; END IF;
FOR ing_id IN SELECT id FROM public.ingredients WHERE name_ko IN ('연어','연어유','타우린','혼합토코페롤') LOOP
  INSERT INTO public.product_ingredients (product_id, ingredient_id) VALUES (pid, ing_id) ON CONFLICT DO NOTHING;
END LOOP;

-- 38. 퓨리나 팬시피스트 연어 & 닭고기 습식 캔
INSERT INTO public.products (name, brand_name, product_type, target_pet_type, target_life_stage, formulation, product_health_concerns, min_price, avg_rating, review_count, barcode)
VALUES ('팬시피스트 연어 & 닭고기 습식', '퓨리나', 'food', 'cat', '{"adult"}', '습식', '{"수분","소화"}', 1800, 4.0, 6700, '0050000024706')
ON CONFLICT DO NOTHING RETURNING id INTO pid;
IF pid IS NULL THEN SELECT id INTO pid FROM public.products WHERE name='팬시피스트 연어 & 닭고기 습식' AND brand_name='퓨리나'; END IF;
FOR ing_id IN SELECT id FROM public.ingredients WHERE name_ko IN ('연어','닭고기','타우린','카라기난') LOOP
  INSERT INTO public.product_ingredients (product_id, ingredient_id) VALUES (pid, ing_id) ON CONFLICT DO NOTHING;
END LOOP;

-- ══════════════════════════════════════
-- 강아지 간식 (5개)
-- ══════════════════════════════════════

-- 39. 마리스 져키 닭가슴살 스틱
INSERT INTO public.products (name, brand_name, product_type, target_pet_type, target_life_stage, formulation, product_health_concerns, min_price, avg_rating, review_count, barcode)
VALUES ('닭가슴살 스틱 져키', '마리스', 'snack', 'dog', '{"adult","senior"}', '건조', '{"구강","훈련"}', 8000, 4.4, 5600, '8809268730001')
ON CONFLICT DO NOTHING RETURNING id INTO pid;
IF pid IS NULL THEN SELECT id INTO pid FROM public.products WHERE name='닭가슴살 스틱 져키' AND brand_name='마리스'; END IF;
FOR ing_id IN SELECT id FROM public.ingredients WHERE name_ko IN ('닭가슴살') LOOP
  INSERT INTO public.product_ingredients (product_id, ingredient_id) VALUES (pid, ing_id) ON CONFLICT DO NOTHING;
END LOOP;

-- 40. 퍼피러브 고구마 트릿
INSERT INTO public.products (name, brand_name, product_type, target_pet_type, target_life_stage, formulation, product_health_concerns, min_price, avg_rating, review_count, barcode)
VALUES ('고구마 자연식 트릿', '퍼피러브', 'snack', 'dog', '{"adult","senior","puppy_kitten"}', '건조', '{"소화","글루텐프리"}', 6500, 4.2, 3400, '8809268730002')
ON CONFLICT DO NOTHING RETURNING id INTO pid;
IF pid IS NULL THEN SELECT id INTO pid FROM public.products WHERE name='고구마 자연식 트릿' AND brand_name='퍼피러브'; END IF;
FOR ing_id IN SELECT id FROM public.ingredients WHERE name_ko IN ('고구마') LOOP
  INSERT INTO public.product_ingredients (product_id, ingredient_id) VALUES (pid, ing_id) ON CONFLICT DO NOTHING;
END LOOP;

-- 41. 그린피스 덴탈 껌 스틱
INSERT INTO public.products (name, brand_name, product_type, target_pet_type, target_life_stage, formulation, product_health_concerns, min_price, avg_rating, review_count, barcode)
VALUES ('덴탈 껌 스틱 (민트)', '그린피스', 'snack', 'dog', '{"adult"}', '건조', '{"구강","치석","입냄새"}', 12000, 4.3, 2800, '8809268730003')
ON CONFLICT DO NOTHING RETURNING id INTO pid;
IF pid IS NULL THEN SELECT id INTO pid FROM public.products WHERE name='덴탈 껌 스틱 (민트)' AND brand_name='그린피스'; END IF;
FOR ing_id IN SELECT id FROM public.ingredients WHERE name_ko IN ('닭가슴살','글루코사민') LOOP
  INSERT INTO public.product_ingredients (product_id, ingredient_id) VALUES (pid, ing_id) ON CONFLICT DO NOTHING;
END LOOP;

-- 42. 오리젠 트릿 오리지널 독 비스킷
INSERT INTO public.products (name, brand_name, product_type, target_pet_type, target_life_stage, formulation, product_health_concerns, min_price, avg_rating, review_count, barcode)
VALUES ('오리지널 독 트릿 비스킷', '오리젠', 'snack', 'dog', '{"adult","all"}', '건조', '{"훈련","알레르기"}', 18000, 4.6, 1890, '0064992500031')
ON CONFLICT DO NOTHING RETURNING id INTO pid;
IF pid IS NULL THEN SELECT id INTO pid FROM public.products WHERE name='오리지널 독 트릿 비스킷' AND brand_name='오리젠'; END IF;
FOR ing_id IN SELECT id FROM public.ingredients WHERE name_ko IN ('닭고기','칠면조','연어','혼합토코페롤') LOOP
  INSERT INTO public.product_ingredients (product_id, ingredient_id) VALUES (pid, ing_id) ON CONFLICT DO NOTHING;
END LOOP;

-- 43. 아카나 닭고기 에어드라이 독 트릿
INSERT INTO public.products (name, brand_name, product_type, target_pet_type, target_life_stage, formulation, product_health_concerns, min_price, avg_rating, review_count, barcode)
VALUES ('닭고기 에어드라이 트릿', '아카나', 'snack', 'dog', '{"adult","all"}', '건조', '{"훈련","알레르기"}', 16000, 4.5, 1540, '0064992500048')
ON CONFLICT DO NOTHING RETURNING id INTO pid;
IF pid IS NULL THEN SELECT id INTO pid FROM public.products WHERE name='닭고기 에어드라이 트릿' AND brand_name='아카나'; END IF;
FOR ing_id IN SELECT id FROM public.ingredients WHERE name_ko IN ('닭고기','닭간','혼합토코페롤') LOOP
  INSERT INTO public.product_ingredients (product_id, ingredient_id) VALUES (pid, ing_id) ON CONFLICT DO NOTHING;
END LOOP;

-- ══════════════════════════════════════
-- 고양이 간식 (4개)
-- ══════════════════════════════════════

-- 44. 치즈고양이 고메 퓌레 참치
INSERT INTO public.products (name, brand_name, product_type, target_pet_type, target_life_stage, formulation, product_health_concerns, min_price, avg_rating, review_count, barcode)
VALUES ('고메 퓌레 참치 & 타우린', '치즈고양이', 'snack', 'cat', '{"adult","senior"}', '습식', '{"수분","훈련","심장"}', 1200, 4.3, 9800, '8809268740001')
ON CONFLICT DO NOTHING RETURNING id INTO pid;
IF pid IS NULL THEN SELECT id INTO pid FROM public.products WHERE name='고메 퓌레 참치 & 타우린' AND brand_name='치즈고양이'; END IF;
FOR ing_id IN SELECT id FROM public.ingredients WHERE name_ko IN ('참치','타우린') LOOP
  INSERT INTO public.product_ingredients (product_id, ingredient_id) VALUES (pid, ing_id) ON CONFLICT DO NOTHING;
END LOOP;

-- 45. 이나바 치루 챠우 연어 파우치
INSERT INTO public.products (name, brand_name, product_type, target_pet_type, target_life_stage, formulation, product_health_concerns, min_price, avg_rating, review_count, barcode)
VALUES ('치루 챠우 연어 파우치', '이나바', 'snack', 'cat', '{"adult"}', '습식', '{"수분","훈련"}', 1500, 4.5, 12400, '4901133893452')
ON CONFLICT DO NOTHING RETURNING id INTO pid;
IF pid IS NULL THEN SELECT id INTO pid FROM public.products WHERE name='치루 챠우 연어 파우치' AND brand_name='이나바'; END IF;
FOR ing_id IN SELECT id FROM public.ingredients WHERE name_ko IN ('연어','타우린') LOOP
  INSERT INTO public.product_ingredients (product_id, ingredient_id) VALUES (pid, ing_id) ON CONFLICT DO NOTHING;
END LOOP;

-- 46. 오리젠 고양이 트릿 6피시
INSERT INTO public.products (name, brand_name, product_type, target_pet_type, target_life_stage, formulation, product_health_concerns, min_price, avg_rating, review_count, barcode)
VALUES ('식스 피시 고양이 트릿', '오리젠', 'snack', 'cat', '{"adult","all"}', '건조', '{"피부","오메가3"}', 15000, 4.7, 1320, '0064992500062')
ON CONFLICT DO NOTHING RETURNING id INTO pid;
IF pid IS NULL THEN SELECT id INTO pid FROM public.products WHERE name='식스 피시 고양이 트릿' AND brand_name='오리젠'; END IF;
FOR ing_id IN SELECT id FROM public.ingredients WHERE name_ko IN ('연어','청어','대구','타우린','혼합토코페롤') LOOP
  INSERT INTO public.product_ingredients (product_id, ingredient_id) VALUES (pid, ing_id) ON CONFLICT DO NOTHING;
END LOOP;

-- 47. 마리스 동결건조 연어 고양이 간식
INSERT INTO public.products (name, brand_name, product_type, target_pet_type, target_life_stage, formulation, product_health_concerns, min_price, avg_rating, review_count, barcode)
VALUES ('동결건조 연어 간식 고양이', '마리스', 'snack', 'cat', '{"adult","senior"}', '동결건조', '{"오메가3","피부","단백질"}', 9500, 4.4, 2100, '8809268740002')
ON CONFLICT DO NOTHING RETURNING id INTO pid;
IF pid IS NULL THEN SELECT id INTO pid FROM public.products WHERE name='동결건조 연어 간식 고양이' AND brand_name='마리스'; END IF;
FOR ing_id IN SELECT id FROM public.ingredients WHERE name_ko IN ('연어','타우린') LOOP
  INSERT INTO public.product_ingredients (product_id, ingredient_id) VALUES (pid, ing_id) ON CONFLICT DO NOTHING;
END LOOP;

-- ══════════════════════════════════════
-- 영양제 (3개)
-- ══════════════════════════════════════

-- 48. 관절 영양제 (강아지)
INSERT INTO public.products (name, brand_name, product_type, target_pet_type, target_life_stage, formulation, product_health_concerns, min_price, avg_rating, review_count, barcode)
VALUES ('관절 케어 영양제 글루코사민', '웰케어', 'supplement', 'dog', '{"senior","adult"}', '영양제', '{"관절","노화"}', 22000, 4.3, 1560, '8809268750001')
ON CONFLICT DO NOTHING RETURNING id INTO pid;
IF pid IS NULL THEN SELECT id INTO pid FROM public.products WHERE name='관절 케어 영양제 글루코사민' AND brand_name='웰케어'; END IF;
FOR ing_id IN SELECT id FROM public.ingredients WHERE name_ko IN ('글루코사민','콘드로이틴','오메가3') LOOP
  INSERT INTO public.product_ingredients (product_id, ingredient_id) VALUES (pid, ing_id) ON CONFLICT DO NOTHING;
END LOOP;

-- 49. 피부·피모 오메가3 (강아지+고양이)
INSERT INTO public.products (name, brand_name, product_type, target_pet_type, target_life_stage, formulation, product_health_concerns, min_price, avg_rating, review_count, barcode)
VALUES ('피부·피모 오메가3 연어유 영양제', '웰케어', 'supplement', 'all', '{"adult","senior","puppy_kitten"}', '영양제', '{"피부","피모","알레르기","오메가3"}', 18000, 4.5, 2890, '8809268750002')
ON CONFLICT DO NOTHING RETURNING id INTO pid;
IF pid IS NULL THEN SELECT id INTO pid FROM public.products WHERE name='피부·피모 오메가3 연어유 영양제' AND brand_name='웰케어'; END IF;
FOR ing_id IN SELECT id FROM public.ingredients WHERE name_ko IN ('연어유','오메가3','비타민E') LOOP
  INSERT INTO public.product_ingredients (product_id, ingredient_id) VALUES (pid, ing_id) ON CONFLICT DO NOTHING;
END LOOP;

-- 50. 장 유산균 프로바이오틱스 (강아지+고양이)
INSERT INTO public.products (name, brand_name, product_type, target_pet_type, target_life_stage, formulation, product_health_concerns, min_price, avg_rating, review_count, barcode)
VALUES ('장 건강 유산균 프로바이오틱스', '마리스', 'supplement', 'all', '{"adult","senior","puppy_kitten"}', '영양제', '{"소화","장건강","면역"}', 24000, 4.4, 1780, '8809268750003')
ON CONFLICT DO NOTHING RETURNING id INTO pid;
IF pid IS NULL THEN SELECT id INTO pid FROM public.products WHERE name='장 건강 유산균 프로바이오틱스' AND brand_name='마리스'; END IF;
FOR ing_id IN SELECT id FROM public.ingredients WHERE name_ko IN ('프로바이오틱스','프리바이오틱스','소화효소') LOOP
  INSERT INTO public.product_ingredients (product_id, ingredient_id) VALUES (pid, ing_id) ON CONFLICT DO NOTHING;
END LOOP;

END $$;

COMMIT;
