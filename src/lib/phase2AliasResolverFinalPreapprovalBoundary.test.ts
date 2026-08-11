import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const boundaryDoc = readFileSync(
  join(process.cwd(), 'docs/phase2-alias-resolver-final-preapproval-boundary-2026-08-11.md'),
  'utf8',
);
const scoreSource = readFileSync(join(process.cwd(), 'src/utils/score.ts'), 'utf8');

const visibleSurfaces = [
  'product-card score',
  'detail-page score',
  'analysis text',
  'warning text',
  'ranking/sorting',
  'ingredient label replacement',
];

const blockedNextSteps = [
  'runtime flag enablement',
  'canonical alias scoring',
  'score calculation changes',
  'visible label replacement',
  'recommendation/ranking changes',
  'Supabase production operations',
  'SQL changes',
  'migrations',
  'env/secrets/deploy changes',
];

describe('Phase 2 alias resolver final pre-approval boundary', () => {
  it('keeps runtime score integration disabled in score.ts', () => {
    expect(scoreSource).toContain('isPhase2AliasResolverRuntimeEnabled()');
    expect(scoreSource).not.toContain('phase2AliasResolver: true');
  });

  it('documents app-visible surfaces that require owner approval', () => {
    for (const surface of visibleSurfaces) {
      expect(boundaryDoc).toContain(surface);
    }
    expect(boundaryDoc).toContain('requires explicit owner approval');
  });

  it('documents blocked next steps that this PR does not approve', () => {
    for (const step of blockedNextSteps) {
      expect(boundaryDoc).toContain(step);
    }
  });

  it('requires diff, affected report, rollback, and disable strategy for the next app-visible PR', () => {
    expect(boundaryDoc).toContain('before/after score diff');
    expect(boundaryDoc).toContain('affected product/ingredient report');
    expect(boundaryDoc).toContain('rollback');
    expect(boundaryDoc).toContain('emergency disable');
  });
});
