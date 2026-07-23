import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sqlPath = resolve(process.cwd(), 'supabase/tests/manual/phase2_alias_resolver_dry_run.sql');
const runbookPath = resolve(process.cwd(), 'docs/phase2-alias-resolver-dry-run-runbook.md');

const sql = readFileSync(sqlPath, 'utf8');
const runbook = readFileSync(runbookPath, 'utf8');

const productionCategory = 'phase2_low_risk_alias_seed_2026_07_12';
const productionDescription =
  'Production candidate Phase 2 low-risk alias seed. Sandbox verified in PR #23. No risk/scoring semantics.';

const expectedSections = [
  'seed_summary',
  'legacy_ingredient_exact_alias_matches',
  'legacy_ingredient_unmatched_sample',
  'dangerous_or_excluded_collision_check',
  'ambiguous_many_to_one_or_one_to_many_check',
  'dry_run_assessment',
] as const;

const excludedDangerousTerms = [
  '닭간',
  '닭간분말',
  '닭연골',
  '닭지방',
  '동물성지방',
  '소르빈산칼륨',
  '증점다당류',
  '천연색소',
  '프로필렌글리콜',
  '향미증진제',
] as const;

function executableSql(source: string) {
  return source
    .replace(/--.*$/gm, '')
    .replace(/'(?:''|[^'])*'/gs, "''")
    .trim();
}

describe('Phase 2 alias resolver dry-run kit', () => {
  it('includes the manual SQL and runbook files', () => {
    expect(existsSync(sqlPath)).toBe(true);
    expect(existsSync(runbookPath)).toBe(true);
  });

  it('is a single read-only CTE SELECT statement', () => {
    const executable = executableSql(sql);
    const statements = executable.split(';').map((part) => part.trim()).filter(Boolean);

    expect(statements).toHaveLength(1);
    expect(statements[0]).toMatch(/^WITH\b/i);
    expect(statements[0]).toMatch(/\bSELECT\b/i);
  });

  it('uses the exact Phase 2 low-risk production seed marker', () => {
    expect(sql).toContain(productionCategory);
    expect(sql).toContain(productionDescription);
    expect(sql).toContain("ci.category = 'phase2_low_risk_alias_seed_2026_07_12'");
    expect(sql).toContain(
      "ci.description = 'Production candidate Phase 2 low-risk alias seed. Sandbox verified in PR #23. No risk/scoring semantics.'",
    );
    expect(sql).toContain("ci.status = 'draft'");
  });

  it('references the expected read tables for alias resolver inspection', () => {
    for (const expected of [
      'canonical_ingredients',
      'canonical_ingredient_aliases',
      'ingredients',
      'product_ingredients',
    ]) {
      expect(sql).toContain(expected);
    }
  });

  it('does not contain executable write, temp, schema, or transaction statements', () => {
    const executable = executableSql(sql);

    expect(executable).not.toMatch(
      /\b(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM|MERGE|UPSERT|CREATE\s+TABLE|CREATE\s+TEMP|DROP\s+TABLE|ALTER\s+TABLE|TRUNCATE)\b/i,
    );
    expect(executable).not.toMatch(/\b(?:BEGIN|COMMIT)\s*;/i);
    expect(executable).not.toMatch(/\b(?:CALL|DO|EXECUTE)\b/i);
  });

  it('does not reference migrations, env files, or key material', () => {
    expect(sql).not.toContain('supabase/migrations');
    expect(sql).not.toContain('.env');
    expect(sql).not.toMatch(/\bservice_role\b/i);
    expect(sql).not.toMatch(/\banon key\b/i);
    expect(sql).not.toMatch(/\baccess token\b/i);
  });

  it('uses exact normalized matching and rejects substring-only resolver semantics', () => {
    expect(sql).toContain('alias_match_key = li.legacy_match_key');
    expect(sql).not.toMatch(/\bstrpos\s*\(/i);
    expect(sql).not.toMatch(/\bposition\s*\(/i);
    expect(sql).not.toMatch(/substring-only matching/i);
  });

  it('includes every excluded or dangerous collision term', () => {
    for (const term of excludedDangerousTerms) {
      expect(sql).toContain(term);
    }
  });

  it('returns the expected dry-run sections and assessment states', () => {
    for (const section of expectedSections) {
      expect(sql).toContain(section);
    }
    for (const assessment of ['DRY_RUN_READY', 'DRY_RUN_REVIEW_REQUIRED', 'DRY_RUN_BLOCKED']) {
      expect(sql).toContain(assessment);
    }
  });

  it('returns the standard human-readable result columns', () => {
    expect(sql).toMatch(
      /SELECT\s+all_rows\.section,\s*all_rows\.severity,\s*all_rows\.metric_name,\s*all_rows\.metric_value,\s*all_rows\.detail,\s*all_rows\.recommended_action\s+FROM all_rows/is,
    );
  });

  it('documents read-only resolver workflow and stop conditions', () => {
    for (const expected of [
      'read-only',
      'no runtime/scoring changes',
      'no production write',
      'PRODUCTION_ALIAS_SEED_VERIFIED',
      'dangerous/excluded collision count > 0',
      'ambiguous mapping count > 0',
    ]) {
      expect(runbook).toContain(expected);
    }
    for (const section of expectedSections) {
      expect(runbook).toContain(section);
    }
  });
});
