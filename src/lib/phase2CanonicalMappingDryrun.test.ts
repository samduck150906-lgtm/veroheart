import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sqlPath = resolve(process.cwd(), 'supabase/tests/manual/phase2_canonical_mapping_dryrun.sql');
const runbookPath = resolve(process.cwd(), 'docs/phase2-canonical-mapping-dryrun-runbook.md');

const sql = readFileSync(sqlPath, 'utf8');
const runbook = readFileSync(runbookPath, 'utf8');

function executableSql(source: string) {
  return source
    .replace(/--.*$/gm, '')
    .replace(/'(?:''|[^'])*'/gs, "''")
    .trim();
}

describe('Phase 2 canonical mapping dry-run contract', () => {
  it('is a single read-only CTE query', () => {
    const executable = executableSql(sql);
    const statements = executable.split(';').map((part) => part.trim()).filter(Boolean);

    expect(statements).toHaveLength(1);
    expect(statements[0]).toMatch(/^WITH\b/i);
    expect(statements[0]).toMatch(/\bSELECT\b/i);
  });

  it('does not contain prohibited write, schema, transaction, or dynamic execution syntax', () => {
    const executable = executableSql(sql);

    expect(executable).not.toMatch(
      /\b(?:INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|MERGE|TRUNCATE|CALL|DO|EXECUTE|UPSERT)\b/i,
    );
    expect(executable).not.toMatch(
      /\b(?:GRANT|REVOKE|COPY|REFRESH|VACUUM|ANALYZE|REINDEX|CLUSTER|LOCK)\b/i,
    );
    expect(executable).not.toMatch(/\bSELECT\b[\s\S]*?\bINTO\b/i);
    expect(executable).not.toMatch(
      /\b(?:BEGIN|COMMIT|ROLLBACK|SAVEPOINT)\b|\b(?:START|SET)\s+TRANSACTION\b/i,
    );
  });

  it('reads only the allowed legacy and reference tables', () => {
    const executable = executableSql(sql);
    const referencedTables = [
      ...executable.matchAll(/\b(?:FROM|JOIN)\s+public\.([a-z0-9_]+)/gi),
    ].map((match) => match[1]);

    expect([...new Set(referencedTables)].sort()).toEqual([
      'allergens',
      'ingredients',
      'product_ingredients',
      'products',
    ]);
  });

  it('returns the expected human-readable result columns', () => {
    expect(sql).toMatch(
      /SELECT\s+all_rows\.section,\s*all_rows\.severity,\s*all_rows\.metric_name,\s*all_rows\.metric_value,\s*all_rows\.detail,\s*all_rows\.recommended_action\s+FROM all_rows/is,
    );
  });

  it('includes all required Phase 2 dry-run metrics and assessment states', () => {
    for (const expected of [
      'legacy_ingredient_count',
      'product_ingredient_link_count',
      'product_ingredients_with_ingredient_id',
      'broken_or_empty_product_ingredient_links',
      'normalized_key_candidate_group_count',
      'manual_review_candidate_count',
      'dangerous_substring_pair_count',
      'risk_or_allergen_review_count',
      'DRYRUN_ASSESSMENT',
      'DRYRUN_READY',
      'DRYRUN_REVIEW_REQUIRED',
      'DRYRUN_BLOCKED',
    ]) {
      expect(sql).toContain(expected);
    }
  });

  it('casts legacy risk_level enum values before string comparisons and concatenation', () => {
    expect(sql).not.toMatch(/\bli\.risk_level\s+IN\s*\(/i);
    expect(sql).toMatch(/\bli\.risk_level::text\s+IN\s*\(/i);
    expect(sql).toContain("'legacy risk_level=' || li.risk_level::text");
  });

  it('uses strpos instead of schema-qualified position special syntax', () => {
    expect(sql).not.toMatch(/\bpg_catalog\.position\s*\(/i);
    expect(sql).not.toMatch(/\bposition\s*\([^)]*\bIN\b[^)]*\)/i);
    expect(sql).toContain('pg_catalog.strpos(');
  });

  it('documents dangerous substring and allergen review behavior', () => {
    expect(sql).toContain('포도');
    expect(sql).toContain('포도씨유');
    expect(sql).toContain('substring-only matching');
    expect(sql).toContain('allergen name candidate');
  });

  it('keeps the runbook focused on manual review rather than data migration', () => {
    expect(runbook).toContain('실제 데이터 이관이 아닙니다');
    expect(runbook).toContain('DRYRUN_READY');
    expect(runbook).toContain('DRYRUN_REVIEW_REQUIRED');
    expect(runbook).toContain('DRYRUN_BLOCKED');
    expect(runbook).toContain('supabase/tests/manual/phase2_canonical_mapping_dryrun.sql');
    expect(runbook).toContain('nlutpmjloryqdomgbqrr');
  });
});
