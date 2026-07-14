import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const runbookPath = resolve(process.cwd(), 'docs/phase2-low-risk-alias-production-candidate-runbook.md');
const preflightPath = resolve(
  process.cwd(),
  'supabase/tests/manual/phase2_alias_production_preflight.sql',
);
const applyPath = resolve(
  process.cwd(),
  'supabase/tests/manual/phase2_alias_production_apply_candidate.sql',
);
const verifyPath = resolve(
  process.cwd(),
  'supabase/tests/manual/phase2_alias_production_verify_candidate.sql',
);
const rollbackPath = resolve(
  process.cwd(),
  'supabase/tests/manual/phase2_alias_production_rollback_candidate.sql',
);

const runbook = readFileSync(runbookPath, 'utf8');
const preflightSql = readFileSync(preflightPath, 'utf8');
const applySql = readFileSync(applyPath, 'utf8');
const verifySql = readFileSync(verifyPath, 'utf8');
const rollbackSql = readFileSync(rollbackPath, 'utf8');
const allCandidateText = [runbook, preflightSql, applySql, verifySql, rollbackSql].join('\n');

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

const productionCategory = 'phase2_low_risk_alias_seed_2026_07_12';
const productionDescription =
  'Production candidate Phase 2 low-risk alias seed. Sandbox verified in PR #23. No risk/scoring semantics.';
const productionVersion = 'phase2-low-risk-alias-seed-2026-07-12';
const productionAnalysisDescription =
  'Production candidate marker for Phase 2 low-risk alias seed. Sandbox verified in PR #23. No risk/scoring semantics.';

function insertValuesBody(sql: string, tableName: string) {
  const pattern = new RegExp(`INSERT INTO ${tableName}[\\s\\S]*?\\)\\s*VALUES([\\s\\S]*?);`);
  const match = sql.match(pattern);
  expect(match, `missing VALUES insert for ${tableName}`).not.toBeNull();
  return match?.[1] ?? '';
}

function filesUnder(pathFromRoot: string) {
  const root = resolve(process.cwd(), pathFromRoot);
  if (!existsSync(root)) return [];

  const results: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const fullPath = join(dir, entry);
      const stats = statSync(fullPath);
      if (stats.isDirectory()) {
        walk(fullPath);
      } else {
        results.push(fullPath);
      }
    }
  };
  walk(root);
  return results;
}

