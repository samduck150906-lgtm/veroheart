import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const preflightPath = resolve(
  process.cwd(),
  'supabase/tests/manual/phase1_production_preflight.sql',
);
const runbookPath = resolve(process.cwd(), 'docs/phase1-production-preflight-runbook.md');
const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260630090000_non_destructive_ingredient_schema.sql',
);
const sql = readFileSync(preflightPath, 'utf8');
const runbook = readFileSync(runbookPath, 'utf8');
const migration = readFileSync(migrationPath, 'utf8');

function executableSql(source: string) {
  return source
    .replace(/--.*$/gm, '')
    .replace(/'(?:''|[^'])*'/gs, "''")
    .trim();
}

function cteBody(name: string, nextName: string) {
  const match = sql.match(
    new RegExp(`${name}\\([^)]*\\) AS \\(\\s*VALUES([\\s\\S]*?)\\n\\),\\n${nextName}`),
  );
  expect(match, `missing ${name} CTE`).not.toBeNull();
  return match?.[1] ?? '';
}

function valuesFromCte(name: string, nextName: string) {
  return [...cteBody(name, nextName).matchAll(/'([^']+)'/g)].map((match) => match[1]);
}

const prerequisites = ['products', 'ingredients', 'allergens'] as const;

const phaseTables = [
  'analysis_engine_versions',
  'canonical_ingredients',
  'canonical_ingredient_aliases',
  'ingredient_evidence_sources',
  'canonical_ingredient_evidence',
  'canonical_analysis_rules',
  'canonical_analysis_rule_evidence',
  'product_ingredient_label_sets',
  'product_ingredient_label_items',
  'canonical_ingredient_allergen_map',
  'canonical_ingredient_review_queue',
] as const;

const phaseIndexes = [
  'idx_canonical_ingredients_legacy_id',
  'idx_canonical_ingredient_aliases_ingredient',
  'idx_canonical_ingredient_aliases_normalized',
  'idx_ingredient_evidence_sources_doi',
  'idx_canonical_ingredient_evidence_source',
  'idx_canonical_analysis_rules_active',
  'idx_product_ingredient_label_sets_product',
  'idx_product_ingredient_label_sets_one_current',
  'idx_product_ingredient_label_items_legacy',
  'idx_product_ingredient_label_items_canonical',
  'idx_canonical_ingredient_allergen_allergen',
  'idx_canonical_ingredient_review_queue_status',
  'idx_canonical_ingredient_review_queue_open_text',
] as const;

const phasePolicies = [
  'analysis_engine_versions_read',
  'canonical_ingredients_read',
  'canonical_ingredient_aliases_read',
  'ingredient_evidence_sources_read',
  'canonical_ingredient_evidence_read',
  'canonical_analysis_rules_read',
  'canonical_analysis_rule_evidence_read',
  'product_ingredient_label_sets_read',
  'product_ingredient_label_items_read',
  'canonical_ingredient_allergen_map_read',
] as const;

const phaseConstraintRelations = [
  'analysis_engine_versions_pkey',
  'canonical_ingredients_pkey',
  'canonical_ingredient_aliases_pkey',
  'ingredient_evidence_sources_pkey',
  'canonical_ingredient_evidence_pkey',
  'canonical_analysis_rules_pkey',
  'canonical_analysis_rule_evidence_pkey',
  'product_ingredient_label_sets_pkey',
  'product_ingredient_label_items_pkey',
  'canonical_ingredient_allergen_map_pkey',
  'canonical_ingredient_review_queue_pkey',
  'analysis_engine_versions_version_key',
  'canonical_ingredients_normalized_key_key',
  'canonical_ingredients_name_ko_key',
  'canonical_ingredient_aliases_normalized_key',
  'canonical_ingredient_evidence_unique',
  'canonical_analysis_rules_version_key',
  'product_ingredient_label_items_order_key',
] as const;

