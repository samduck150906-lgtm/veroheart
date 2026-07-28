import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const docPath = join(
  process.cwd(),
  'docs/phase2-alias-resolver-disabled-feature-flag-contract-2026-07-28.md',
);

const doc = readFileSync(docPath, 'utf8');

describe('Phase 2 alias resolver disabled feature flag contract', () => {
  it('keeps the contract docs-only and non-operational', () => {
    expect(doc).toContain('This PR does not wire the helper into runtime, scoring, product analysis, Edge Functions, Supabase, or production data.');
    expect(doc).toContain('No Supabase write/apply/rollback is executed.');
    expect(doc).toContain('No migrations are added or modified.');
    expect(doc).toContain('No SQL files are added or modified.');
    expect(doc).toContain('No `.env`, secrets, credentials, URLs, or tokens are added or changed.');
  });

  it('requires the feature flag to be disabled by default', () => {
    expect(doc).toContain('phase2AliasResolver: disabled by default');
    expect(doc).toContain('The feature flag default is disabled/off.');
    expect(doc).toContain('The flag cannot be enabled by default in production.');
    expect(doc).toContain('Existing runtime/scoring behavior must remain unchanged.');
  });

  it('preserves exact-match-only resolver semantics', () => {
    expect(doc).toContain('exact normalized key equality only');
    expect(doc).toContain('substring matching');
    expect(doc).toContain('fuzzy matching');
    expect(doc).toContain('semantic inference');
    expect(doc).toContain('No substring, fuzzy, or semantic inference path is introduced.');
  });

  it('requires safe handling for all resolver statuses', () => {
    for (const status of ['matched', 'unmatched', 'ambiguous', 'blocked']) {
      expect(doc).toContain(`\`${status}\``);
    }

    expect(doc).toContain('`unmatched` must preserve the raw ingredient label and continue existing behavior.');
    expect(doc).toContain('`ambiguous` must preserve the raw ingredient label and surface review-needed status, not auto-select.');
    expect(doc).toContain('`blocked` must preserve the raw ingredient label and surface review-only status, not auto-resolve.');
  });

  it('blocks runtime approval and production changes', () => {
    expect(doc).toContain('This contract does not approve:');
    expect(doc).toContain('enabling the feature flag');
    expect(doc).toContain('runtime/scoring integration in production');
    expect(doc).toContain('Supabase production write/apply/rollback');
    expect(doc).toContain('automatic canonical safety scoring');
  });
});
