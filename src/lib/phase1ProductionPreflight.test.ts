import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const preflightPath = resolve(
  process.cwd(),
  'supabase/tests/manual/phase1_production_preflight.sql',
);
const runbookPath = resolve(process.cwd(), 'docs/phase1-production-preflight-runbook.md');
const sql = readFileSync(preflightPath, 'utf8');
const runbook = readFileSync(runbookPath, 'utf8');

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

describe('Phase 1 production preflight contract', () => {
  it('contains one read-only CTE query and no prohibited syntax', () => {
    const executable = executableSql(sql);
    const statements = executable.split(';').map((part) => part.trim()).filter(Boolean);

    expect(statements).toHaveLength(1);
    expect(statements[0]).toMatch(/^WITH\b/i);
    expect(statements[0]).toMatch(/\bSELECT\b/i);
    expect(executable).not.toMatch(
      /\b(?:CREATE|ALTER|DROP|INSERT|UPDATE|DELETE|TRUNCATE|GRANT|REVOKE|COPY|CALL|DO|EXECUTE)\b/i,
    );
    expect(executable).not.toMatch(/\bCOMMENT\s+ON\b/i);
    expect(executable).not.toMatch(
      /\b(?:BEGIN|COMMIT|ROLLBACK|SAVEPOINT)\b|\b(?:START|SET)\s+TRANSACTION\b/i,
    );
    expect(executable).not.toMatch(/\b(?:FROM|JOIN)\s+public\./i);
    expect(executable).not.toMatch(/\b(?:FROM|JOIN)\s+supabase_migrations\./i);
  });

  it('checks exactly the 11 Phase 1 table names', () => {
    const body = cteBody('phase_tables', 'phase_indexes');
    expect(body.match(/\(\d+,\s*'/g)).toHaveLength(phaseTables.length);
    for (const table of phaseTables) expect(body).toContain(`'${table}'`);
  });

  it('checks exactly the 13 Phase 1 index names', () => {
    const body = cteBody('phase_indexes', 'phase_policies');
    expect(body.match(/\(\d+,\s*'/g)).toHaveLength(phaseIndexes.length);
    for (const index of phaseIndexes) expect(body).toContain(`'${index}'`);
  });

  it('checks exactly the 10 Phase 1 policy names', () => {
    const body = cteBody('phase_policies', 'phase_constraint_indexes');
    expect(body.match(/\(\d+,\s*'/g)).toHaveLength(phasePolicies.length);
    for (const policy of phasePolicies) expect(body).toContain(`'${policy}'`);
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
