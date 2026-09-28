BEGIN;

ALTER TABLE public.canonical_ingredients
  ADD COLUMN IF NOT EXISTS source_family TEXT,
  ADD COLUMN IF NOT EXISTS source_species TEXT,
  ADD COLUMN IF NOT EXISTS source_part TEXT,
  ADD COLUMN IF NOT EXISTS processing_form TEXT,
  ADD COLUMN IF NOT EXISTS identity_key TEXT;

ALTER TABLE public.canonical_ingredients
  DROP CONSTRAINT IF EXISTS canonical_ingredients_processing_form_check;
ALTER TABLE public.canonical_ingredients
  ADD CONSTRAINT canonical_ingredients_processing_form_check
  CHECK (processing_form IS NULL OR processing_form IN (
    'raw', 'fresh', 'dried', 'meal', 'oil', 'fat',
    'hydrolyzed', 'extract', 'fermented', 'unknown'
  ));

ALTER TABLE public.canonical_ingredients
  DROP CONSTRAINT IF EXISTS canonical_ingredients_identity_key_check;
ALTER TABLE public.canonical_ingredients
  ADD CONSTRAINT canonical_ingredients_identity_key_check
  CHECK (identity_key IS NULL OR CHAR_LENGTH(BTRIM(identity_key)) BETWEEN 3 AND 500);

CREATE INDEX IF NOT EXISTS idx_canonical_ingredients_source_family
  ON public.canonical_ingredients (source_family)
  WHERE source_family IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS canonical_ingredients_active_identity_key
  ON public.canonical_ingredients (identity_key)
  WHERE status = 'active' AND identity_key IS NOT NULL;

ALTER TABLE public.canonical_ingredients ENABLE ROW LEVEL SECURITY;

COMMIT;