describe('Phase 1 production preflight contract', () => {
  it('contains one read-only CTE query and no prohibited syntax', () => {
    const executable = executableSql(sql);
    const statements = executable.split(';').map((part) => part.trim()).filter(Boolean);

    expect(statements).toHaveLength(1);
    expect(statements[0]).toMatch(/^WITH\b/i);
    expect(statements[0]).toMatch(/\bSELECT\b/i);
    expect(executable).not.toMatch(
      /\b(?:CREATE|ALTER|DROP|INSERT|UPDATE|DELETE|TRUNCATE|GRANT|REVOKE|COPY|CALL|DO|EXECUTE|MERGE|REFRESH|VACUUM|ANALYZE|REINDEX|CLUSTER|LOCK)\b/i,
    );
    expect(executable).not.toMatch(/\bSELECT\b[\s\S]*?\bINTO\b/i);
    expect(executable).not.toMatch(/\bCOMMENT\s+ON\b/i);
    expect(executable).not.toMatch(
      /\b(?:BEGIN|COMMIT|ROLLBACK|SAVEPOINT)\b|\b(?:START|SET)\s+TRANSACTION\b/i,
    );
    expect(executable).not.toMatch(/\b(?:FROM|JOIN)\s+public\./i);
    expect(executable).not.toMatch(/\b(?:FROM|JOIN)\s+supabase_migrations\./i);
  });

  it('checks exactly the three prerequisite table names', () => {
    expect(valuesFromCte('required_prerequisites', 'phase_tables')).toEqual(prerequisites);
  });

  it('checks exactly the 11 Phase 1 table names', () => {
    expect(valuesFromCte('phase_tables', 'phase_indexes')).toEqual(phaseTables);
  });

  it('checks exactly the 13 Phase 1 index names', () => {
    expect(valuesFromCte('phase_indexes', 'phase_policies')).toEqual(phaseIndexes);
  });

  it('checks exactly the 10 Phase 1 policy names', () => {
    const body = cteBody('phase_policies', 'phase_constraint_indexes');
    const policies = [...body.matchAll(/\(\d+,\s*'[^']+',\s*'([^']+)'\)/g)].map(
      (match) => match[1],
    );
    expect(policies).toEqual(phasePolicies);
  });

  it('checks exactly the 18 constraint-backed relation names', () => {
    expect(valuesFromCte('phase_constraint_indexes', 'prerequisite_state')).toEqual(
      phaseConstraintRelations,
    );
  });

  it('keeps migration object lists aligned with the Phase 1 migration', () => {
    const migrationTables = [
      ...migration.matchAll(/CREATE TABLE IF NOT EXISTS public\.([a-z0-9_]+)/g),
    ].map((match) => match[1]);
    const migrationIndexes = [
      ...migration.matchAll(/CREATE (?:UNIQUE )?INDEX IF NOT EXISTS ([a-z0-9_]+)/g),
    ].map((match) => match[1]);
    const migrationPolicies = [...migration.matchAll(/CREATE POLICY ([a-z0-9_]+)/g)].map(
      (match) => match[1],
    );

    expect(valuesFromCte('phase_tables', 'phase_indexes')).toEqual(migrationTables);
    expect(valuesFromCte('phase_indexes', 'phase_policies')).toEqual(migrationIndexes);
    expect(
      [...cteBody('phase_policies', 'phase_constraint_indexes').matchAll(
        /\(\d+,\s*'[^']+',\s*'([^']+)'\)/g,
      )].map((match) => match[1]),
    ).toEqual(migrationPolicies);
  });

  it('warns when migration history lacks either the relation or version column', () => {
    expect(sql).toMatch(
      /WHEN hs\.history_relation IS NULL OR NOT hs\.has_version_column THEN 'WARN'/,
    );
    expect(sql).toMatch(
      /WHEN NOT hs\.has_version_column THEN 'Migration history relation exists but no version column is visible\.'/,
    );
  });

  it('keeps the migration version check as an unconditional warning', () => {
    expect(sql).toMatch(
      /61,\s*'WARN',\s*'migration_version_20260630090000'/,
    );
  });

  it('documents REVIEW_REQUIRED as the current automatic best result', () => {
    expect(sql).toContain('Current automatic best result: REVIEW_REQUIRED');
    expect(runbook).toContain(
      '현재 자동 preflight에서 BLOCK이 없을 때 가능한 최선 결과는 `REVIEW_REQUIRED`',
    );
    expect(runbook).toContain('현재 SQL 단독 실행에서는 도달할 수 없습니다');
  });

  it('contains all final assessment outcomes', () => {
    expect(sql).toContain("'FINAL_ASSESSMENT'");
    expect(sql).toContain("'NOT_READY'");
    expect(sql).toContain("'REVIEW_REQUIRED'");
    expect(sql).toContain("'PREFLIGHT_PASS'");
  });

  it('warns about the production project in both artifacts', () => {
    expect(sql).toContain('nlutpmjloryqdomgbqrr');
    expect(runbook).toContain('nlutpmjloryqdomgbqrr');
  });
});
