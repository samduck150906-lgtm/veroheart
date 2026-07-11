import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const runbookPath = resolve(process.cwd(), 'docs/phase2-alias-sandbox-rehearsal-runbook.md');
const rehearsalPath = resolve(
  process.cwd(),
  'supabase/tests/manual/phase2_alias_sandbox_rehearsal.sql',
);
const verifyPath = resolve(process.cwd(), 'supabase/tests/manual/phase2_alias_sandbox_verify.sql');
const rollbackPath = resolve(
  process.cwd(),
  'supabase/tests/manual/phase2_alias_sandbox_rollback.sql',
);

const runbook = readFileSync(runbookPath, 'utf8');
const rehearsalSql = readFileSync(rehearsalPath, 'utf8');
const verifySql = readFileSync(verifyPath, 'utf8');
const rollbackSql = readFileSync(rollbackPath, 'utf8');
const allSql = [rehearsalSql, verifySql, rollbackSql].join('\n');

const approvedKeys = [
  '건조비트펄프',
  '오메가3지방산',
  '감자전분',
  '건조맥주효모',
  '녹차추출물',
  '맥주효모',
  '비타민e',
  '비트펄프',
  '오메가6지방산',
  '코코넛오일',
  '타피오카전분',
  '토마토박',
  '프락토올리고당',
  '혼합토코페롤',
] as const;

