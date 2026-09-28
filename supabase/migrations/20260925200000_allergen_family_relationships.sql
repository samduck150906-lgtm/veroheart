BEGIN;

CREATE TABLE IF NOT EXISTS public.reviewed_allergen_family_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_family TEXT NOT NULL CHECK (BTRIM(source_family) <> ''),
  allergen_id UUID NOT NULL REFERENCES public.allergens(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL
    CHECK (relationship_type IN ('contains', 'derived_from', 'may_contain', 'cross_contact')),
  processing_form_condition TEXT
    CHECK (processing_form_condition IS NULL OR processing_form_condition IN (
      'raw', 'fresh', 'dried', 'meal', 'oil', 'fat', 'hydrolyzed', 'extract', 'fermented', 'unknown'
    )),
  species_scope TEXT NOT NULL DEFAULT 'both'
    CHECK (species_scope IN ('dog', 'cat', 'both')),
  evidence_source_id UUID NOT NULL
    REFERENCES public.ingredient_evidence_sources(id) ON DELETE RESTRICT,
  reviewed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  reviewed_at TIMESTAMPTZ NOT NULL,
  review_note TEXT NOT NULL CHECK (BTRIM(review_note) <> ''),
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_reviewed_allergen_family_unique
  ON public.reviewed_allergen_family_relationships (
    source_family, allergen_id, relationship_type,
    COALESCE(processing_form_condition, '*'), species_scope, evidence_source_id
  );

CREATE INDEX IF NOT EXISTS idx_reviewed_allergen_family_lookup
  ON public.reviewed_allergen_family_relationships (
    source_family, allergen_id, species_scope, processing_form_condition
  ) WHERE is_active = TRUE;

ALTER TABLE public.reviewed_allergen_family_relationships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reviewed_allergen_family_relationships_public_read
  ON public.reviewed_allergen_family_relationships;
CREATE POLICY reviewed_allergen_family_relationships_public_read
  ON public.reviewed_allergen_family_relationships
  FOR SELECT
  USING (is_active = TRUE AND reviewed_at IS NOT NULL);

REVOKE INSERT, UPDATE, DELETE ON public.reviewed_allergen_family_relationships
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.reviewed_allergen_family_relationships
  TO anon, authenticated;

COMMIT;
