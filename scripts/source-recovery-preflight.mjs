// Generate SELECT-only schema/ledger evidence. Never connects to a database.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseProjection } from './product-projection-contract.mjs';
const literal = value => `'${value.replaceAll("'", "''")}'`;
export async function recoveryRequirements(repo = fileURLToPath(new URL('..', import.meta.url))) {
  const source = await readFile(path.join(repo,'src/lib/supabase.ts'), 'utf8');
  const blocks = [...source.matchAll(/\.select\(`([\s\S]*?)`\)/g)].map(m => m[1]).filter(s => /\bbrand_name\b/.test(s));
  const columns = new Set(); const relationships = new Set();
  function visit(table, tree) {
    for (const n of tree) {
      if (!n.children) columns.add(JSON.stringify([table, n.name]));
      else { relationships.add(JSON.stringify([table, n.name, n.hint ?? ''])); visit(n.name, n.children); }
    }
  }
  for (const block of blocks) { const tree = parseProjection(block); visit('products', tree.find(n => n.name === 'products' && n.children)?.children ?? tree); }
  for (const name of ['id','product_id','rating','created_at','is_mine']) columns.add(JSON.stringify(['product_ratings',name]));
  return { columns, relationships };
}
export async function recoveryPreflightSql() {
  const { columns, relationships } = await recoveryRequirements();
  const tuples = entries => [...entries].sort().map(s => '(' + JSON.parse(s).map(literal).join(',') + ')').join(',\n');
  return `-- SELECT ONLY. NEW Dashboard query; confirm target project in Dashboard UI.
-- No RPC invocation, row values, function bodies, connection data or defaults returned.
-- project_ref is intentionally NOT inferred from a database name or input assertion.
WITH expected_columns(table_name,column_name) AS (VALUES ${tuples(columns)}),
expected_relations(parent,child,hint) AS (VALUES ${tuples(relationships)}),
column_checks AS (
 SELECT e.*,c.column_name IS NOT NULL AS present,c.data_type,c.is_nullable,c.is_generated,
 md5(c.column_default) AS default_fingerprint,
 CASE WHEN c.column_name IS NOT NULL THEN has_column_privilege('anon',format('public.%I',e.table_name),e.column_name,'SELECT') END AS anon_select,
 CASE WHEN c.column_name IS NOT NULL THEN has_column_privilege('authenticated',format('public.%I',e.table_name),e.column_name,'SELECT') END AS authenticated_select
 FROM expected_columns e LEFT JOIN information_schema.columns c
 ON c.table_schema='public' AND c.table_name=e.table_name AND c.column_name=e.column_name
), relation_checks AS (
 SELECT e.*,count(c.oid)::int AS candidate_count,(count(c.oid)=1) AS present
 FROM expected_relations e LEFT JOIN pg_constraint c ON c.contype='f'
 AND ((c.conrelid=to_regclass('public.'||e.parent) AND c.confrelid=to_regclass('public.'||e.child))
 OR (c.conrelid=to_regclass('public.'||e.child) AND c.confrelid=to_regclass('public.'||e.parent)))
 AND (e.hint='' OR c.conname=e.hint OR EXISTS (
 SELECT 1 FROM pg_attribute a WHERE a.attrelid=c.conrelid AND a.attnum=ANY(c.conkey) AND a.attname=e.hint))
 GROUP BY e.parent,e.child,e.hint
), function_checks AS (
 SELECT 'public.search_catalog_products(text,text,text,integer,integer)' AS signature,
 p.oid IS NOT NULL AS present,p.prosecdef AS security_definer,
 CASE WHEN p.oid IS NOT NULL THEN has_function_privilege('anon',p.oid,'EXECUTE') END AS anon_execute,
 CASE WHEN p.oid IS NOT NULL THEN has_function_privilege('authenticated',p.oid,'EXECUTE') END AS authenticated_execute,
 CASE WHEN p.oid IS NOT NULL THEN md5(pg_get_functiondef(p.oid)) END AS definition_fingerprint
 FROM (SELECT to_regprocedure('public.search_catalog_products(text,text,text,integer,integer)') oid) t
 LEFT JOIN pg_proc p ON p.oid=t.oid
)
SELECT jsonb_build_object(
 'observed_at',statement_timestamp(),
 'ledger',COALESCE((SELECT jsonb_agg(jsonb_build_object('version',m.version,'name',m.name,
 'statements_fingerprint',md5((to_jsonb(m)->'statements')::text)) ORDER BY m.version) FROM supabase_migrations.schema_migrations m),'[]'::jsonb),
 'columns',(SELECT jsonb_agg(to_jsonb(c) ORDER BY table_name,column_name) FROM column_checks c),
 'relationships',(SELECT jsonb_agg(to_jsonb(r) ORDER BY parent,child,hint) FROM relation_checks r),
 'functions',(SELECT jsonb_agg(to_jsonb(f)) FROM function_checks f),
 'publication_policies',(SELECT jsonb_agg(jsonb_build_object('name',policyname,'definition_fingerprint',md5(concat_ws('|',permissive,roles::text,cmd,qual,with_check)))) FROM pg_policies WHERE schemaname='public' AND tablename='products'),
 'product_rls',(SELECT jsonb_build_object('enabled',relrowsecurity,'forced',relforcerowsecurity,'anon_table_select',has_table_privilege('anon',oid,'SELECT'),'authenticated_table_select',has_table_privilege('authenticated',oid,'SELECT'),'acl_fingerprint',md5(COALESCE(relacl::text,''))) FROM pg_class WHERE oid=to_regclass('public.products'))
) AS recovery_preflight;
`;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.stdout.write(await recoveryPreflightSql());
