-- Synthetic, isolated contract-test database only. Not a migration or seed.
CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE ROLE service_role BYPASSRLS;
CREATE SCHEMA private;
CREATE FUNCTION private.hide_unverified_products_enabled() RETURNS boolean
  LANGUAGE sql AS 'SELECT false';
CREATE TABLE public.products (
  id uuid PRIMARY KEY, name text, brand_name text, variant_name text,
  net_weight_text text, barcode text, is_visible boolean, verification_status text,
  coupang_link text, unrelated jsonb,
  display_name text, canonical_product_key text, target_pet_type text,
  target_life_stage text[], formulation text
);
CREATE TABLE public.product_observations (
  id uuid PRIMARY KEY, product_id uuid REFERENCES public.products(id),
  source_url text, retrieved_at timestamptz NOT NULL DEFAULT now(), raw_name text, raw_brand text,
  extracted_data jsonb NOT NULL DEFAULT '{}', is_current boolean NOT NULL DEFAULT true
);
CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor text NOT NULL DEFAULT 'unknown',
  action text NOT NULL, target_table text, target_id text,
  detail jsonb, created_at timestamptz DEFAULT now()
);
