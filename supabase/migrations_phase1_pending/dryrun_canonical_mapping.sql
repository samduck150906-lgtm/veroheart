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
)
SELECT
  id                         AS legacy_ingredient_id,
  name_ko                    AS legacy_name,
  source_group,
  ingredient_form,
  relation_type,
  -- 제안 canonical 명 (source_group+form). unknown 이면 자기 이름 유지(=병합 안 함)
  CASE
    WHEN source_group='unknown' THEN name_ko
    ELSE source_group || ':' || ingredient_form
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
  (source_group='unknown'
    OR ingredient_form IN ('liver','heart','gizzard','cartilage','bone','feet','broth')
    OR name_ko ~ '\(|,|등|및|기타|또는|혼합') AS needs_manual_review
FROM rel
ORDER BY source_group, ingredient_form, legacy_name;
