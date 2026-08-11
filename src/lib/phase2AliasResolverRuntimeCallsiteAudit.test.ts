import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const docPath = join(
  process.cwd(),
  'docs/phase2-alias-resolver-runtime-callsite-audit-2026-07-28.md',
);

const doc = readFileSync(docPath, 'utf8');

describe('Phase 2 alias resolver runtime call-site audit', () => {
  it('identifies scoring as the future adapter boundary without wiring runtime', () => {
    expect(doc).toContain('This PR does not wire the resolver into runtime/scoring.');
    expect(doc).toContain('The safest future integration point is an isolated adapter immediately before score analysis consumes product ingredients.');
    expect(doc).toContain('The adapter must return a copied product-like object or a separate resolved ingredient view. It must not mutate the original product.');
  });

  it('marks UI surfaces as non-call-sites for initial integration', () => {
    expect(doc).toContain('Do not first integrate the resolver in:');
    expect(doc).toContain('`ProductCard` display code');
    expect(doc).toContain('`AnalysisResult` UI rendering code');
    expect(doc).toContain('search sorting UI');
    expect(doc).toContain('comparison UI');
  });

  it('requires disabled behavior to preserve current scoring and display outputs', () => {
    expect(doc).toContain('The flag must remain disabled by default.');
    expect(doc).toContain('No score may change while disabled.');
    expect(doc).toContain('Product cards, detail pages, ranking, and search must behave the same while disabled.');
    expect(doc).toContain('disabled ranking order unchanged');
  });

  it('keeps unsafe resolver statuses raw-label-first', () => {
    expect(doc).toContain('`unmatched`, `ambiguous`, and `blocked` must preserve raw labels.');
    expect(doc).toContain('raw labels preserved for `unmatched`');
    expect(doc).toContain('raw labels preserved for `ambiguous`');
    expect(doc).toContain('raw labels preserved for `blocked`');
  });

  it('does not approve production or scoring changes', () => {
    expect(doc).toContain('This audit does not approve:');
    expect(doc).toContain('enabling the feature flag');
    expect(doc).toContain('changing score calculations');
    expect(doc).toContain('Supabase production write/apply/rollback');
    expect(doc).toContain('automatic canonical safety scoring');
  });
});
