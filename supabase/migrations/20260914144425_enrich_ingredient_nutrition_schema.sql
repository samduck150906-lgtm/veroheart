ALTER TABLE public.ingredients
  ADD COLUMN IF NOT EXISTS aliases TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS nutrition_tags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS moisture_pct NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS crude_protein_pct NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS crude_fat_pct NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS crude_ash_pct NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS crude_fiber_pct NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS nutrition_source TEXT;

DO $$
DECLARE
  target_column TEXT;
BEGIN
  FOREACH target_column IN ARRAY ARRAY[
    'moisture_pct',
    'crude_protein_pct',
    'crude_fat_pct',
    'crude_ash_pct',
    'crude_fiber_pct'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'ingredients_' || target_column || '_range'
        AND conrelid = 'public.ingredients'::regclass
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.ingredients ADD CONSTRAINT %I CHECK (%I IS NULL OR (%I >= 0 AND %I <= 100))',
        'ingredients_' || target_column || '_range',
        target_column,
        target_column,
        target_column
      );
    END IF;
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_ingredients_category_name
  ON public.ingredients (category, name_ko);

CREATE INDEX IF NOT EXISTS idx_ingredients_aliases_gin
  ON public.ingredients USING GIN (aliases);

CREATE INDEX IF NOT EXISTS idx_ingredients_nutrition_tags_gin
  ON public.ingredients USING GIN (nutrition_tags);

COMMENT ON COLUMN public.ingredients.nutrition_source IS
  '구조화 영양값의 출처. 예: 한국표준사료성분표 2022';;
