-- Add barcode column to products table for real-time barcode scanning
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS barcode TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode);

-- Sample barcodes for existing seeded products (for testing)
-- These EAN-13 barcodes are fictitious and for development only
UPDATE public.products SET barcode = '8809268710001' WHERE name ILIKE '%로얄캐닌%미니%인도어%' LIMIT 1;
UPDATE public.products SET barcode = '0064992100018' WHERE name ILIKE '%오리젠%캣%키튼%' LIMIT 1;
UPDATE public.products SET barcode = '0024627030247' WHERE name ILIKE '%LID%감자%오리%' LIMIT 1;
UPDATE public.products SET barcode = '0038100175397' WHERE name ILIKE '%퓨리나%프로플랜%스테릴%' LIMIT 1;
UPDATE public.products SET barcode = '0064992330017' WHERE name ILIKE '%아카나%와일드%프레이리%' LIMIT 1;
