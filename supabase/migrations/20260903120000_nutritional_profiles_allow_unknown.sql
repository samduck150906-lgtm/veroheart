-- nutritional_profiles: '모름'과 '0%'를 구분할 수 있게 한다.
--
-- 문제
-- ----
-- 7개 등록성분 컬럼이 모두 `NOT NULL DEFAULT 0.0` 이었다. 그래서 값을 모르는 성분이
-- 0 으로 저장되고, 앱은 그 0 을 실제 신고값으로 읽는다. 결과적으로
--   * 조단백을 모르는 제품이 "단백질 0%" 로 보이고,
--   * 칼슘·인을 모르면 Ca:P 비율이 0 기준으로 계산되며,
--   * 정보가 없는 제품이 "영양정보 있음" 으로 분류된다.
-- 값이 없는 것보다 나쁜 상태다. 급여량·AAFCO 판정이 이 값을 그대로 쓰기 때문이다.
--
-- 국내 유통 사료는 등록성분 7가지(조단백질·조지방·조섬유·조회분·수분·칼슘·인)를
-- 신고하지만, 공개 데이터에서 일부만 얻어지는 경우가 흔하다. 부분값을 그대로 담되
-- 모르는 칸은 NULL 로 남겨야 화면에서 "확인되지 않음" 으로 정직하게 표시할 수 있다.
--
-- 이 마이그레이션은 컬럼을 NULL 허용으로 바꾸고 기본값을 없앤다. 기존 행의 값은
-- 건드리지 않는다 — 이미 들어 있는 0 이 진짜 0 인지 '모름' 인지 여기서는 알 수 없다.
-- (기존 행은 3건뿐이라 운영에서 눈으로 확인하는 편이 안전하다.)

ALTER TABLE public.nutritional_profiles
  ALTER COLUMN crude_protein DROP NOT NULL,
  ALTER COLUMN crude_protein DROP DEFAULT,
  ALTER COLUMN crude_fat     DROP NOT NULL,
  ALTER COLUMN crude_fat     DROP DEFAULT,
  ALTER COLUMN crude_fiber   DROP NOT NULL,
  ALTER COLUMN crude_fiber   DROP DEFAULT,
  ALTER COLUMN crude_ash     DROP NOT NULL,
  ALTER COLUMN crude_ash     DROP DEFAULT,
  ALTER COLUMN moisture      DROP NOT NULL,
  ALTER COLUMN moisture      DROP DEFAULT,
  ALTER COLUMN calcium       DROP NOT NULL,
  ALTER COLUMN calcium       DROP DEFAULT,
  ALTER COLUMN phosphorus    DROP NOT NULL,
  ALTER COLUMN phosphorus    DROP DEFAULT;

-- 신고값은 백분율이다. 범위를 벗어난 값이 들어오면 분석이 조용히 틀리므로 막는다.
ALTER TABLE public.nutritional_profiles
  ADD CONSTRAINT nutritional_profiles_percent_range CHECK (
    (crude_protein IS NULL OR crude_protein BETWEEN 0 AND 100) AND
    (crude_fat     IS NULL OR crude_fat     BETWEEN 0 AND 100) AND
    (crude_fiber   IS NULL OR crude_fiber   BETWEEN 0 AND 100) AND
    (crude_ash     IS NULL OR crude_ash     BETWEEN 0 AND 100) AND
    (moisture      IS NULL OR moisture      BETWEEN 0 AND 100) AND
    (calcium       IS NULL OR calcium       BETWEEN 0 AND 100) AND
    (phosphorus    IS NULL OR phosphorus    BETWEEN 0 AND 100)
  ) NOT VALID;

-- NOT VALID 로 추가한 뒤 검증한다. 기존 행에 범위를 벗어난 값이 있으면 여기서 실패하며,
-- 그때는 해당 행을 먼저 정리해야 한다는 뜻이다.
ALTER TABLE public.nutritional_profiles
  VALIDATE CONSTRAINT nutritional_profiles_percent_range;

COMMENT ON TABLE public.nutritional_profiles IS
  '제품별 등록성분(보장성분). 값이 NULL 이면 미확인이며 0 과 구분된다. 열량(kcal)은 products.kcal_per_100g 에 있고 등록성분에서 계산한 값이다.';
