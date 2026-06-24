-- ============================================================================
-- Phase 1 — Canonical 병합 "드라이런" 매핑 생성 (읽기 전용 SELECT)
-- ----------------------------------------------------------------------------
-- 539개 표면형 ingredients 에 대해 source_group / ingredient_form / relation_type /
-- 제안 canonical / 알러지 신뢰도 / 연결 제품 수 / 수동검수 필요여부를 "제안"한다.
-- ⚠ 이 SELECT 는 아무것도 변경하지 않는다. 결과는 사람이 검수한 뒤에만 병합에 사용한다.
-- 모든 추론 결과의 상태는 'auto_suggested' 다(검수 전 판정 사용 금지).
--
-- 주의: 한국어는 단어 경계가 없어 부분문자열 오탐 가능(예: 소금↔소, 발효↔발).
--       따라서 모호/장기/복합 표기는 needs_manual_review=true 로 강제 플래그한다.
-- ============================================================================
WITH base AS (
  SELECT i.id, i.name_ko, i.name_en, i.risk_level::text AS legacy_risk,
         (SELECT count(*) FROM public.product_ingredients pi WHERE pi.ingredient_id = i.id) AS products_count
  FROM public.ingredients i
),
sg AS (  -- source_group 추론 (구체 동물 → 일반 생선 순서)
  SELECT b.*,
    CASE
      WHEN name_ko ~ '닭|계육|치킨'            THEN 'chicken'
      WHEN name_ko ~ '오리'                    THEN 'duck'
      WHEN name_ko ~ '칠면조|터키'             THEN 'turkey'
      WHEN name_ko ~ '소고기|쇠고기|우육'      THEN 'beef'
      WHEN name_ko ~ '돼지|돈육'               THEN 'pork'
      WHEN name_ko ~ '양고기|램'               THEN 'lamb'
      WHEN name_ko ~ '연어'                    THEN 'salmon'
      WHEN name_ko ~ '참치|가다랑어|다랑어'    THEN 'tuna'
      WHEN name_ko ~ '고등어|멸치|명태|북어|황태|대구|흰살|어분|생선|어류' THEN 'fish'
      WHEN name_ko ~ '계란|달걀|전란|난황|난백' THEN 'egg'
      WHEN name_ko ~ '우유|유청|치즈|유단백|락토' THEN 'milk'
      WHEN name_ko ~ '쌀|현미|미강|싸라기|백미' THEN 'rice'
      WHEN name_ko ~ '옥수수|콘글루텐'          THEN 'corn'
      WHEN name_ko ~ '밀가루|소맥|밀글루텐|밀 ' THEN 'wheat'
      WHEN name_ko ~ '대두|두부|콩'             THEN 'soy'
      WHEN name_ko ~ '완두|렌틸|병아리콩'        THEN 'legume'
      ELSE 'unknown'
    END AS source_group
  FROM base b
),
fm AS (  -- ingredient_form 추론 (broth/fat/oil/장기 → protein → meal → muscle)
  SELECT s.*,
    CASE
      WHEN name_ko ~ '육수'              THEN 'broth'
      WHEN name_ko ~ '지방|기름'         THEN 'fat'
      WHEN name_ko ~ '오일|유$'          THEN 'oil'
      WHEN name_ko ~ '간'                THEN 'liver'
      WHEN name_ko ~ '심장'              THEN 'heart'
      WHEN name_ko ~ '근위'              THEN 'gizzard'
      WHEN name_ko ~ '연골'              THEN 'cartilage'
      WHEN name_ko ~ '뼈'                THEN 'bone'
      WHEN name_ko ~ '닭발|발$'          THEN 'feet'
      WHEN name_ko ~ '단백'              THEN 'protein'
      WHEN name_ko ~ '분말|육분|분$|밀$|식사|meal|가루' THEN 'meal'
      ELSE 'muscle'
    END AS ingredient_form
  FROM sg s
),
rel AS (  -- relation_type + 알러지 신뢰도
  SELECT f.*,
    CASE
      WHEN source_group='unknown'                              THEN 'unknown_derivative'
      WHEN ingredient_form='muscle'                            THEN 'same_ingredient'
      WHEN ingredient_form='meal'                              THEN 'meal'
      WHEN ingredient_form='protein'                           THEN 'protein_derivative'
      WHEN ingredient_form IN ('liver','heart','gizzard','cartilage','bone','feet') THEN 'protein_derivative'
      WHEN ingredient_form='broth'                             THEN 'broth'
      WHEN ingredient_form='fat'                               THEN 'fat_derivative'
      WHEN ingredient_form='oil'                               THEN 'oil'
      ELSE 'unknown_derivative'
    END AS relation_type
  FROM fm f
),
cat AS (  -- category 축: source_group=unknown 인 비(非)동물 성분을 분류 (알러지와 무관한 정상 성분)
  SELECT r.*,
    CASE
      WHEN source_group <> 'unknown' THEN
        CASE WHEN source_group IN ('chicken','duck','turkey','beef','pork','lamb','salmon','tuna','fish','egg')
             THEN 'animal_origin' ELSE 'plant_staple' END
      WHEN name_ko ~ '비타민|미네랄|프리믹스|타우린|칼슘|아연|철분|마그네슘|엽산|판토텐|콜린|셀레늄|요오드|망간|인산|염화|황산|메티오닌|라이신|아미노산|카르니틴|글루코사민|콘드로이|MSM|루테인' THEN 'vitamin_mineral'
      WHEN name_ko ~ '토코페롤|로즈마리|구연산|소르빈산|보존|산화방지|녹차추출물|BHA|BHT|에톡시퀸|아질산' THEN 'preservative'
      WHEN name_ko ~ '향미|향료|착향|효모|유카|글리세린|레시틴|구아검|잔탄|증점|색소|착색|정제수|증진제|카라기난|조미료|젤라틴|프로필렌' THEN 'additive'
      WHEN name_ko ~ '유산균|프로바이오|프리바이오|락토|올리고당|이눌린|치커리' THEN 'probiotic'
      WHEN name_ko ~ '오일|기름|지방|아마씨|아마인|해바라기|카놀라|유채|코코넛|올리브|식물성유|식물성 유지|어유|MCT|유$' THEN 'oil_fat'
      WHEN name_ko ~ '고구마|감자|전분|타피오카|보리|귀리|곡물|글루텐|식이섬유|펄프|비트|호밀|수수|셀룰로오스|말토덱스트린|치아씨' THEN 'carbohydrate'
      WHEN name_ko ~ '당근|호박|브로콜리|시금치|토마토|셀러리|케일|파슬리|채소|야채|양배추|단호박|아스파라거스|해조류|강황' THEN 'vegetable'
      WHEN name_ko ~ '사과|블루베리|크랜베리|바나나|배|딸기|과일|구기자|아로니아|석류|망고' THEN 'fruit'
      WHEN name_ko ~ '새우|크릴|게살|조개|홍합|굴|갑각' THEN 'animal_origin'  -- 갑각류: 알러지 보유 → 검수 필요
      ELSE 'other'
    END AS category
  FROM rel r
)
SELECT
  id                         AS legacy_ingredient_id,
  name_ko                    AS legacy_name,
  source_group,
  category,
  ingredient_form,
  relation_type,
  -- 제안 canonical 명 (source_group+form). unknown 이면 자기 이름 유지(=병합 안 함)
  CASE
    WHEN source_group<>'unknown' THEN source_group || ':' || ingredient_form
    WHEN category<>'other'       THEN 'cat:' || category || ':' || lower(regexp_replace(name_ko,'[[:space:]()]','','g'))
    ELSE name_ko  -- 미해결: 병합 안 함(자기 자신 유지)
  END                        AS proposed_canonical_key,
  -- 제안 allergen group
  CASE
    WHEN source_group='unknown' THEN NULL
    WHEN source_group IN ('chicken','duck','turkey') THEN source_group || ',poultry'
    ELSE source_group
  END                        AS proposed_allergen_group,
  -- relation → allergen confidence
  CASE relation_type
    WHEN 'same_ingredient'    THEN 'exact'
    WHEN 'protein_derivative' THEN 'exact'
    WHEN 'meal'               THEN 'exact'
    WHEN 'broth'              THEN 'trace'
    WHEN 'fat_derivative'     THEN 'derived'
    WHEN 'oil'                THEN 'derived'
    ELSE NULL
  END                        AS allergen_confidence,
  'auto_suggested'           AS inference_status,
  products_count,
  -- 수동 검수 필요 플래그 (모호/복합/장기/미상)
  ((source_group='unknown' AND category='other')         -- 완전 미해결
    OR ingredient_form IN ('liver','heart','gizzard','cartilage','bone','feet','broth')  -- 장기/육수
    OR category='animal_origin' AND source_group='unknown'  -- 갑각류 등 알러지 보유 추정
    OR name_ko ~ '플레이버|향료|추출물|부산물|기술|효소|\(|,|등|및|기타|또는|혼합') AS needs_manual_review
FROM cat
ORDER BY source_group, category, ingredient_form, legacy_name;
