import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const scoreSource = readFileSync(join(process.cwd(), 'src/utils/score.ts'), 'utf8');
const readinessDoc = readFileSync(
  join(process.cwd(), 'docs/phase2-alias-resolver-behavior-change-readiness-gate-2026-07-28.md'),
  'utf8',
);
const scoreDiffDoc = readFileSync(
  join(process.cwd(), 'docs/phase2-alias-resolver-score-diff-harness-2026-07-28.md'),
  'utf8',
);
const affectedReportDoc = readFileSync(
  join(process.cwd(), 'docs/phase2-alias-resolver-affected-report-harness-2026-07-28.md'),
  'utf8',
);

describe('Phase 2 alias resolver behavior-change readiness gate', () => {
  it('keeps the current runtime scoring path disabled while this gate is docs/test-only', () => {
    expect(scoreSource).toContain('flags: { phase2AliasResolver: isPhase2AliasResolverRuntimeEnabled() }');
    expect(scoreSource).not.toContain('phase2AliasResolver: true');
  });

  it('requires the score diff harness before any behavior-changing merge', () => {
    expect(readinessDoc).toContain('Required Score Diff Gate');
    expect(readinessDoc).toContain('src/lib/phase2AliasResolverScoreDiffHarness.test.ts');
    expect(readinessDoc).toContain('docs/phase2-alias-resolver-score-diff-harness-2026-07-28.md');
    expect(readinessDoc).toContain('score before');
    expect(readinessDoc).toContain('score after');
    expect(readinessDoc).toContain('score delta');
    expect(readinessDoc).toContain('Product-by-product rows are required');
    expect(scoreDiffDoc).toContain('score changed rows');
    expect(scoreDiffDoc).toContain('raw labels preserved');
  });

  it('requires the affected product and ingredient report before runtime enablement', () => {
    expect(readinessDoc).toContain('Required Affected Product/Ingredient Gate');
    expect(readinessDoc).toContain('src/lib/phase2AliasResolverAffectedReportHarness.test.ts');
    expect(readinessDoc).toContain('docs/phase2-alias-resolver-affected-report-harness-2026-07-28.md');
    expect(readinessDoc).toContain('matched sidecar candidates');
    expect(readinessDoc).toContain('unmatched labels');
    expect(readinessDoc).toContain('blocked labels');
    expect(readinessDoc).toContain('ambiguous labels');
    expect(affectedReportDoc).toContain('products with matched candidates');
    expect(affectedReportDoc).toContain('score impact allowed rows');
  });

  it('requires blocked, ambiguous, unmatched, and unknown safety fallbacks', () => {
    expect(readinessDoc).toContain('blocked rows preserve raw labels, require review, and have no positive score effect');
    expect(readinessDoc).toContain('ambiguous rows preserve raw labels, require manual review, and have no positive score effect');
    expect(readinessDoc).toContain('unmatched rows preserve raw labels and existing behavior');
    expect(readinessDoc).toContain('unknown or review-only results never become safe-by-default');
    expect(readinessDoc).toContain('No blocked or ambiguous row creates a positive score effect');
    expect(readinessDoc).toContain('No unknown or review-only row becomes safe-by-default');
  });

  it('requires disable, rollback, display/ranking review, and explicit owner approval', () => {
    expect(readinessDoc).toContain('Disable strategy is documented');
    expect(readinessDoc).toContain('Rollback strategy is documented');
    expect(readinessDoc).toContain('Display verdict changes are listed');
    expect(readinessDoc).toContain('Ranking changes are listed');
    expect(readinessDoc).toContain('Explicit Owner Approval Gate');
    expect(readinessDoc).toContain('PR #[number] Phase 2 alias resolver behavior change 승인');
    expect(readinessDoc).toContain('점수 영향 diff 확인');
    expect(readinessDoc).toContain('affected report 확인');
    expect(readinessDoc).toContain('rollback/disable 전략 확인');
  });

  it('records that this PR does not approve runtime behavior changes or production operations', () => {
    expect(readinessDoc).toContain('Not allowed');
    expect(readinessDoc).toContain('enabling the runtime feature flag');
    expect(readinessDoc).toContain('changing score calculations');
    expect(readinessDoc).toContain('using canonical aliases as safety decisions');
    expect(readinessDoc).toContain('adding Supabase reads/writes');
    expect(readinessDoc).toContain('adding or modifying migrations');
    expect(readinessDoc).toContain('turning the runtime flag on');
    expect(readinessDoc).toContain('product label row creation');
  });
});
