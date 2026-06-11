-- Veroro 성분 보충 — 엑셀 수집 시트의 "이미지로만 존재하던" 라벨을 전사해 적재
-- (업로드된 veroro_products_export 수집본의 담당1 시트에 텍스트 대신 사진으로 붙어
--  있던 4개 제품의 원료/등록성분량을 DB에 반영)
-- 멱등하게 작성됨.

BEGIN;

-- 1) 신규 성분 등록 (있으면 무시)
INSERT INTO public.ingredients (name_ko, name_en, risk_level, description) VALUES
 ('오리안심','Duck Breast','safe','오리 안심 부위의 고단백 동물성 단백질'),
 ('가다랑어','Bonito','safe','가다랑어(가쓰오) 생선 단백질, 고양이 기호성이 좋음'),
 ('참치','Tuna','safe','참치 생선 단백질'),
 ('가리비','Scallop','safe','가리비 관자 단백질'),
 ('게','Crab','safe','게살 단백질'),
 ('오징어','Squid','safe','오징어 단백질'),
 ('새우','Shrimp','safe','새우 단백질'),
 ('닭가슴살','Chicken Breast','safe','닭 가슴살 고단백 동물성 단백질'),
 ('녹차추출물','Green Tea Extract','safe','항산화·구강 관리 보조 천연 성분'),
 ('비타민E','Vitamin E','safe','항산화 비타민(토코페롤)'),
 ('초록입홍합','Green-lipped Mussel','safe','관절 건강에 도움을 주는 뉴질랜드산 홍합'),
 ('쌀','Rice','safe','탄수화물·에너지원'),
 ('글리세린','Glycerin','caution','식감·보습 목적으로 자주 쓰이는 첨가물'),
 ('감자전분','Potato Starch','safe','탄수화물 결착·증량원'),
 ('오리가수분해단백질','Hydrolyzed Duck Protein','safe','알레르기를 줄이기 위해 분해한 오리 단백질'),
 ('숙지황복령혼합농축액','Rehmannia & Poria Extract','safe','한방 혼합 농축액'),
 ('산양유단백질','Goat Milk Protein','safe','산양유 유래 단백질'),
 ('맥주효모','Brewer''s Yeast','safe','비타민 B군·기호성 보조'),
 ('코코넛오일','Coconut Oil','safe','중쇄지방산(MCT) 유지'),
 ('홍삼농축액','Red Ginseng Extract','safe','한방 기능성 농축액'),
 ('아카시아벌꿀','Acacia Honey','safe','기호성 첨가 천연 꿀'),
 ('마누카꿀','Manuka Honey','safe','기호성 첨가 천연 꿀'),
 ('프로폴리스','Propolis','safe','구강·면역 보조 천연 성분'),
 ('바질','Basil','safe','허브'),
 ('파슬리','Parsley','safe','구취 완화 허브'),
 ('메타인산나트륨','Sodium Metaphosphate','safe','치석 완화 목적의 덴탈 첨가물'),
 ('산도조절제','Acidity Regulator','safe','pH 조절제'),
 ('소르빈산칼륨','Potassium Sorbate','safe','보존료(소르빈산칼륨)'),
 ('생선살','Fish','safe','생선 단백질'),
 ('타피오카전분','Tapioca Starch','safe','그레인프리 탄수화물·결착원'),
 ('카놀라유','Canola Oil','safe','오메가-3 함유 식물성 유지'),
 ('프락토올리고당','Fructo-oligosaccharides','safe','장 건강 보조 프리바이오틱스'),
 ('D-솔비톨액','D-Sorbitol','safe','보습·감미 목적 당알코올'),
 ('고구마','Sweet Potato','safe','식이섬유가 있는 탄수화물원'),
 ('치커리식이섬유','Chicory Fiber','safe','이눌린 등 프리바이오틱 식이섬유'),
 ('꿀분말','Honey Powder','safe','기호성 첨가'),
 ('다이제자임','Diastase','safe','소화 효소'),
 ('덱스트라나아제','Dextranase','safe','치태 분해 효소(덴탈)'),
 ('스피루리나','Spirulina','safe','미세조류 영양 보조'),
 ('클로렐라','Chlorella','safe','미세조류 영양 보조'),
 ('19종 혼합유산균','Probiotics (19 strains)','safe','장 건강 보조 유산균'),
 ('SHMP','Sodium Hexametaphosphate','safe','치석 완화 덴탈 첨가물'),
 ('Stay-C','Stay-C (Vitamin C)','safe','안정형 비타민C'),
 ('유화제','Emulsifier','safe','유화 첨가제')
ON CONFLICT (name_ko) DO NOTHING;

