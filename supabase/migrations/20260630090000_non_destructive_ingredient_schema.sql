-- Phase 1: non-destructive canonical ingredient foundation
--
-- This migration intentionally:
--   * creates new, empty tables only;
--   * does not alter, merge, update, or delete existing ingredient data;
--   * does not change public.product_ingredients or any of its foreign keys;
--   * does not seed rules or change scoring behavior.
--
-- Apply only after reviewing the target project's migration history and taking a backup.

BEGIN;

CREATE TABLE IF NOT EXISTS public.analysis_engine_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'retired')),
  description TEXT,
  ruleset_checksum TEXT,
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.canonical_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name_ko TEXT NOT NULL,
  canonical_name_en TEXT,
  normalized_key TEXT NOT NULL UNIQUE,
  category TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'retired')),
  legacy_ingredient_id UUID REFERENCES public.ingredients(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT canonical_ingredients_name_ko_key UNIQUE (canonical_name_ko)
);

CREATE TABLE IF NOT EXISTS public.canonical_ingredient_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_ingredient_id UUID NOT NULL
    REFERENCES public.canonical_ingredients(id) ON DELETE CASCADE,
  alias_text TEXT NOT NULL,
  normalized_alias TEXT NOT NULL,
  language_code TEXT NOT NULL DEFAULT 'ko',
  alias_type TEXT NOT NULL DEFAULT 'label'
    CHECK (alias_type IN ('label', 'scientific', 'english', 'abbreviation', 'ocr', 'other')),
  is_preferred BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT canonical_ingredient_aliases_normalized_key
    UNIQUE (normalized_alias, language_code)
);

CREATE TABLE IF NOT EXISTS public.ingredient_evidence_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL
    CHECK (source_type IN ('paper', 'institution', 'regulation', 'textbook', 'website', 'internal_review', 'other')),
  title TEXT NOT NULL,
  organization TEXT,
  authors TEXT[] NOT NULL DEFAULT '{}',
  publication_date DATE,
  url TEXT,
  doi TEXT,
  citation TEXT,
  accessed_at DATE,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.canonical_ingredient_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_ingredient_id UUID NOT NULL
    REFERENCES public.canonical_ingredients(id) ON DELETE CASCADE,
  source_id UUID NOT NULL
    REFERENCES public.ingredient_evidence_sources(id) ON DELETE RESTRICT,
  claim_type TEXT NOT NULL,
  species TEXT NOT NULL DEFAULT 'both'
    CHECK (species IN ('dog', 'cat', 'both', 'other')),
  evidence_level TEXT,
  claim_summary TEXT NOT NULL,
  locator TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT canonical_ingredient_evidence_unique
    UNIQUE (canonical_ingredient_id, source_id, claim_type, species)
);

CREATE TABLE IF NOT EXISTS public.canonical_analysis_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key TEXT NOT NULL,
  engine_version_id UUID NOT NULL
    REFERENCES public.analysis_engine_versions(id) ON DELETE RESTRICT,
  canonical_ingredient_id UUID
    REFERENCES public.canonical_ingredients(id) ON DELETE RESTRICT,
  target_scope TEXT NOT NULL
    CHECK (target_scope IN ('ingredient', 'product', 'profile')),
  species TEXT NOT NULL DEFAULT 'both'
    CHECK (species IN ('dog', 'cat', 'both')),
  condition JSONB NOT NULL DEFAULT '{}'::JSONB,
  severity TEXT NOT NULL,
  score_delta INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  message_template TEXT NOT NULL,
  evidence_level TEXT,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT canonical_analysis_rules_version_key UNIQUE (engine_version_id, rule_key)
);

CREATE TABLE IF NOT EXISTS public.canonical_analysis_rule_evidence (
  rule_id UUID NOT NULL
    REFERENCES public.canonical_analysis_rules(id) ON DELETE CASCADE,
  source_id UUID NOT NULL
    REFERENCES public.ingredient_evidence_sources(id) ON DELETE RESTRICT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (rule_id, source_id)
);

CREATE TABLE IF NOT EXISTS public.product_ingredient_label_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  raw_label_text TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'manual'
    CHECK (source_type IN ('manual', 'manufacturer', 'package_image', 'import', 'other')),
  source_reference TEXT,
  label_language TEXT NOT NULL DEFAULT 'ko',
  is_current BOOLEAN NOT NULL DEFAULT FALSE,
  captured_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.product_ingredient_label_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label_set_id UUID NOT NULL
    REFERENCES public.product_ingredient_label_sets(id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL CHECK (display_order >= 0),
  raw_ingredient_text TEXT NOT NULL,
  normalized_ingredient_text TEXT,
  amount_text TEXT,
  percentage NUMERIC(7,4) CHECK (percentage IS NULL OR (percentage >= 0 AND percentage <= 100)),
  legacy_ingredient_id UUID REFERENCES public.ingredients(id) ON DELETE SET NULL,
  canonical_ingredient_id UUID
    REFERENCES public.canonical_ingredients(id) ON DELETE SET NULL,
  match_status TEXT NOT NULL DEFAULT 'unreviewed'
    CHECK (match_status IN ('unreviewed', 'matched', 'ambiguous', 'unmatched', 'ignored')),
  match_confidence NUMERIC(5,4)
    CHECK (match_confidence IS NULL OR (match_confidence >= 0 AND match_confidence <= 1)),
  parser_metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT product_ingredient_label_items_order_key UNIQUE (label_set_id, display_order)
);

