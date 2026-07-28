import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const scoreSource = readFileSync(join(process.cwd(), 'src/utils/score.ts'), 'utf8');
const proposalDoc = readFileSync(
  join(process.cwd(), 'docs/phase2-alias-resolver-runtime-proposal-packet-2026-07-28.md'),
  'utf8',
);
const combinedArtifactDoc = readFileSync(
  join(process.cwd(), 'docs/phase2-alias-resolver-combined-review-artifact-2026-07-28.md'),
  'utf8',
);

const appVisibleChangeGates = [
  'product card score',
  'product card badge or pet-type/tag presentation',
  'product card ranking/sorting order',
  'detail-page score or grade',
  'analysis report text',
  'warning text',
  'raw ingredient labels shown to users',
  'recommendation reasons shown to users',
];

describe('Phase 2 alias resolver runtime proposal packet', () => {
  it('keeps the current runtime scoring path disabled while this proposal packet is docs/test-only', () => {
    expect(scoreSource).toContain('flags: { phase2AliasResolver: false }');
    expect(scoreSource).not.toContain('phase2AliasResolver: true');
  });

  it('records the expanded autonomy boundary without approving app-visible changes', () => {
    expect(proposalDoc).toContain('Updated Autonomy Boundary');
    expect(proposalDoc).toContain('Allowed without stopping');
    expect(proposalDoc).toContain('runtime wiring that remains flag-off and behavior-preserving');
    expect(proposalDoc).toContain('Still requires explicit owner approval before merge');
    expect(proposalDoc).toContain('app-visible score changes');
    expect(proposalDoc).toContain('production database writes, rollback, or migration execution');
  });

  it('requires the combined review artifact before any app-visible behavior change', () => {
    expect(proposalDoc).toContain('combined review artifact from PR #46');
    expect(proposalDoc).toContain('score diff summary');
    expect(proposalDoc).toContain('affected report summary');
    expect(proposalDoc).toContain('readiness gate status');
    expect(proposalDoc).toContain('combined review packet');
    expect(combinedArtifactDoc).toContain('Combined Review Artifact Shape');
  });

  it('defines the first non-visible implementation candidate boundary', () => {
    expect(proposalDoc).toContain('First Implementation Candidate Boundary');
    expect(proposalDoc).toContain('extract the currently hard-coded `phase2AliasResolver: false` configuration into a small internal function');
    expect(proposalDoc).toContain('keep that function returning `false`');
    expect(proposalDoc).toContain('do not load env/config/secrets');
    expect(proposalDoc).toContain('do not enable canonical alias scoring');
  });

  it('keeps app-visible changes behind an explicit owner approval gate', () => {
    expect(proposalDoc).toContain('App-Visible Change Gate');
    for (const gate of appVisibleChangeGates) {
      expect(proposalDoc).toContain(gate);
    }
    expect(proposalDoc).toContain('앱 화면 영향 있는 Phase 2 alias resolver 변경 승인');
  });

  it('records that this PR does not approve runtime behavior changes or production operations', () => {
    expect(proposalDoc).toContain('Not allowed in this PR');
    expect(proposalDoc).toContain('enabling the runtime feature flag');
    expect(proposalDoc).toContain('changing score calculations');
    expect(proposalDoc).toContain('changing app-visible labels, cards, detail pages, analysis text, warnings, badges, or ranking');
    expect(proposalDoc).toContain('adding Supabase reads/writes');
    expect(proposalDoc).toContain('adding or modifying migrations');
    expect(proposalDoc).toContain('turning the runtime flag on');
    expect(proposalDoc).toContain('product label row creation');
  });
});
