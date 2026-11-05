-- REVIEWED MIGRATION: raw-review SELECT boundary only.
-- Apply only through a separately approved, exact-only tracked release bundle.
-- Existing release exposes stars via product_ratings; raw legacy rows remain
-- author/admin data per the existing account_privacy_release contract.
-- No authored outer BEGIN/COMMIT: a reviewed CLI migration must own the
-- transaction including its normal history insert. Never paste as standalone SQL.
SET LOCAL lock_timeout = '5s';
LOCK TABLE public.reviews IN ACCESS EXCLUSIVE MODE;
DO $$
DECLARE v_columns text[]; v_types text[]; existing_policy record;
BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.reviews'::regclass) THEN
    RAISE EXCEPTION 'Existing reviews RLS is disabled: review all operation policies first';
  END IF;
  SELECT array_agg(column_name::text ORDER BY ordinal_position),
         array_agg(data_type::text ORDER BY ordinal_position)
    INTO v_columns,v_types
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='product_ratings';
  IF v_columns IS DISTINCT FROM ARRAY['id','product_id','rating','created_at','is_mine']
     OR v_types IS DISTINCT FROM ARRAY['uuid','uuid','integer','timestamp with time zone','boolean'] THEN
    RAISE EXCEPTION 'Unrecognized public ratings contract: review before raw-read hardening';
  END IF;
  -- This intentionally owner-privileged public view must keep functioning when
  -- the caller cannot read raw rows. Do not change ownership or FORCE RLS here.
  IF NOT EXISTS (
    SELECT 1 FROM pg_class v JOIN pg_roles owner ON owner.oid=v.relowner
      CROSS JOIN pg_class r
    WHERE v.oid=to_regclass('public.product_ratings') AND v.relkind='v'
      AND r.oid='public.reviews'::regclass
      AND NOT coalesce(v.reloptions @> ARRAY['security_invoker=true'],false)
      AND (owner.rolsuper OR owner.rolbypassrls OR (v.relowner=r.relowner AND NOT r.relforcerowsecurity))
  ) THEN
    RAISE EXCEPTION 'Public ratings view ownership/RLS requires separate compatibility review';
  END IF;
  SELECT * INTO existing_policy FROM pg_policy
    WHERE polrelid='public.reviews'::regclass AND polname='reviews_owner_read_required';
  IF FOUND THEN
    IF existing_policy.polpermissive OR existing_policy.polcmd <> 'r'
      OR (SELECT array_agg(rolname::text ORDER BY rolname) FROM pg_roles WHERE oid=ANY(existing_policy.polroles))
         IS DISTINCT FROM ARRAY['anon','authenticated']
      OR regexp_replace(pg_get_expr(existing_policy.polqual,existing_policy.polrelid),'[()[:space:]]','','g') IS DISTINCT FROM 'auth.uid=user_id'
    THEN RAISE EXCEPTION 'Existing reviews_owner_read_required differs: no silent replacement'; END IF;
  ELSE
    CREATE POLICY reviews_owner_read_required ON public.reviews AS RESTRICTIVE
      FOR SELECT TO anon, authenticated USING (auth.uid() = user_id);
  END IF;
END $$;
