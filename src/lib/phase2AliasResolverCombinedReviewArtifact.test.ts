import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const scoreSource = readFileSync(join(process.cwd(), 'src/utils/score.ts'), 'utf8');
const combinedDoc = readFileSync(
  join(process.cwd(), 'docs/phase2-alias-resolver-combined-review-artifact-2026-07-28.md'),
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
const readinessDoc = readFileSync(
  join(process.cwd(), 'docs/phase2-alias-resolver-behavior-change-readiness-gate-2026-07-28.md'),
  'utf8',
);

const combinedReviewArtifactFixture = {
  scoreDiff: {
    productsSampled: 2,
    rows: 8,
    scoreChangedRows: 0,
    scoreChangedProducts: 0,
    maxPositiveDelta: 0,
    maxNegativeDelta: 0,
    rawLabelsPreserved: 8,
    reviewRequiredRows: 5,
  },
  affectedReport: {
    productsSampled: 4,
    ingredientRows: 16,
    matchedRows: 7,
    unmatchedRows: 4,
    blockedRows: 4,
    ambiguousRows: 1,
    reviewRequiredRows: 9,
    productsWithMatchedCandidates: 4,
    productsWithReviewRequiredRows: 4,
    productsWithBlockedRows: 3,
    productsWithAmbiguousRows: 1,
    rawLabelsPreserved: 16,
    runtimeChangedRows: 0,
    scoreImpactAllowedRows: 0,
  },
  requiredSections: [
    'Executive summary',
    'Feature flag scope',
    'Before/after score diff table',
    'Affected product/ingredient table',
    'Product-by-product score delta review',
    'A/B upgrade review',
    'D/F downgrade review',
    'Matched sidecar candidate review',
    'Unmatched fallback review',
    'Blocked fallback review',
    'Ambiguous fallback review',
    'Unknown/review-only safety proof',
    'Raw-label and mutation guard proof',
    'Display verdict review',
    'Ranking review',
    'Disable strategy',
    'Rollback strategy',
    'Exact owner approval text',
  ],
};

describe('Phase 2 alias resolver combined non-runtime review artifact', () => {
  it('keeps the current runtime scoring path disabled while this artifact is docs/test-only', () => {
    expect(scoreSource).toContain('flags: { phase2AliasResolver: isPhase2AliasResolverRuntimeEnabled() }');
    expect(scoreSource).not.toContain('phase2AliasResolver: true');
  });

  it('combines the score diff, affected report, and readiness gate sources', () => {
    expect(combinedDoc).toContain('docs/phase2-alias-resolver-score-diff-harness-2026-07-28.md');
    expect(combinedDoc).toContain('docs/phase2-alias-resolver-affected-report-harness-2026-07-28.md');
    expect(combinedDoc).toContain('docs/phase2-alias-resolver-behavior-change-readiness-gate-2026-07-28.md');
    expect(scoreDiffDoc).toContain('score changed rows');
    expect(affectedReportDoc).toContain('score impact allowed rows');
    expect(readinessDoc).toContain('Required Inputs Before Behavior Change');
  });

  it('records the combined fixed-fixture summaries without behavior changes', () => {
    expect(combinedReviewArtifactFixture.scoreDiff).toEqual({
      productsSampled: 2,
      rows: 8,
      scoreChangedRows: 0,
      scoreChangedProducts: 0,
      maxPositiveDelta: 0,
      maxNegativeDelta: 0,
      rawLabelsPreserved: 8,
      reviewRequiredRows: 5,
    });
    expect(combinedReviewArtifactFixture.affectedReport).toEqual({
      productsSampled: 4,
      ingredientRows: 16,
      matchedRows: 7,
      unmatchedRows: 4,
      blockedRows: 4,
      ambiguousRows: 1,
      reviewRequiredRows: 9,
      productsWithMatchedCandidates: 4,
      productsWithReviewRequiredRows: 4,
      productsWithBlockedRows: 3,
      productsWithAmbiguousRows: 1,
      rawLabelsPreserved: 16,
      runtimeChangedRows: 0,
      scoreImpactAllowedRows: 0,
    });
    expect(combinedDoc).toContain('| score changed rows | 0 |');
    expect(combinedDoc).toContain('| runtime changed rows | 0 |');
    expect(combinedDoc).toContain('| score impact allowed rows | 0 |');
  });

  it('requires a complete review packet before any future behavior-changing merge', () => {
    for (const section of combinedReviewArtifactFixture.requiredSections) {
      expect(combinedDoc).toContain(section);
    }
    expect(combinedDoc).toContain('every score delta is visible product-by-product');
    expect(combinedDoc).toContain('every A/B upgrade is explicitly listed');
    expect(combinedDoc).toContain('every D/F downgrade is explicitly listed');
    expect(combinedDoc).toContain('owner approval text is present and matches the exact behavior-changing scope');
  });

  it('keeps blocked, ambiguous, unmatched, and unknown rows review-only in the combined gate', () => {
    expect(combinedDoc).toContain('blocked rows preserve raw labels, require review, and have no positive score effect');
    expect(combinedDoc).toContain('ambiguous rows preserve raw labels, require manual review, and have no positive score effect');
    expect(combinedDoc).toContain('unmatched rows preserve raw labels and existing behavior');
    expect(combinedDoc).toContain('unknown or review-only rows never become safe-by-default');
  });

  it('records that this PR does not approve runtime behavior changes or production operations', () => {
    expect(combinedDoc).toContain('Not allowed');
    expect(combinedDoc).toContain('enabling the runtime feature flag');
    expect(combinedDoc).toContain('changing score calculations');
    expect(combinedDoc).toContain('using canonical aliases as safety decisions');
    expect(combinedDoc).toContain('adding Supabase reads/writes');
    expect(combinedDoc).toContain('adding or modifying migrations');
    expect(combinedDoc).toContain('turning the runtime flag on');
    expect(combinedDoc).toContain('product label row creation');
  });
});
