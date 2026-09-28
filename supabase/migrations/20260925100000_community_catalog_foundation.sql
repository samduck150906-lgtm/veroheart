BEGIN;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS normalized_name TEXT,
  ADD COLUMN IF NOT EXISTS variant_name TEXT,
  ADD COLUMN IF NOT EXISTS net_weight_text TEXT,
  ADD COLUMN IF NOT EXISTS normalized_brand_name TEXT,
  ADD COLUMN IF NOT EXISTS canonical_product_key TEXT,
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS catalog_source TEXT NOT NULL DEFAULT 'legacy'
    CHECK (catalog_source IN ('legacy', 'community_scan', 'external', 'admin')),
  ADD COLUMN IF NOT EXISTS analysis_status TEXT NOT NULL DEFAULT 'unavailable'
    CHECK (analysis_status IN ('unavailable', 'partial', 'ready', 'blocked')),
  ADD COLUMN IF NOT EXISTS last_observed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_products_normalized_name
  ON public.products (normalized_name);

CREATE INDEX IF NOT EXISTS idx_products_normalized_brand_name
  ON public.products (normalized_brand_name);

CREATE INDEX IF NOT EXISTS idx_products_canonical_product_key
  ON public.products (canonical_product_key)
  WHERE canonical_product_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS products_slug_key
  ON public.products (slug)
  WHERE slug IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.product_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN (
    'legacy_import',
    'user_scan',
    'manufacturer',
    'brand_official',
    'official_distributor',
    'open_pet_food_facts',
    'retailer',
    'admin',
    'other'
  )),
  source_url TEXT,
  source_title TEXT,
  retrieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_name TEXT,
  raw_brand TEXT,
  raw_barcode TEXT,
  raw_label_text TEXT,
  extracted_data JSONB NOT NULL DEFAULT '{}'::JSONB,
  field_confidence JSONB NOT NULL DEFAULT '{}'::JSONB,
  package_version TEXT,
  is_current BOOLEAN NOT NULL DEFAULT TRUE,
  supersedes_observation_id UUID REFERENCES public.product_observations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_observations_product_id
  ON public.product_observations (product_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_observations_source
  ON public.product_observations (source_type, retrieved_at DESC);

CREATE TABLE IF NOT EXISTS public.product_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  alias_text TEXT NOT NULL CHECK (CHAR_LENGTH(BTRIM(alias_text)) BETWEEN 1 AND 500),
  normalized_alias TEXT NOT NULL CHECK (CHAR_LENGTH(BTRIM(normalized_alias)) BETWEEN 1 AND 500),
  language_code TEXT NOT NULL DEFAULT 'ko',
  alias_type TEXT NOT NULL CHECK (alias_type IN (
    'source_title',
    'previous_name',
    'english',
    'manufacturer',
    'ocr',
    'other'
  )),
  source_observation_id UUID REFERENCES public.product_observations(id) ON DELETE SET NULL,
  is_searchable BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, normalized_alias, language_code)
);

CREATE INDEX IF NOT EXISTS idx_product_aliases_product_id
  ON public.product_aliases (product_id);

CREATE INDEX IF NOT EXISTS idx_product_aliases_normalized_alias
  ON public.product_aliases (normalized_alias)
  WHERE is_searchable = TRUE;

ALTER TABLE public.product_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_aliases ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.product_observations FROM anon, authenticated;

GRANT SELECT ON TABLE public.product_aliases TO anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.product_aliases FROM anon, authenticated;

DROP POLICY IF EXISTS product_aliases_public_read ON public.product_aliases;
CREATE POLICY product_aliases_public_read
  ON public.product_aliases
  FOR SELECT
  TO anon, authenticated
  USING (
    is_searchable = TRUE
    AND EXISTS (
      SELECT 1
      FROM public.products AS p
      WHERE p.id = product_aliases.product_id
        AND p.is_visible = TRUE
    )
  );

COMMIT;
