-- Private diary media, retryable cleanup, authenticated deletion and rating-only launch.
BEGIN;

UPDATE storage.buckets SET public = false WHERE id = 'feeding-log-photos';
DROP POLICY IF EXISTS feeding_log_photos_public_read ON storage.objects;
DROP POLICY IF EXISTS feeding_log_photos_owner_read ON storage.objects;
CREATE POLICY feeding_log_photos_owner_read ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'feeding-log-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.account_photo_cleanup (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, name)
);
-- Claimed paths never become attachable again, even after Storage.remove is
-- acknowledged. Retaining this small tombstone closes the DB/Storage HTTP gap.
ALTER TABLE public.account_photo_cleanup
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_photo_cleanup ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.account_deletion_requests, public.account_photo_cleanup FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.begin_account_deletion(p_user_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM 1 FROM auth.users WHERE id = p_user_id FOR UPDATE;
  INSERT INTO public.account_deletion_requests(user_id) VALUES (p_user_id) ON CONFLICT DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.account_owned_objects(p_user_id uuid)
RETURNS TABLE(bucket_id text, name text)
LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  SELECT o.bucket_id, o.name FROM storage.objects o
  WHERE o.owner_id = p_user_id::text OR o.owner = p_user_id
    OR (o.bucket_id IN ('feeding-log-photos', 'product-scan-evidence') AND split_part(o.name, '/', 1) = p_user_id::text)
  ORDER BY o.bucket_id, o.name LIMIT 500;
$$;

-- Locks serialize an upload with the start of account deletion. The flag is kept
-- on failure, so retries cannot race new uploads into a nearly deleted account.
CREATE OR REPLACE FUNCTION public.guard_deleted_account_upload() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE uid uuid;
BEGIN
  IF NEW.bucket_id IN ('feeding-log-photos', 'product-scan-evidence') AND split_part(NEW.name, '/', 1) ~ '^[0-9a-fA-F-]{36}$' THEN
    uid := split_part(NEW.name, '/', 1)::uuid;
  ELSE uid := COALESCE(NEW.owner, NULLIF(NEW.owner_id, '')::uuid); END IF;
  IF uid IS NOT NULL THEN
    PERFORM 1 FROM auth.users WHERE id = uid FOR UPDATE;
    -- Already-issued signed uploads may arrive after auth deletion. Reject them
    -- even after the deletion flag was cascaded away with its auth owner.
    IF NOT FOUND THEN RAISE EXCEPTION 'account_not_found'; END IF;
    IF EXISTS (SELECT 1 FROM public.account_deletion_requests WHERE user_id = uid) THEN
      RAISE EXCEPTION 'account_deletion_in_progress';
    END IF;
    IF NEW.bucket_id = 'feeding-log-photos' AND EXISTS (
      SELECT 1 FROM public.account_photo_cleanup q
      WHERE q.user_id = uid AND q.name = NEW.name AND q.claimed_at IS NOT NULL
    ) THEN RAISE EXCEPTION 'photo_cleanup_claimed'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS account_deletion_upload_guard ON storage.objects;
CREATE TRIGGER account_deletion_upload_guard BEFORE INSERT OR UPDATE ON storage.objects
FOR EACH ROW EXECUTE FUNCTION public.guard_deleted_account_upload();

-- Normalize existing owned legacy URLs; do not expose or discard inline legacy photos.
UPDATE public.pet_feeding_logs
SET image_url = regexp_replace(split_part(image_url, '?', 1), '^https://[^/]+/storage/v1/object/(public|sign|authenticated)/feeding-log-photos/', '')
WHERE image_url ~ ('^https://[^/]+/storage/v1/object/(public|sign|authenticated)/feeding-log-photos/' || user_id::text || '/');

CREATE OR REPLACE FUNCTION public.guard_diary_photo_reference() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.image_url IS NULL OR NEW.image_url LIKE 'data:image/%' THEN RETURN NEW; END IF;
  -- Older clients may submit a cached public/signed URL rather than a path.
  -- Normalize before checking the tombstone; percent-encoded and foreign paths
  -- are rejected instead of bypassing cleanup ownership.
  NEW.image_url := regexp_replace(split_part(NEW.image_url, '?', 1),
    '^https://[^/]+/storage/v1/object/(public|sign|authenticated)/feeding-log-photos/', '');
  IF split_part(NEW.image_url, '/', 1) <> NEW.user_id::text
    OR NEW.image_url !~ '^[a-zA-Z0-9._/-]+$'
    OR NEW.image_url ~ '(^|/)\.\.?(/|$)'
    OR NEW.image_url LIKE '%//%' OR NEW.image_url LIKE '%/' THEN
    RAISE EXCEPTION 'invalid_photo_reference';
  END IF;
  -- The same owner lock is taken by the batch claim and storage upload guard.
  -- If this save wins, the claim sees its reference; if the claim wins, this
  -- save sees claimed_at and fails before it can revive a deleted image.
  PERFORM 1 FROM auth.users WHERE id = NEW.user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'account_not_found'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.account_photo_cleanup q
    WHERE q.user_id = NEW.user_id AND q.name = NEW.image_url AND q.claimed_at IS NOT NULL
  ) THEN RAISE EXCEPTION 'photo_cleanup_claimed'; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS diary_photo_reference_guard ON public.pet_feeding_logs;
