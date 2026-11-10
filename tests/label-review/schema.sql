-- Synthetic minimal schema shared by WASM and actual PostgreSQL tests.
DO $roles$ BEGIN IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF; IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF; IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role BYPASSRLS; END IF; END $roles$;
    CREATE SCHEMA private; REVOKE ALL ON SCHEMA private FROM PUBLIC;
    CREATE FUNCTION private.hide_unverified_products_enabled() RETURNS boolean LANGUAGE sql AS 'SELECT FALSE';
    CREATE TABLE products(id uuid PRIMARY KEY,name text,brand_name text,variant_name text,net_weight_text text,barcode text,target_pet_type text DEFAULT 'dog',target_life_stage text[],product_type text DEFAULT 'food',formulation text,is_visible boolean DEFAULT true,verification_status text DEFAULT 'reviewed',analysis_status text DEFAULT 'ready',updated_at timestamptz DEFAULT now());
    CREATE TYPE risk_level_enum AS ENUM ('safe','caution','danger');
    CREATE TABLE ingredients(id uuid PRIMARY KEY,name_ko text,name_en text,risk_level risk_level_enum,description text);
    CREATE TABLE product_ingredients(product_id uuid,ingredient_id uuid,sort_order integer);
    CREATE TABLE canonical_ingredients(id uuid PRIMARY KEY,legacy_ingredient_id uuid,canonical_name_ko text,canonical_name_en text,status text);
    CREATE TABLE product_ingredient_label_sets(id uuid PRIMARY KEY,product_id uuid,raw_label_text text,source_reference text,source_type text DEFAULT 'package_image',is_current boolean DEFAULT true,updated_at timestamptz DEFAULT now());
    CREATE TABLE product_ingredient_label_items(id uuid PRIMARY KEY,label_set_id uuid,display_order int,raw_ingredient_text text,match_status text,legacy_ingredient_id uuid,canonical_ingredient_id uuid,updated_at timestamptz DEFAULT now(),parser_metadata jsonb DEFAULT '{}',amount_text text,percentage numeric);
    CREATE TABLE admin_audit_log(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,actor text,action text,target_table text,target_id text,detail jsonb);
    INSERT INTO products(id,name,brand_name) VALUES('00000000-0000-4000-8000-000000000001','Synthetic label food','Synthetic');
    INSERT INTO ingredients VALUES('00000000-0000-4000-8000-000000000003','닭고기','chicken','safe','synthetic'),('00000000-0000-4000-8000-000000000004','대두','soy','safe','synthetic');
    INSERT INTO product_ingredient_label_sets(id,product_id,raw_label_text,source_reference) VALUES('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001','닭고기, 대두','fixture:source');
    INSERT INTO product_ingredient_label_items(id,label_set_id,display_order,raw_ingredient_text,match_status,legacy_ingredient_id) VALUES('00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000002',1,'닭고기','matched','00000000-0000-4000-8000-000000000003'),('00000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000002',2,'대두','matched','00000000-0000-4000-8000-000000000004');
