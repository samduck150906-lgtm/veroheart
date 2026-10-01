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

ALTER TABLE public.nutritional_profiles
  VALIDATE CONSTRAINT nutritional_profiles_percent_range;

COMMENT ON TABLE public.nutritional_profiles IS
  '제품별 등록성분(보장성분). 값이 NULL 이면 미확인이며 0 과 구분된다. 열량(kcal)은 products.kcal_per_100g 에 있고 등록성분에서 계산한 값이다.';;