const excludedKeys = [
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

function cteBody(sql: string, cteName: string, nextCteName: string) {
  const pattern = new RegExp(`${cteName}\\([^)]*\\) AS \\(\\s*VALUES([\\s\\S]*?)\\n\\),\\n${nextCteName}`);
  const match = sql.match(pattern);
  expect(match, `missing CTE ${cteName}`).not.toBeNull();
  return match?.[1] ?? '';
}

describe('Phase 2 alias sandbox rehearsal kit', () => {
  it('includes runbook, rehearsal, verify, and rollback files', () => {
    expect(existsSync(runbookPath)).toBe(true);
    expect(existsSync(rehearsalPath)).toBe(true);
    expect(existsSync(verifyPath)).toBe(true);
    expect(existsSync(rollbackPath)).toBe(true);
  });

  it('marks every SQL file as sandbox-only and forbidden on production', () => {
    for (const sql of [rehearsalSql, verifySql, rollbackSql]) {
      expect(sql).toContain('SANDBOX ONLY');
      expect(sql).toContain('DO NOT RUN ON PRODUCTION');
      expect(sql).toContain('nlutpmjloryqdomgbqrr');
    }
    expect(runbook).toContain('sandbox-only');
    expect(runbook).toContain('nlutpmjloryqdomgbqrr');
  });

  it('requires a sandbox confirmation guard for write SQL without setting it inside the files', () => {
    for (const sql of [rehearsalSql, rollbackSql]) {
      expect(sql).toContain("current_setting('app.phase2_alias_sandbox_rehearsal_confirm', true)");
      expect(sql).toContain('SANDBOX_ONLY_CONFIRMED_NOT_PRODUCTION');
      expect(sql).not.toMatch(/^\s*SET\s+app\.phase2_alias_sandbox_rehearsal_confirm\b/im);
    }
    expect(runbook).toContain(
      "SET app.phase2_alias_sandbox_rehearsal_confirm = 'SANDBOX_ONLY_CONFIRMED_NOT_PRODUCTION';",
    );
  });

  it('mentions the production ref only as a forbidden target', () => {
    for (const line of allSql.split('\n').filter((entry) => entry.includes('nlutpmjloryqdomgbqrr'))) {
      expect(line).toMatch(/Forbidden|DO NOT RUN ON PRODUCTION/i);
      expect(line).not.toMatch(/https:\/\/nlutpmjloryqdomgbqrr\.supabase\.co/i);
    }
  });

  it('rehearses exactly the approved 14 normalized keys', () => {
    const approvedCanonicalBody = cteBody(
      rehearsalSql,
      'approved_canonical_candidates',
      'approved_alias_candidates',
    );

    for (const key of approvedKeys) {
      expect(approvedCanonicalBody).toContain(key);
      expect(verifySql).toContain(key);
      expect(rollbackSql).toContain(key);
    }
    expect([...approvedCanonicalBody.matchAll(/\('([^']+)',\s*'[^']+'\)/g)]).toHaveLength(14);
  });

  it('keeps excluded animal, allergen, additive, and risk candidates out of rehearsal inserts', () => {
    const approvedCanonicalBody = cteBody(
      rehearsalSql,
      'approved_canonical_candidates',
      'approved_alias_candidates',
    );
    const approvedAliasBody = cteBody(rehearsalSql, 'approved_alias_candidates', 'inserted_canonical');

    for (const key of excludedKeys) {
      expect(approvedCanonicalBody).not.toContain(key);
      expect(approvedAliasBody).not.toContain(key);
      expect(verifySql).toContain(key);
    }
  });

  it('does not insert risk rules, allergen mappings, or product label rows', () => {
    expect(rehearsalSql).not.toMatch(
      /INSERT\s+INTO\s+public\.(?:canonical_analysis_rules|canonical_ingredient_allergen_map|product_ingredient_label_sets|product_ingredient_label_items)\b/i,
    );
    expect(rehearsalSql).not.toContain('risk_level');
    expect(rehearsalSql).not.toContain('allergen_id');
    expect(rehearsalSql).not.toContain('product_ingredient_label');
  });

  it('blocks unmarked canonical conflicts and inserts aliases only against marker-owned rows', () => {
    expect(rehearsalSql).toContain('preexisting_unmarked_canonical');
    expect(rehearsalSql).toMatch(/WHERE\s+NOT\s+EXISTS\s*\(\s*SELECT\s+1\s+FROM\s+preexisting_unmarked_canonical\s*\)/i);
    expect(rehearsalSql).toContain('marker_owned_canonical');
    expect(rehearsalSql).toMatch(/JOIN\s+marker_owned_canonical\s+moc/i);
    expect(rehearsalSql).toContain("ci.category = 'phase2_low_risk_alias_rehearsal'");
    expect(rehearsalSql).toContain(
      "ci.description = 'SANDBOX ONLY Phase 2 low-risk alias rehearsal marker. DO NOT RUN ON PRODUCTION nlutpmjloryqdomgbqrr.'",
    );
    expect(runbook).toMatch(/does not attach aliases to unmarked preexisting canonical rows/i);
  });

  it('verifies approved keys, excluded keys, and forbidden related tables', () => {
    for (const key of approvedKeys) {
      expect(verifySql).toContain(key);
    }
    for (const key of excludedKeys) {
      expect(verifySql).toContain(key);
    }
    expect(verifySql).toContain('canonical_analysis_rules');
    expect(verifySql).toContain('canonical_ingredient_allergen_map');
    expect(verifySql).toContain('product_ingredient_label_items');
    expect(verifySql).toContain('product_ingredient_label_sets');
    expect(verifySql).toContain('preexisting_unmarked_canonical');
    expect(verifySql).toContain('preexisting_unmarked_canonical_count');
    expect(verifySql).toContain('SANDBOX_REHEARSAL_VERIFIED');
    expect(verifySql).toContain('SANDBOX_REHEARSAL_FAILED');
  });

  it('limits rollback by sandbox marker and approved keys', () => {
    expect(rollbackSql).toContain('phase2_low_risk_alias_rehearsal');
    expect(rollbackSql).toContain('approved_canonical_candidates');
    expect(rollbackSql).toContain('sandbox-phase2-low-risk-alias-rehearsal-2026-07-11');
    expect(rollbackSql).toContain('marked_canonical');
    expect(rollbackSql).toContain("ci.category = 'phase2_low_risk_alias_rehearsal'");
    expect(rollbackSql).toMatch(/DELETE\s+FROM\s+public\.canonical_ingredient_aliases/i);
    expect(rollbackSql).toMatch(/DELETE\s+FROM\s+public\.canonical_ingredients/i);
    expect(rollbackSql).toContain('SANDBOX_REHEARSAL_ROLLED_BACK');
  });

  it('keeps runtime, scoring, and Edge Function paths out of the sandbox kit', () => {
    const kitText = [runbook, allSql].join('\n');
    expect(kitText).not.toMatch(/src\/utils\/score\.ts|src\/lib\/supabase\.ts|supabase\/functions\//);
    expect(runbook).toMatch(/runtime, scoring, or Edge Function changes/i);
  });
});
