import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  isPhase2AliasResolverRuntimeEnabled,
  resolvePhase2AliasResolverRuntimeFlag,
} from './phase2AliasResolverRuntimeFlag';

const scoreSource = readFileSync(join(process.cwd(), 'src/utils/score.ts'), 'utf8');
const flagSource = readFileSync(join(process.cwd(), 'src/lib/phase2AliasResolverRuntimeFlag.ts'), 'utf8');

describe('Phase 2 alias resolver runtime flag test-only seam', () => {
  it('keeps the runtime accessor disabled by default', () => {
    expect(isPhase2AliasResolverRuntimeEnabled()).toBe(false);
    expect(resolvePhase2AliasResolverRuntimeFlag()).toBe(false);
    expect(resolvePhase2AliasResolverRuntimeFlag({})).toBe(false);
  });

  it('allows only test-owned override evaluation without changing runtime default', () => {
    expect(resolvePhase2AliasResolverRuntimeFlag({ testOverride: true })).toBe(true);
    expect(resolvePhase2AliasResolverRuntimeFlag({ testOverride: false })).toBe(false);
    expect(isPhase2AliasResolverRuntimeEnabled()).toBe(false);
  });

  it('does not read live env config or browser storage', () => {
    expect(flagSource).not.toContain('process.env');
    expect(flagSource).not.toContain('import.meta.env');
    expect(flagSource).not.toContain('localStorage');
    expect(flagSource).not.toContain('sessionStorage');
    expect(flagSource).not.toContain('document.cookie');
  });

  it('keeps score runtime free of a true feature flag marker', () => {
    expect(scoreSource).toContain('isPhase2AliasResolverRuntimeEnabled()');
    expect(scoreSource).not.toContain('phase2AliasResolver: true');
  });

  it('documents that runtime callers must omit the test override', () => {
    expect(flagSource).toContain('Test-only override. Runtime callers must omit this.');
    expect(flagSource).toContain('Runtime accessors still call it with no override');
  });
});
