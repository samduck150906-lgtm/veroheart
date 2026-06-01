ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS manufacturer_name TEXT,
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS coupang_product_id TEXT;

UPDATE public.products
SET verification_status = COALESCE(NULLIF(verification_status, ''), 'pending')
WHERE verification_status IS NULL OR verification_status = '';

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_verification_status_check;

ALTER TABLE public.products
  ADD CONSTRAINT products_verification_status_check
  CHECK (verification_status IN ('pending', 'reviewed', 'verified'));

CREATE INDEX IF NOT EXISTS idx_products_verification_status
  ON public.products (verification_status);

CREATE INDEX IF NOT EXISTS idx_products_manufacturer_name
  ON public.products (manufacturer_name);