CREATE TRIGGER diary_photo_reference_guard BEFORE INSERT OR UPDATE OF user_id, image_url ON public.pet_feeding_logs
FOR EACH ROW EXECUTE FUNCTION public.guard_diary_photo_reference();

CREATE OR REPLACE FUNCTION public.queue_removed_diary_photo() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = OLD.user_id) AND OLD.image_url IS NOT NULL AND (TG_OP = 'DELETE' OR OLD.image_url IS DISTINCT FROM NEW.image_url)
    AND split_part(OLD.image_url, '/', 1) = OLD.user_id::text
    AND OLD.image_url !~ '(^|/)\.\.(/|$)' THEN
    INSERT INTO public.account_photo_cleanup(user_id, name) VALUES (OLD.user_id, OLD.image_url) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS diary_photo_cleanup ON public.pet_feeding_logs;
CREATE TRIGGER diary_photo_cleanup AFTER UPDATE OF image_url OR DELETE ON public.pet_feeding_logs
FOR EACH ROW EXECUTE FUNCTION public.queue_removed_diary_photo();

CREATE OR REPLACE FUNCTION public.account_photo_cleanup_batch(p_user_id uuid)
RETURNS TABLE(bucket_id text, name text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM 1 FROM auth.users WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  RETURN QUERY
    WITH candidates AS (
      SELECT q.name FROM public.account_photo_cleanup q
      WHERE q.user_id = p_user_id AND q.completed_at IS NULL AND NOT EXISTS (
        SELECT 1 FROM public.pet_feeding_logs l WHERE l.user_id = p_user_id AND l.image_url = q.name
      ) ORDER BY q.name LIMIT 100
    )
    UPDATE public.account_photo_cleanup q SET claimed_at = COALESCE(q.claimed_at, now())
    FROM candidates c WHERE q.user_id = p_user_id AND q.name = c.name
    RETURNING 'feeding-log-photos'::text, q.name;
END;
$$;
CREATE OR REPLACE FUNCTION public.ack_account_photo_cleanup(p_user_id uuid, p_paths text[]) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  UPDATE public.account_photo_cleanup SET completed_at = COALESCE(completed_at, now())
  WHERE user_id = p_user_id AND name = ANY(p_paths) AND claimed_at IS NOT NULL;
$$;

-- Only service-role handlers may enumerate/delete storage. Clients cannot supply
-- a different identity to these RPCs; account-manage verifies the bearer with Auth.
REVOKE ALL ON FUNCTION public.begin_account_deletion(uuid), public.account_owned_objects(uuid),
  public.account_photo_cleanup_batch(uuid), public.ack_account_photo_cleanup(uuid,text[]),
  public.guard_deleted_account_upload(), public.guard_diary_photo_reference(), public.queue_removed_diary_photo() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.begin_account_deletion(uuid), public.account_owned_objects(uuid),
  public.account_photo_cleanup_batch(uuid), public.ack_account_photo_cleanup(uuid,text[]) TO service_role;

-- Legacy review text stays available only to its author/admin. Public projection
-- deliberately contains no free text, nickname, avatar, or account identifier.
DROP POLICY IF EXISTS "Anyone can read reviews" ON public.reviews;
DROP POLICY IF EXISTS "Owners read reviews" ON public.reviews;
CREATE POLICY "Owners read reviews" ON public.reviews FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users insert own reviews" ON public.reviews;
CREATE POLICY "Users insert own reviews" ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND content = '');
REVOKE UPDATE ON public.reviews FROM anon, authenticated;
CREATE OR REPLACE VIEW public.product_ratings WITH (security_barrier = true) AS
  SELECT id, product_id, rating, created_at, (user_id = auth.uid()) AS is_mine FROM public.reviews;
REVOKE ALL ON public.product_ratings FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.product_ratings TO anon, authenticated;

DROP POLICY IF EXISTS "Review authors have public profiles" ON public.users;
DROP POLICY IF EXISTS "Anyone can view public profile" ON public.users;
REVOKE SELECT ON public.users FROM anon;

-- Dormant community APIs must not keep publishing arbitrary text while launch UI
-- is rating-only. Preserve existing rows privately and disable new public posting.
DO $$ DECLARE t text; p record; BEGIN
  FOREACH t IN ARRAY ARRAY['community_posts', 'community_comments'] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t LOOP
        EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, t);
      END LOOP;
      EXECUTE format('CREATE POLICY owner_read ON public.%I FOR SELECT TO authenticated USING (auth.uid() = user_id)', t);
      EXECUTE format('CREATE POLICY owner_delete ON public.%I FOR DELETE TO authenticated USING (auth.uid() = user_id)', t);
      EXECUTE format('REVOKE INSERT, UPDATE ON public.%I FROM anon, authenticated', t);
    END IF;
  END LOOP;
END $$;
COMMIT;
