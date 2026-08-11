import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const scoreSource = readFileSync(join(process.cwd(), 'src/utils/score.ts'), 'utf8');
const proposalDoc = readFileSync(
  join(process.cwd(), 'docs/phase2-alias-resolver-flag-on-behavior-change-proposal-2026-07-28.md'),
  'utf8',
);

describe('Phase 2 alias resolver flag-on behavior change proposal guard', () => {
  it('keeps the current runtime scoring path disabled while this proposal is docs/test-only', () => {
    expect(scoreSource).toContain('flags: { phase2AliasResolver: isPhase2AliasResolverRuntimeEnabled() }');
    expect(scoreSource).not.toContain('phase2AliasResolver: true');
  });

  it('records the owner-approved proposal-only scope', () => {
    expect(proposalDoc).toContain('PR #42 flag-on behavior change proposal 진행 승인');
    expect(proposalDoc).toContain('실제 feature flag ON, 점수 변경, 운영 DB 작업 없이');
    expect(proposalDoc).toContain('Not allowed in this PR');
    expect(proposalDoc).toContain('enabling the runtime feature flag');
    expect(proposalDoc).toContain('changing scores');
    expect(proposalDoc).toContain('adding Supabase reads or writes');
    expect(proposalDoc).toContain('adding or modifying migrations');
  });

  it('requires before/after score diffs before any future behavior-changing PR', () => {
    expect(proposalDoc).toContain('Mandatory Before/After Score Diff');
    expect(proposalDoc).toContain('score before');
    expect(proposalDoc).toContain('score after');
    expect(proposalDoc).toContain('score delta');
    expect(proposalDoc).toContain('grade before');
    expect(proposalDoc).toContain('grade after');
    expect(proposalDoc).toContain('products upgraded to A/B');
    expect(proposalDoc).toContain('products downgraded to D/F');
  });

  it('requires affected product and ingredient reporting before runtime enablement', () => {
    expect(proposalDoc).toContain('Mandatory Affected Product/Ingredient Report');
    expect(proposalDoc).toContain('matched sidecar candidates');
    expect(proposalDoc).toContain('unmatched labels');
    expect(proposalDoc).toContain('blocked labels');
    expect(proposalDoc).toContain('ambiguous labels');
    expect(proposalDoc).toContain('labels that would change score inputs');
    expect(proposalDoc).toContain('labels that would change displayed score or grade');
  });

  it('keeps blocked, ambiguous, and unknown results review-only and not safe-by-default', () => {
    expect(proposalDoc).toContain('Blocked and Ambiguous Fallback');
    expect(proposalDoc).toContain('blocked');
    expect(proposalDoc).toContain('ambiguous');
    expect(proposalDoc).toContain('no positive score effect');
    expect(proposalDoc).toContain('Unknown or review-only results must remain insufficient/review-only, not safe-by-default.');
    expect(proposalDoc).toContain('must never become safe-by-default');
  });

  it('requires disable and rollback strategy before any future behavior-changing merge', () => {
    expect(proposalDoc).toContain('Disable Strategy');
    expect(proposalDoc).toContain('Rollback Strategy');
    expect(proposalDoc).toContain('feature flag can be turned off');
    expect(proposalDoc).toContain('Verify scores return to the pre-change baseline');
    expect(proposalDoc).toContain('Owner Approval Gate');
  });
});
