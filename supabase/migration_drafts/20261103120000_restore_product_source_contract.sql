-- DRAFT ONLY. Do not move into migrations/apply until the hosted ledger and
-- all three column definitions have been checked. No imports/history repair.
-- Same product metadata contract as 20261026120000_official_catalog_import.sql.
-- FALSE is the legacy contract default, NOT evidence that veterinary advice
-- is unnecessary. Review known veterinary products before any publication.
-- CLI deployment form: the pinned CLI transaction includes its ledger INSERT.
-- Do not execute this file standalone in SQL Editor.
SET LOCAL lock_timeout = '5s';
-- Serialize the definition check and ADD COLUMN with other DDL. A pre-check
-- alone could race with an incompatible concurrent ADD COLUMN IF NOT EXISTS.
LOCK TABLE public.products IN ACCESS EXCLUSIVE MODE;

DO $$
DECLARE v RECORD;
BEGIN
  FOR v IN
    SELECT column_name, data_type, is_nullable, column_default, is_generated
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products'
      AND column_name IN ('catalog_source_url', 'catalog_source_note', 'requires_veterinary_guidance')
  LOOP
    IF v.is_generated <> 'NEVER' OR (v.column_name IN ('catalog_source_url', 'catalog_source_note')
        AND (v.data_type <> 'text' OR v.is_nullable <> 'YES' OR v.column_default IS NOT NULL))
      OR (v.column_name = 'requires_veterinary_guidance'
        AND (v.data_type <> 'boolean' OR v.is_nullable <> 'NO' OR v.column_default IS DISTINCT FROM 'false'))
    THEN
      RAISE EXCEPTION 'Incompatible existing products.% definition; review drift first', v.column_name;
    END IF;
  END LOOP;
END $$;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS catalog_source_url TEXT,
  ADD COLUMN IF NOT EXISTS catalog_source_note TEXT,
  ADD COLUMN IF NOT EXISTS requires_veterinary_guidance BOOLEAN NOT NULL DEFAULT FALSE;

-- Do not publish old signed/private URLs through the new public projection.
-- This does not rewrite, truncate or infer a replacement URL. Review and resolve
-- any rejection under a separate data decision before promoting this draft.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.products WHERE catalog_source_url IS NOT NULL
    AND catalog_source_url <> '' AND (catalog_source_url !~ '^https://[^/?#@[:space:]]+(/[^?#[:space:]]*)?$'
      OR catalog_source_url ~ '[?#]')) THEN
    RAISE EXCEPTION 'Potentially private/noncanonical product source URLs; review before public rollout';
  END IF;
END $$;