describe('Phase 2 low-risk alias production candidate kit', () => {
  it('includes runbook, preflight, apply, verify, rollback, and test files', () => {
    for (const filePath of [runbookPath, preflightPath, applyPath, verifyPath, rollbackPath]) {
      expect(existsSync(filePath)).toBe(true);
    }
    expect(existsSync(resolve(process.cwd(), 'src/lib/phase2AliasProductionCandidate.test.ts'))).toBe(
      true,
    );
  });

  it('requires both production confirmation settings for write SQL without setting them internally', () => {
    for (const sql of [applySql, rollbackSql]) {
      expect(sql).toContain(
        "current_setting('app.phase2_alias_production_project_ref_confirm', true)",
      );
      expect(sql).toContain(
        "current_setting('app.phase2_alias_production_migration_confirm', true)",
      );
      expect(sql).toContain('nlutpmjloryqdomgbqrr');
      expect(sql).toContain('PRODUCTION_ALIAS_MIGRATION_EXPLICITLY_APPROVED');
      expect(sql).not.toMatch(/^\s*SET\s+app\.phase2_alias_production_/im);
    }
    expect(runbook).toContain(
      "SET app.phase2_alias_production_project_ref_confirm = 'nlutpmjloryqdomgbqrr';",
    );
    expect(runbook).toContain(
      "SET app.phase2_alias_production_migration_confirm = 'PRODUCTION_ALIAS_MIGRATION_EXPLICITLY_APPROVED';",
    );
  });

  it('keeps the production ref as a confirmation value only, not a URL or secret', () => {
    expect(allCandidateText).toContain('nlutpmjloryqdomgbqrr');
    expect(allCandidateText).not.toMatch(/https?:\/\/nlutpmjloryqdomgbqrr\.supabase\.co/i);
    expect(allCandidateText).not.toMatch(/(?:anon[_-]?key|service[_-]?role|access[_-]?token|password|secret[_-]?key)/i);
  });

  it('uses the production marker and not the sandbox rehearsal marker', () => {
    for (const sql of [preflightSql, applySql, verifySql, rollbackSql]) {
      expect(sql).toContain(productionCategory);
      expect(sql).toContain(productionDescription);
      expect(sql).not.toContain('phase2_low_risk_alias_rehearsal');
      expect(sql).not.toContain('sandbox-phase2-low-risk-alias-rehearsal-2026-07-11');
    }
    expect(applySql).toContain(productionVersion);
    expect(rollbackSql).toContain(productionVersion);
    expect(allCandidateText).toContain(productionAnalysisDescription);
  });

  it('detects exact analysis_engine_versions marker conflicts', () => {
    for (const sql of [preflightSql, applySql, verifySql, rollbackSql]) {
      expect(sql).toContain('analysis_marker_conflict_count');
      expect(sql).toContain('phase2-low-risk-alias-seed-2026-07-12');
      expect(sql).toContain(productionAnalysisDescription);
      expect(sql).toContain("aev.status = 'draft'");
      expect(sql).toContain("aev.ruleset_checksum = 'phase2-low-risk-alias-seed-2026-07-12'");
    }
    for (const sql of [preflightSql, applySql, verifySql]) {
      expect(sql).toContain('analysis_marker_exact_count');
    }
    expect(applySql).toMatch(/RAISE EXCEPTION[\s\S]*marker conflicts/i);
    expect(rollbackSql).toContain('phase2_alias_production_rollback_analysis_marker_conflicts');
  });

  it('applies exactly the approved 14 canonical candidates and 30 aliases', () => {
    const canonicalBody = insertValuesBody(
      applySql,
      'phase2_alias_production_approved_canonical_candidates',
    );
    const aliasBody = insertValuesBody(
      applySql,
      'phase2_alias_production_approved_alias_candidates',
    );

    for (const key of approvedKeys) {
      expect(canonicalBody).toContain(key);
      expect(preflightSql).toContain(key);
      expect(verifySql).toContain(key);
      expect(rollbackSql).toContain(key);
    }
    expect([...canonicalBody.matchAll(/\('([^']+)',\s*'[^']+'\)/g)]).toHaveLength(14);
    expect([...aliasBody.matchAll(/\('([^']+)',\s*'[^']+',\s*'[^']+',\s*(?:true|false)\)/g)]).toHaveLength(30);
  });

  it('requires exact canonical name, category, description, and draft status for canonical counts', () => {
    for (const sql of [preflightSql, applySql, verifySql]) {
      expect(sql).toContain('marker_owned_canonical_mismatch_count');
      expect(sql).toContain('marker_owned_canonical_mismatch');
      expect(sql).toContain('canonical_name_ko');
      expect(sql).toContain(productionCategory);
      expect(sql).toContain(productionDescription);
      expect(sql).toContain("ci.status = 'draft'");
    }
    expect(applySql).toMatch(/RAISE EXCEPTION[\s\S]*canonical mismatches/i);
    expect(applySql).toContain('inserted_or_available_canonical_count');
    expect(verifySql).toContain('canonical_found_count');
  });

  it('requires exact alias text, normalized alias, language, type, and preferred flag for alias counts', () => {
    for (const sql of [preflightSql, applySql, verifySql]) {
      expect(sql).toContain('marker_owned_alias_mismatch_count');
      expect(sql).toContain('marker_owned_alias_mismatch');
      expect(sql).toContain('alias_text');
      expect(sql).toContain('normalized_alias');
      expect(sql).toContain("cia.language_code = 'ko'");
      expect(sql).toContain("cia.alias_type = 'label'");
      expect(sql).toContain('is_preferred');
    }
    expect(applySql).toMatch(/RAISE EXCEPTION[\s\S]*alias mismatches/i);
    expect(applySql).toContain('inserted_or_available_alias_count');
    expect(verifySql).toContain('alias_found_count');
  });

  it('does not insert excluded animal, allergen, additive, or risk candidates', () => {
    const canonicalBody = insertValuesBody(
      applySql,
      'phase2_alias_production_approved_canonical_candidates',
    );
    const aliasBody = insertValuesBody(
      applySql,
      'phase2_alias_production_approved_alias_candidates',
    );

    for (const key of excludedKeys) {
      expect(canonicalBody).not.toContain(key);
      expect(aliasBody).not.toContain(key);
      expect(verifySql).toContain(key);
    }
  });

  it('does not insert risk, allergen, evidence, product label, or review queue rows', () => {
    expect(applySql).not.toMatch(
      /INSERT\s+INTO\s+public\.(?:canonical_analysis_rules|canonical_ingredient_allergen_map|canonical_ingredient_evidence|product_ingredient_label_sets|product_ingredient_label_items|canonical_ingredient_review_queue)\b/i,
    );
    expect(applySql).not.toContain('risk_level');
    expect(applySql).not.toContain('allergen_id');
    expect(applySql).not.toContain('product_ingredient_label');
    expect(applySql).not.toMatch(/INSERT[\s\S]*canonical_ingredient_review_queue/i);
  });

  it('inserts aliases only against marker-owned canonical rows', () => {
    expect(applySql).toContain('phase2_alias_production_marker_owned_canonical');
    expect(applySql).toMatch(/JOIN\s+phase2_alias_production_marker_owned_canonical\s+moc/i);
    expect(applySql).toContain(productionCategory);
    expect(applySql).toContain(productionDescription);
    expect(applySql).toContain('phase2_alias_production_preexisting_unmarked_canonical');
    expect(applySql).toContain('phase2_alias_production_preexisting_alias_conflicts');
  });

  it('keeps rollback marker-limited and blocks when forbidden related rows exist', () => {
    expect(rollbackSql).toContain('phase2_alias_production_rollback_marker_owned_canonical');
    expect(rollbackSql).toContain('phase2_alias_production_rollback_forbidden_related_rows');
    for (const relation of [
      'canonical_analysis_rules',
      'canonical_ingredient_allergen_map',
      'canonical_ingredient_evidence',
      'product_ingredient_label_items',
      'product_ingredient_label_sets',
      'canonical_ingredient_review_queue',
    ]) {
      expect(rollbackSql).toContain(relation);
    }
    expect(rollbackSql).toMatch(/DELETE\s+FROM\s+public\.canonical_ingredient_aliases/i);
    expect(rollbackSql).toMatch(/DELETE\s+FROM\s+public\.canonical_ingredients/i);
    expect(rollbackSql).toMatch(/NOT\s+EXISTS\s*\(\s*SELECT\s+1\s+FROM\s+phase2_alias_production_rollback_forbidden_related_rows\s*\)/i);
    expect(rollbackSql).toContain('PRODUCTION_ALIAS_SEED_ROLLBACK_BLOCKED');
  });

  it('rolls back only the approved 30 aliases and blocks non-seed marker-owned aliases', () => {
    const rollbackAliasBody = insertValuesBody(
      rollbackSql,
      'phase2_alias_production_rollback_alias_candidates',
    );
    expect([...rollbackAliasBody.matchAll(/\('([^']+)',\s*'[^']+',\s*'[^']+',\s*(?:true|false)\)/g)]).toHaveLength(30);
    expect(rollbackSql).toContain('phase2_alias_production_rollback_alias_delete_targets');
    expect(rollbackSql).toContain('phase2_alias_production_rollback_non_seed_marker_owned_aliases');
    expect(rollbackSql).toContain('non_seed_marker_owned_alias_count');
    expect(rollbackSql).toMatch(/LEFT JOIN\s+phase2_alias_production_rollback_alias_delete_targets\s+target/i);
    expect(rollbackSql).toMatch(/NOT\s+EXISTS\s*\(\s*SELECT\s+1\s+FROM\s+phase2_alias_production_rollback_non_seed_marker_owned_aliases\s*\)/i);
  });

  it('separates DML from final summaries to avoid data-modifying CTE snapshot issues', () => {
    const aliasInsertIndex = applySql.indexOf('INSERT INTO public.canonical_ingredient_aliases');
    const applySummaryIndex = applySql.indexOf("SELECT\n  'phase2_alias_production_apply'");
    expect(aliasInsertIndex).toBeGreaterThan(-1);
    expect(applySummaryIndex).toBeGreaterThan(aliasInsertIndex);
    expect(applySql.slice(applySummaryIndex)).toContain(
      'FROM phase2_alias_production_marker_owned_canonical',
    );
    expect(applySql.slice(applySummaryIndex)).toContain('FROM public.canonical_ingredient_aliases cia');
    expect(applySql).not.toMatch(/^\s*WITH\b[\s\S]*INSERT\s+INTO\s+public\.[\s\S]*inserted_or_available/im);

    const canonicalDeleteIndex = rollbackSql.indexOf('DELETE FROM public.canonical_ingredients');
    const rollbackSummaryIndex = rollbackSql.indexOf("SELECT\n  'phase2_alias_production_rollback'");
    expect(canonicalDeleteIndex).toBeGreaterThan(-1);
    expect(rollbackSummaryIndex).toBeGreaterThan(canonicalDeleteIndex);
    expect(rollbackSql.slice(rollbackSummaryIndex)).toContain('FROM public.canonical_ingredients ci');
    expect(rollbackSql).not.toMatch(/^\s*WITH\b[\s\S]*DELETE\s+FROM\s+public\.[\s\S]*remaining_marker_owned_canonical_count/im);
  });

  it('keeps production candidate markers out of migrations, runtime, scoring, and Edge Function files', () => {
    const forbiddenFiles = [
      ...filesUnder('supabase/migrations'),
      ...filesUnder('supabase/functions'),
      resolve(process.cwd(), 'src/utils/score.ts'),
      resolve(process.cwd(), 'src/lib/supabase.ts'),
    ].filter((filePath) => existsSync(filePath));

    for (const filePath of forbiddenFiles) {
      const content = readFileSync(filePath, 'utf8');
      expect(content).not.toContain(productionCategory);
      expect(content).not.toContain(productionVersion);
    }
  });
});
