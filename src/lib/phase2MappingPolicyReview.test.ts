import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const policyPath = resolve(process.cwd(), 'docs/phase2-canonical-mapping-policy-review.md');
const templatePath = resolve(process.cwd(), 'docs/phase2-canonical-mapping-decision-template.md');
const acceptancePath = resolve(
  process.cwd(),
  'docs/phase2-canonical-mapping-acceptance-criteria.md',
);

const policy = readFileSync(policyPath, 'utf8');
const template = readFileSync(templatePath, 'utf8');
const acceptance = readFileSync(acceptancePath, 'utf8');
const combinedDocs = [policy, template, acceptance].join('\n');

const decisionValues = [
  'APPROVE_ALIAS',
  'SEPARATE_CANONICAL',
  'MANUAL_REVIEW',
  'REJECT_MAPPING',
  'NEEDS_EVIDENCE',
] as const;

function changedFiles() {
  const committed = execFileSync('git', ['diff', '--name-only', 'origin/main...HEAD'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  const untracked = execFileSync('git', ['ls-files', '--others', '--exclude-standard'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });

  return [...new Set(`${committed}\n${untracked}`
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean))];
}

describe('Phase 2-2 mapping policy review contract', () => {
  it('documents that substring-only automatic matching is prohibited', () => {
    expect(policy).toMatch(/substring-only automatic matching is prohibited/i);
    expect(policy).toMatch(/review flag/i);
  });

  it('records the PR #17 dry-run assessment', () => {
    expect(policy).toContain('DRYRUN_REVIEW_REQUIRED');
    expect(policy).toContain('dangerous_substring_pair_count = 487');
    expect(policy).toContain('risk_or_allergen_review_count = 148');
  });

  it('lists every decision enum value in the decision template and acceptance criteria', () => {
    for (const value of decisionValues) {
      expect(template).toContain(value);
      expect(acceptance).toContain(value);
    }
  });

  it('requires sandbox rehearsal, backup, and approval before migration', () => {
    expect(acceptance).toMatch(/sandbox rehearsal/i);
    expect(acceptance).toMatch(/backup/i);
    expect(acceptance).toMatch(/PITR/i);
    expect(acceptance).toMatch(/approval/i);
  });

  it('keeps prohibited implementation areas out of this PR', () => {
    const files = changedFiles();

    expect(files).toContain('docs/phase2-canonical-mapping-policy-review.md');
    expect(files).toContain('docs/phase2-canonical-mapping-decision-template.md');
    expect(files).toContain('docs/phase2-canonical-mapping-acceptance-criteria.md');
    expect(files).toContain('src/lib/phase2MappingPolicyReview.test.ts');

    for (const file of files) {
      expect(file).toMatch(/^(docs\/phase2-canonical-mapping-|src\/lib\/phase2MappingPolicyReview\.test\.ts$)/);
      expect(file).not.toMatch(/^supabase\/migrations\//);
      expect(file).not.toMatch(/^supabase\/functions\//);
      expect(file).not.toMatch(/^src\/utils\/score\.ts$/);
      expect(file).not.toMatch(/^src\/lib\/supabase\.ts$/);
      expect(file).not.toMatch(/^src\/analysis\//);
    }
  });

  it('does not authorize writes, migrations, runtime changes, or scoring changes', () => {
    expect(combinedDocs).toMatch(/not data migration/i);
    expect(combinedDocs).toMatch(/No database write is authorized/i);
    expect(combinedDocs).toMatch(/must not change runtime scoring behavior/i);
  });
});
