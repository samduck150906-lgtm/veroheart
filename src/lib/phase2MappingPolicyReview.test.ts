import { existsSync, readFileSync } from 'node:fs';
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

describe('Phase 2-2 mapping policy review contract', () => {
  it('keeps the policy review kit files present in the repository', () => {
    expect(existsSync(policyPath)).toBe(true);
    expect(existsSync(templatePath)).toBe(true);
    expect(existsSync(acceptancePath)).toBe(true);
    expect(existsSync(resolve(process.cwd(), 'src/lib/phase2MappingPolicyReview.test.ts'))).toBe(
      true,
    );
  });

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

  it('does not authorize writes, migrations, runtime, scoring, Edge Function, or production Supabase actions', () => {
    expect(combinedDocs).toMatch(/not data migration/i);
    expect(combinedDocs).toMatch(/No database write is authorized/i);
    expect(combinedDocs).toMatch(/does not authorize migration changes/i);
    expect(combinedDocs).toMatch(/must not change runtime scoring behavior/i);
    expect(combinedDocs).toMatch(/runtime or scoring changes/i);
    expect(combinedDocs).toMatch(/Edge Function changes/i);
    expect(combinedDocs).toMatch(/does not require operating Supabase access or SQL execution/i);
    expect(combinedDocs).toMatch(/next step is mapping policy review, not data migration/i);
  });
});
