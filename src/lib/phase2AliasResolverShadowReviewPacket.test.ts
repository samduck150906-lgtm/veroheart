import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const packetDoc = readFileSync(
  join(process.cwd(), 'docs/phase2-alias-resolver-shadow-review-packet-2026-08-11.md'),
  'utf8',
);
const scoreSource = readFileSync(join(process.cwd(), 'src/utils/score.ts'), 'utf8');

const requiredSources = [
  'docs/phase2-alias-resolver-shadow-metadata-shape-2026-08-11.md',
  'docs/phase2-alias-resolver-shadow-result-envelope-2026-08-11.md',
  'docs/phase2-alias-resolver-shadow-report-builder-2026-08-11.md',
  'docs/phase2-alias-resolver-shadow-invariance-2026-08-11.md',
];

const requiredSections = [
  'Executive summary',
  'Runtime visibility claim',
  'Shadow metadata row summary',
  'Shadow result envelope summary',
  'Shadow report summary',
  'Score invariance proof',
  'Display verdict invariance proof',
  'Ranking invariance proof',
  'Raw label preservation proof',
  'Mutation guard proof',
  'Score impact guard proof',
  'Visible label replacement guard proof',
  'Blocked fallback review',
  'Ambiguous fallback review',
  'Unmatched fallback review',
  'Disable strategy',
  'Rollback strategy',
  'Exact owner approval text for any app-visible change',
];

describe('Phase 2 alias resolver shadow review packet', () => {
  it('references every shadow packet source', () => {
    for (const source of requiredSources) {
      expect(packetDoc).toContain(source);
    }
  });

  it('requires a complete review packet before shadow-mode expansion or behavior change', () => {
    for (const section of requiredSections) {
      expect(packetDoc).toContain(section);
    }
  });

  it('keeps runtime score path free of a true feature flag marker', () => {
    expect(scoreSource).toContain('isPhase2AliasResolverRuntimeEnabled()');
    expect(scoreSource).not.toContain('phase2AliasResolver: true');
  });

  it('keeps current shadow packet counters non-visible and non-mutating', () => {
    expect(packetDoc).toContain('| score impact allowed rows | 0 |');
    expect(packetDoc).toContain('| runtime mutation allowed rows | 0 |');
    expect(packetDoc).toContain('| visible label replacement allowed rows | 0 |');
    expect(packetDoc).toContain('| changed products | 0 |');
    expect(packetDoc).toContain('| score changed | 0 |');
    expect(packetDoc).toContain('| display verdict changed | 0 |');
    expect(packetDoc).toContain('| ranking changed | 0 |');
    expect(packetDoc).toContain('| raw labels replaced | 0 |');
  });

  it('keeps app-visible changes behind owner approval', () => {
    expect(packetDoc).toContain('App-Visible Change Gate');
    expect(packetDoc).toContain('product card score');
    expect(packetDoc).toContain('detail-page score or grade');
    expect(packetDoc).toContain('analysis report text');
    expect(packetDoc).toContain('warning text');
    expect(packetDoc).toContain('raw ingredient labels shown to users');
  });

  it('does not approve production or database work', () => {
    expect(packetDoc).toContain('Supabase production operations');
    expect(packetDoc).toContain('migrations');
    expect(packetDoc).toContain('product label row creation');
  });
});
