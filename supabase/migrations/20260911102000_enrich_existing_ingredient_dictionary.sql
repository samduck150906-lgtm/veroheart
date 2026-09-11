-- 기존 성분은 덮어쓰지 않고 비어 있는 운영 메타데이터만 보강한다.
-- 분류는 제품 라벨에 쓰이는 한글/영문 표기 패턴을 넓게 잡고, 불명확한 항목은
-- 임의의 영양 효능을 부여하지 않고 '기타'로 남긴다.
UPDATE public.ingredients
SET category = CASE
  WHEN lower(name_ko || ' ' || COALESCE(name_en, '')) ~
    '(유산균|프로바이오틱|프리바이오틱|락토바실|비피도박|엔테로코커|bacillus|probiotic|prebiotic|lactobac|bifido)' THEN '유산균·프리바이오틱스'
  WHEN lower(name_ko || ' ' || COALESCE(name_en, '')) ~
    '(비타민|미네랄|칼슘|인산|아연|철분|철 |구리|망간|셀레늄|요오드|코발트|소금|염화|탄산칼슘|vitamin|mineral|calcium|phosph|zinc|ferrous|iron|copper|manganese|selenium|iod)' THEN '비타민·미네랄'
  WHEN lower(name_ko || ' ' || COALESCE(name_en, '')) ~
    '(오일|기름|지방|유지|우지|돈지|계유|어유|팜유|대두유|카놀라|oil| fat|tallow)' THEN '지방·오일'
  WHEN lower(name_ko || ' ' || COALESCE(name_en, '')) ~
    '(닭|계육|오리|칠면조|가금|소고기|쇠고기|우육|돼지|돈육|양고기|양육|사슴|토끼|메추리|연어|참치|대구|명태|황태|청어|고등어|정어리|어류|생선|새우|게|가리비|크릴|계란|달걀|난백|난황|유청|유장|분유|카제인|육분|어분|골분|내장|간 |간$|meat|chicken|poultry|duck|turkey|beef|pork|lamb|venison|rabbit|quail|salmon|tuna|cod|pollock|herring|mackerel|sardine|fish|shrimp|crab|egg|whey|casein)' THEN '동물성 단백질'
  WHEN lower(name_ko || ' ' || COALESCE(name_en, '')) ~
    '(대두|콩|완두|렌틸|병아리콩|루핀|글루텐|식물성 단백|soy|pea|lentil|chickpea|lupin|gluten|vegetable protein)' THEN '식물성 단백질'
  WHEN lower(name_ko || ' ' || COALESCE(name_en, '')) ~
    '(쌀|현미|귀리|보리|밀|옥수수|수수|감자|고구마|타피오카|카사바|전분|곡물|곡류|퀴노아|메밀|기장|쌀겨|밀기울|rice|oat|barley|wheat|corn|sorghum|potato|tapioca|cassava|starch|grain|quinoa|buckwheat|millet)' THEN '탄수화물·곡물'
  WHEN lower(name_ko || ' ' || COALESCE(name_en, '')) ~
    '(사과|블루베리|크랜베리|호박|당근|시금치|브로콜리|토마토|비트|사탕무|치커리|해조|다시마|미역|파래|셀룰로오스|식이섬유|apple|blueberry|cranberry|pumpkin|carrot|spinach|broccoli|tomato|beet|chicory|seaweed|cellulose|fiber)' THEN '과일·채소·식이섬유'
  WHEN lower(name_ko || ' ' || COALESCE(name_en, '')) ~
    '(토코페롤|로즈마리|구연산|bha|bht|에톡시퀸|보존|산화방지|tocopherol|rosemary|citric|preservative|antioxidant|ethoxyquin)' THEN '보존료·산화방지제'
  WHEN lower(name_ko || ' ' || COALESCE(name_en, '')) ~
    '(타우린|카르니틴|글루코사민|콘드로이틴|메티오닌|아르기닌|효소|오메가|콜라겐|msm|taurine|carnitine|glucosamine|chondroitin|methionine|arginine|enzyme|omega|collagen)' THEN '기능성 성분'
  WHEN lower(name_ko || ' ' || COALESCE(name_en, '')) ~
    '(향미|향료|색소|감미|글리세린|프로필렌글리콜|카라기난|검 |gum|flavor|colour|color|sweetener|glycer|propylene glycol|carrageenan)' THEN '첨가물·기호성'
  ELSE '기타'
END
WHERE category IS NULL OR btrim(category) = '';

