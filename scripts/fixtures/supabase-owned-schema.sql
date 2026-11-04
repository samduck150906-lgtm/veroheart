-- Minimal Supabase-owned objects for isolated PostgreSQL/PGlite repository replay.
-- These are service-schema fixtures, not real Auth/Storage services or migrations.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role BYPASSRLS; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='supabase_auth_admin') THEN CREATE ROLE supabase_auth_admin; END IF;
END $$;
CREATE SCHEMA auth;
CREATE SCHEMA storage;
CREATE SCHEMA extensions;
CREATE TABLE auth.users(id UUID PRIMARY KEY, email TEXT, raw_user_meta_data JSONB DEFAULT '{}', raw_app_meta_data JSONB DEFAULT '{}', created_at TIMESTAMPTZ DEFAULT now(), is_anonymous BOOLEAN DEFAULT false);
CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE SQL AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID $$;
CREATE FUNCTION auth.role() RETURNS TEXT LANGUAGE SQL AS $$ SELECT NULLIF(current_setting('request.jwt.claim.role', true), '')::TEXT $$;
CREATE TABLE storage.buckets(id TEXT PRIMARY KEY, name TEXT, public BOOLEAN, file_size_limit BIGINT, allowed_mime_types TEXT[]);
CREATE TABLE storage.objects(id UUID PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id TEXT, name TEXT, metadata JSONB, owner UUID, owner_id TEXT, UNIQUE(bucket_id,name));
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION storage.foldername(name TEXT) RETURNS TEXT[] LANGUAGE SQL IMMUTABLE AS $$ SELECT (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1)-1] $$;
GRANT USAGE ON SCHEMA public, auth, storage TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public, auth, storage TO service_role;
