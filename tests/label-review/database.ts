// Synthetic minimal PostgreSQL fixture, never an operating connection/full schema.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
export const PRODUCT = '00000000-0000-4000-8000-000000000001';
export const LABEL = '00000000-0000-4000-8000-000000000002';
export const ITEMS = ['00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000004'];
export const observation = { identityConfirmed:true, wholeLabelCompared:true, sourceReference:'fixture:package-image-v1', identityNotes:'Synthetic exact package/weight/flavour reviewed', coverageNotes:'Entire synthetic label compared, including repeated/compound tokens' };
export async function labelReviewDatabase() {
  const db = new PGlite();
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA private; REVOKE ALL ON SCHEMA private FROM PUBLIC;
    CREATE FUNCTION private.hide_unverified_products_enabled() RETURNS boolean LANGUAGE sql AS 'SELECT FALSE';
    CREATE TABLE products(id uuid PRIMARY KEY,name text,brand_name text,variant_name text,net_weight_text text,barcode text,target_pet_type text DEFAULT 'dog',target_life_stage text[],product_type text DEFAULT 'food',formulation text,is_visible boolean DEFAULT true,verification_status text DEFAULT 'reviewed',analysis_status text DEFAULT 'ready',updated_at timestamptz DEFAULT now());
    CREATE TYPE risk_level_enum AS ENUM ('safe','caution','danger');
    CREATE TABLE ingredients(id uuid PRIMARY KEY,name_ko text,name_en text,risk_level risk_level_enum,description text);
    CREATE TABLE canonical_ingredients(id uuid PRIMARY KEY,legacy_ingredient_id uuid,canonical_name_ko text,canonical_name_en text,status text);
    CREATE TABLE product_ingredient_label_sets(id uuid PRIMARY KEY,product_id uuid,raw_label_text text,source_reference text,source_type text DEFAULT 'package_image',is_current boolean DEFAULT true,updated_at timestamptz DEFAULT now());
    CREATE TABLE product_ingredient_label_items(id uuid PRIMARY KEY,label_set_id uuid,display_order int,raw_ingredient_text text,match_status text,legacy_ingredient_id uuid,canonical_ingredient_id uuid,updated_at timestamptz DEFAULT now(),parser_metadata jsonb DEFAULT '{}',amount_text text,percentage numeric);
    CREATE TABLE admin_audit_log(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,actor text,action text,target_table text,target_id text,detail jsonb);
    INSERT INTO products(id,name,brand_name) VALUES('${PRODUCT}','Synthetic label food','Synthetic');
    INSERT INTO ingredients VALUES('${ITEMS[0]}','닭고기','chicken','safe','synthetic'),('${ITEMS[1]}','대두','soy','safe','synthetic');
    INSERT INTO product_ingredient_label_sets(id,product_id,raw_label_text,source_reference) VALUES('${LABEL}','${PRODUCT}','닭고기, 대두','fixture:source');
    INSERT INTO product_ingredient_label_items(id,label_set_id,display_order,raw_ingredient_text,match_status,legacy_ingredient_id) VALUES('${ITEMS[0]}','${LABEL}',1,'닭고기','matched','${ITEMS[0]}'),('${ITEMS[1]}','${LABEL}',2,'대두','matched','${ITEMS[1]}');`);
  await db.exec(readFileSync('supabase/migration_drafts/ingredient_label_comparison_evidence.sql','utf8'));
  return db;
}