-- 명확한 원료군만 알레르기 태그를 채운다. 기존 운영자 입력은 보존한다.
UPDATE public.ingredients
SET allergy_triggers = CASE
  WHEN lower(name_ko || ' ' || COALESCE(name_en, '')) ~ '(닭|계육|치킨|chicken)' THEN ARRAY['chicken','poultry']
  WHEN lower(name_ko || ' ' || COALESCE(name_en, '')) ~ '(오리|duck)' THEN ARRAY['duck','poultry']
  WHEN lower(name_ko || ' ' || COALESCE(name_en, '')) ~ '(칠면조|turkey)' THEN ARRAY['turkey','poultry']
  WHEN lower(name_ko || ' ' || COALESCE(name_en, '')) ~ '(소고기|쇠고기|우육|beef)' THEN ARRAY['beef']
  WHEN lower(name_ko || ' ' || COALESCE(name_en, '')) ~ '(돼지|돈육|pork)' THEN ARRAY['pork']
  WHEN lower(name_ko || ' ' || COALESCE(name_en, '')) ~ '(양고기|양육|lamb)' THEN ARRAY['lamb']
  WHEN lower(name_ko || ' ' || COALESCE(name_en, '')) ~ '(계란|달걀|난백|난황|egg)' THEN ARRAY['egg']
  WHEN lower(name_ko || ' ' || COALESCE(name_en, '')) ~ '(연어|참치|대구|명태|황태|청어|고등어|정어리|어류|생선|어분|어유|salmon|tuna|cod|pollock|herring|mackerel|sardine|fish)' THEN ARRAY['fish']
  WHEN lower(name_ko || ' ' || COALESCE(name_en, '')) ~ '(밀|소맥|wheat|gluten)' THEN ARRAY['wheat','grain','gluten']
  WHEN lower(name_ko || ' ' || COALESCE(name_en, '')) ~ '(옥수수|corn)' THEN ARRAY['corn','grain']
  WHEN lower(name_ko || ' ' || COALESCE(name_en, '')) ~ '(대두|콩|soy)' THEN ARRAY['soy','legume']
  WHEN lower(name_ko || ' ' || COALESCE(name_en, '')) ~ '(완두|렌틸|병아리콩|pea|lentil|chickpea)' THEN ARRAY['legume']
  ELSE allergy_triggers
END
WHERE COALESCE(cardinality(allergy_triggers), 0) = 0;

-- 위해성이 명확하게 관리되는 핵심 항목만 구체적인 주의조건을 보강한다.
UPDATE public.ingredients
SET caution_conditions = CASE
  WHEN lower(name_ko || ' ' || COALESCE(name_en, '')) ~ '(자일리톨|자이리톨|xylitol)' THEN ARRAY['개에게 급여 금지']
  WHEN lower(name_ko || ' ' || COALESCE(name_en, '')) ~ '(양파|파속|onion|chive|leek|scallion)' THEN ARRAY['개·고양이에게 급여 금지']
  WHEN lower(name_ko || ' ' || COALESCE(name_en, '')) ~ '(포도|건포도|grape|raisin)' THEN ARRAY['개에게 급여 금지']
  WHEN lower(name_ko || ' ' || COALESCE(name_en, '')) ~ '(초콜릿|코코아|카카오|chocolate|cocoa|cacao)' THEN ARRAY['개·고양이에게 급여 금지']
  WHEN lower(name_ko || ' ' || COALESCE(name_en, '')) ~ '(카페인|커피|caffeine|coffee)' THEN ARRAY['개·고양이에게 급여 금지']
  WHEN lower(name_ko || ' ' || COALESCE(name_en, '')) ~ '(마카다미아|macadamia)' THEN ARRAY['개에게 급여 금지']
  WHEN lower(name_ko || ' ' || COALESCE(name_en, '')) ~ '(마늘|garlic)' THEN ARRAY['종과 섭취량에 따라 독성 위험이 있어 급여 전 확인 필요']
  ELSE caution_conditions
END
WHERE COALESCE(cardinality(caution_conditions), 0) = 0;

-- 구조화 영양 태그는 성분의 분류에만 근거해 보수적으로 채운다.
UPDATE public.ingredients
SET nutrition_tags = CASE category
  WHEN '동물성 단백질' THEN ARRAY['protein']
  WHEN '식물성 단백질' THEN ARRAY['protein']
  WHEN '탄수화물·곡물' THEN ARRAY['carbohydrate']
  WHEN '지방·오일' THEN ARRAY['fat']
  WHEN '과일·채소·식이섬유' THEN ARRAY['fiber']
  WHEN '비타민·미네랄' THEN ARRAY['vitamin_mineral']
  WHEN '유산균·프리바이오틱스' THEN ARRAY['gut_health']
  WHEN '기능성 성분' THEN ARRAY['functional']
  ELSE nutrition_tags
END
WHERE COALESCE(cardinality(nutrition_tags), 0) = 0;
