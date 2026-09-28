BEGIN;

ALTER TABLE public.product_scan_submissions
  ADD COLUMN IF NOT EXISTS evidence_retention_at TIMESTAMPTZ;

UPDATE public.product_scan_submissions
SET evidence_retention_at = COALESCE(published_at, updated_at)
WHERE status IN ('published', 'rejected', 'cancelled')
  AND evidence_retention_at IS NULL;

CREATE OR REPLACE FUNCTION public.set_scan_evidence_retention_at()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NEW.status IN ('published', 'rejected', 'cancelled')
    AND (TG_OP = 'INSERT' OR OLD.status NOT IN ('published', 'rejected', 'cancelled'))
  THEN
    NEW.evidence_retention_at = COALESCE(NEW.published_at, NOW());
  ELSIF NEW.status NOT IN ('published', 'rejected', 'cancelled') THEN
    NEW.evidence_retention_at = NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_scan_evidence_retention_at
  ON public.product_scan_submissions;
CREATE TRIGGER trg_scan_evidence_retention_at
  BEFORE INSERT OR UPDATE OF status ON public.product_scan_submissions
  FOR EACH ROW EXECUTE FUNCTION public.set_scan_evidence_retention_at();

CREATE INDEX IF NOT EXISTS idx_product_scan_evidence_retention
  ON public.product_scan_submissions (evidence_retention_at)
  WHERE status IN ('published', 'rejected', 'cancelled')
    AND evidence_retention_at IS NOT NULL;

REVOKE ALL ON FUNCTION public.set_scan_evidence_retention_at() FROM PUBLIC;

COMMIT;