CREATE TABLE IF NOT EXISTS public.canonical_ingredient_allergen_map (
  canonical_ingredient_id UUID NOT NULL
    REFERENCES public.canonical_ingredients(id) ON DELETE CASCADE,
  allergen_id UUID NOT NULL REFERENCES public.allergens(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL DEFAULT 'contains'
    CHECK (relationship_type IN ('contains', 'derived_from', 'may_contain', 'cross_contact')),
  confidence TEXT NOT NULL DEFAULT 'reviewed'
    CHECK (confidence IN ('exact', 'derived', 'reviewed', 'suspected')),
  source_id UUID REFERENCES public.ingredient_evidence_sources(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (canonical_ingredient_id, allergen_id, relationship_type)
);

CREATE TABLE IF NOT EXISTS public.canonical_ingredient_review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label_item_id UUID
    REFERENCES public.product_ingredient_label_items(id) ON DELETE CASCADE,
  submitted_text TEXT NOT NULL,
  normalized_text TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_review', 'resolved', 'rejected')),
  candidate_ingredient_ids UUID[] NOT NULL DEFAULT '{}',
  resolution_ingredient_id UUID
    REFERENCES public.canonical_ingredients(id) ON DELETE SET NULL,
  resolution_note TEXT,
  occurrence_count INTEGER NOT NULL DEFAULT 1 CHECK (occurrence_count > 0),
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_canonical_ingredients_legacy_id
  ON public.canonical_ingredients(legacy_ingredient_id);
CREATE INDEX IF NOT EXISTS idx_canonical_ingredient_aliases_ingredient
  ON public.canonical_ingredient_aliases(canonical_ingredient_id);
CREATE INDEX IF NOT EXISTS idx_canonical_ingredient_aliases_normalized
  ON public.canonical_ingredient_aliases(normalized_alias);
CREATE INDEX IF NOT EXISTS idx_ingredient_evidence_sources_doi
  ON public.ingredient_evidence_sources(doi) WHERE doi IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_canonical_ingredient_evidence_source
  ON public.canonical_ingredient_evidence(source_id);
CREATE INDEX IF NOT EXISTS idx_canonical_analysis_rules_active
  ON public.canonical_analysis_rules(engine_version_id, is_active);
CREATE INDEX IF NOT EXISTS idx_product_ingredient_label_sets_product
  ON public.product_ingredient_label_sets(product_id, is_current);
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_ingredient_label_sets_one_current
  ON public.product_ingredient_label_sets(product_id) WHERE is_current;
CREATE INDEX IF NOT EXISTS idx_product_ingredient_label_items_legacy
  ON public.product_ingredient_label_items(legacy_ingredient_id);
CREATE INDEX IF NOT EXISTS idx_product_ingredient_label_items_canonical
  ON public.product_ingredient_label_items(canonical_ingredient_id);
CREATE INDEX IF NOT EXISTS idx_canonical_ingredient_allergen_allergen
  ON public.canonical_ingredient_allergen_map(allergen_id);
CREATE INDEX IF NOT EXISTS idx_canonical_ingredient_review_queue_status
  ON public.canonical_ingredient_review_queue(status, last_seen_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_canonical_ingredient_review_queue_open_text
  ON public.canonical_ingredient_review_queue(normalized_text)
  WHERE status IN ('pending', 'in_review') AND normalized_text IS NOT NULL;

ALTER TABLE public.analysis_engine_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canonical_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canonical_ingredient_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredient_evidence_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canonical_ingredient_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canonical_analysis_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canonical_analysis_rule_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_ingredient_label_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_ingredient_label_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canonical_ingredient_allergen_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canonical_ingredient_review_queue ENABLE ROW LEVEL SECURITY;

-- Reference data is readable by the app. No client write policies are granted.
CREATE POLICY analysis_engine_versions_read
  ON public.analysis_engine_versions FOR SELECT USING (TRUE);
CREATE POLICY canonical_ingredients_read
  ON public.canonical_ingredients FOR SELECT USING (TRUE);
CREATE POLICY canonical_ingredient_aliases_read
  ON public.canonical_ingredient_aliases FOR SELECT USING (TRUE);
CREATE POLICY ingredient_evidence_sources_read
  ON public.ingredient_evidence_sources FOR SELECT USING (TRUE);
CREATE POLICY canonical_ingredient_evidence_read
  ON public.canonical_ingredient_evidence FOR SELECT USING (TRUE);
CREATE POLICY canonical_analysis_rules_read
  ON public.canonical_analysis_rules FOR SELECT USING (TRUE);
CREATE POLICY canonical_analysis_rule_evidence_read
  ON public.canonical_analysis_rule_evidence FOR SELECT USING (TRUE);
CREATE POLICY product_ingredient_label_sets_read
  ON public.product_ingredient_label_sets FOR SELECT USING (TRUE);
CREATE POLICY product_ingredient_label_items_read
  ON public.product_ingredient_label_items FOR SELECT USING (TRUE);
CREATE POLICY canonical_ingredient_allergen_map_read
  ON public.canonical_ingredient_allergen_map FOR SELECT USING (TRUE);

-- canonical_ingredient_review_queue intentionally has no client policy.
-- Service-role access bypasses RLS; an explicit admin-only backend policy can be added later.

COMMIT;
