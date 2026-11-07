-- SELECT ONLY: run in a NEW query in the operator-verified target Dashboard.
-- No review/product rows, user identifiers, tokens, defaults or function bodies.
-- Text literals in view SQL are redacted; fingerprints are not raw SQL equality.
WITH wanted_roles(role_name) AS (VALUES ('anon'),('authenticated'),('service_role')),
review_relation AS (SELECT * FROM pg_class WHERE oid=to_regclass('public.reviews')),
ratings_relation AS (SELECT * FROM pg_class WHERE oid=to_regclass('public.product_ratings')),
review_columns AS (
 SELECT c.column_name,c.data_type,c.is_nullable,
   jsonb_object_agg(r.role_name,jsonb_build_object(
     'select',has_column_privilege(r.role_name,'public.reviews',c.column_name,'SELECT'),
     'insert',has_column_privilege(r.role_name,'public.reviews',c.column_name,'INSERT'),
     'update',has_column_privilege(r.role_name,'public.reviews',c.column_name,'UPDATE'))) AS privileges
 FROM information_schema.columns c CROSS JOIN wanted_roles r
 WHERE c.table_schema='public' AND c.table_name='reviews'
 GROUP BY c.column_name,c.data_type,c.is_nullable
), policies AS (
 SELECT policyname,roles,cmd,permissive,
   qual='true' AS unconditional_read,
   regexp_replace(qual,'[()[:space:]]','','g')='auth.uid=user_id' AS simple_owner_only,
   md5(concat_ws('|',qual,with_check)) AS definition_fingerprint
 FROM pg_policies WHERE schemaname='public' AND tablename='reviews'
), view_metadata AS (
 SELECT c.relname,c.reloptions,
   c.relowner=r.relowner AS owns_reviews,
   owner.rolbypassrls AS owner_bypasses_rls,owner.rolsuper AS owner_is_superuser,
   md5(pg_get_viewdef(c.oid,true)) AS definition_fingerprint,
   regexp_replace(pg_get_viewdef(c.oid,true),'''(''''|[^''])*''','''[literal redacted]''','g') AS definition_literals_redacted
 FROM ratings_relation c CROSS JOIN review_relation r JOIN pg_roles owner ON owner.oid=c.relowner
), relevant_functions AS (
 SELECT p.oid,p.oid::regprocedure::text AS signature,p.prosecdef,
   md5(pg_get_functiondef(p.oid)) AS definition_fingerprint
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname IN('admin_support_correct','refresh_product_review_aggregate','sync_product_review_aggregate')
)
SELECT jsonb_build_object(
 'observed_at',statement_timestamp(),'server_version',current_setting('server_version'),
 'reviews_rls',(SELECT jsonb_build_object('enabled',relrowsecurity,'forced',relforcerowsecurity) FROM review_relation),
 'table_privileges',(SELECT jsonb_object_agg(role_name,jsonb_build_object(
   'select',has_table_privilege(role_name,'public.reviews','SELECT'),
   'insert',has_table_privilege(role_name,'public.reviews','INSERT'),
   'update',has_table_privilege(role_name,'public.reviews','UPDATE'),
   'delete',has_table_privilege(role_name,'public.reviews','DELETE'))) FROM wanted_roles),
 'review_columns',(SELECT jsonb_agg(to_jsonb(c) ORDER BY column_name) FROM review_columns c),
 'policies',(SELECT jsonb_agg(to_jsonb(p) ORDER BY policyname) FROM policies p),
 'ratings_view',(SELECT to_jsonb(v) FROM view_metadata v),
 'ratings_columns',(SELECT jsonb_agg(jsonb_build_object('name',column_name,'type',data_type) ORDER BY ordinal_position)
   FROM information_schema.columns WHERE table_schema='public' AND table_name='product_ratings'),
 'view_privileges',(SELECT jsonb_object_agg(role_name,has_table_privilege(role_name,'public.product_ratings','SELECT')) FROM wanted_roles),
 'admin_function_privileges',(SELECT jsonb_agg(jsonb_build_object('signature',f.signature,'security_definer',f.prosecdef,
   'definition_fingerprint',f.definition_fingerprint,'execute',(SELECT jsonb_object_agg(role_name,has_function_privilege(role_name,f.oid,'EXECUTE')) FROM wanted_roles))) FROM relevant_functions f),
 'relevant_ledger',(SELECT jsonb_agg(jsonb_build_object('version',version,'name',name) ORDER BY version)
   FROM supabase_migrations.schema_migrations WHERE version IN('20261026160000','20261103140000','20261104110000'))
) AS review_privacy_metadata;