-- 2) 제품-성분 연결 (NOT EXISTS 가드로 멱등)
-- 2-1) 유황 품은 오리안심육포
INSERT INTO public.product_ingredients (product_id, ingredient_id, sort_order)
SELECT 'ec8be15a-7fbd-4782-8c55-f8d8c8ace13c'::uuid, i.id, v.ord
FROM (VALUES ('오리안심',1)) AS v(nm,ord)
JOIN public.ingredients i ON i.name_ko=v.nm
WHERE NOT EXISTS (SELECT 1 FROM public.product_ingredients pi WHERE pi.product_id='ec8be15a-7fbd-4782-8c55-f8d8c8ace13c'::uuid AND pi.ingredient_id=i.id);

-- 2-2) PETLY 챠오츄르 (6종 변형 통합)
INSERT INTO public.product_ingredients (product_id, ingredient_id, sort_order)
SELECT 'e5337da4-1c3e-4eb7-b0c7-9d053c549b7e'::uuid, i.id, v.ord
FROM (VALUES ('가다랑어',1),('참치',2),('연어',3),('닭가슴살',4),('가리비',5),('게',6),('오징어',7),('새우',8),('녹차추출물',9),('비타민E',10)) AS v(nm,ord)
JOIN public.ingredients i ON i.name_ko=v.nm
WHERE NOT EXISTS (SELECT 1 FROM public.product_ingredients pi WHERE pi.product_id='e5337da4-1c3e-4eb7-b0c7-9d053c549b7e'::uuid AND pi.ingredient_id=i.id);

-- 2-3) 고메이트 초록입홍합 미니
INSERT INTO public.product_ingredients (product_id, ingredient_id, sort_order)
SELECT '55d047e0-44b1-434f-922c-86f19af0cd66'::uuid, i.id, v.ord
FROM (VALUES ('초록입홍합',1)) AS v(nm,ord)
JOIN public.ingredients i ON i.name_ko=v.nm
WHERE NOT EXISTS (SELECT 1 FROM public.product_ingredients pi WHERE pi.product_id='55d047e0-44b1-434f-922c-86f19af0cd66'::uuid AND pi.ingredient_id=i.id);

-- 2-4) 광동 견옥츄 덴탈껌 (두 라벨 통합)
INSERT INTO public.product_ingredients (product_id, ingredient_id, sort_order)
SELECT '042e1eab-736a-4b77-b1b1-3da9e16eea27'::uuid, i.id, v.ord
FROM (VALUES
 ('쌀',1),('글리세린',2),('감자전분',3),('오리가수분해단백질',4),('숙지황복령혼합농축액',5),
 ('산양유단백질',6),('맥주효모',7),('코코넛오일',8),('홍삼농축액',9),('아카시아벌꿀',10),
 ('마누카꿀',11),('프로폴리스',12),('바질',13),('파슬리',14),('메타인산나트륨',15),
 ('산도조절제',16),('소르빈산칼륨',17),('생선살',18),('타피오카전분',19),('카놀라유',20),
 ('프락토올리고당',21),('D-솔비톨액',22),('고구마',23),('치커리식이섬유',24),('꿀분말',25),
 ('다이제자임',26),('덱스트라나아제',27),('스피루리나',28),('클로렐라',29),('19종 혼합유산균',30),
 ('SHMP',31),('Stay-C',32),('유화제',33)
) AS v(nm,ord)
JOIN public.ingredients i ON i.name_ko=v.nm
WHERE NOT EXISTS (SELECT 1 FROM public.product_ingredients pi WHERE pi.product_id='042e1eab-736a-4b77-b1b1-3da9e16eea27'::uuid AND pi.ingredient_id=i.id);

-- 3) 등록성분량 -> nutritional_profiles
INSERT INTO public.nutritional_profiles (product_id, crude_protein, crude_fat, crude_ash, moisture)
SELECT 'ec8be15a-7fbd-4782-8c55-f8d8c8ace13c'::uuid, 74.0, 7.0, 5.0, 13.0
WHERE NOT EXISTS (SELECT 1 FROM public.nutritional_profiles WHERE product_id='ec8be15a-7fbd-4782-8c55-f8d8c8ace13c'::uuid);

INSERT INTO public.nutritional_profiles (product_id, crude_protein, crude_fat, crude_ash)
SELECT '55d047e0-44b1-434f-922c-86f19af0cd66'::uuid, 55.0, 15.0, 10.0
WHERE NOT EXISTS (SELECT 1 FROM public.nutritional_profiles WHERE product_id='55d047e0-44b1-434f-922c-86f19af0cd66'::uuid);

INSERT INTO public.nutritional_profiles (product_id, crude_protein, crude_fat, crude_fiber, crude_ash, moisture, calcium, phosphorus)
SELECT '042e1eab-736a-4b77-b1b1-3da9e16eea27'::uuid, 3.0, 1.0, 1.0, 5.0, 20.0, 0.1, 0.1
WHERE NOT EXISTS (SELECT 1 FROM public.nutritional_profiles WHERE product_id='042e1eab-736a-4b77-b1b1-3da9e16eea27'::uuid);

COMMIT;
