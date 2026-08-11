/**
 * Runtime flag accessor for the Phase 2 alias resolver scoring path.
 *
 * Runtime remains deliberately disabled. The resolver must not read
 * env/config/secrets yet, because a live config-backed flag could
 * accidentally enable app-visible behavior without the required review
 * packet and owner approval.
 */
export interface Phase2AliasResolverRuntimeFlagInput {
  /** Test-only override. Runtime callers must omit this. */
  testOverride?: boolean;
}

/**
 * Test-only pure resolver for the runtime flag value.
 *
 * This lets tests exercise both branches without reading live config.
 * Runtime accessors still call it with no override, so the default remains false.
 */
export function resolvePhase2AliasResolverRuntimeFlag(
  input: Phase2AliasResolverRuntimeFlagInput = {},
): boolean {
  return input.testOverride === true;
}

export function isPhase2AliasResolverRuntimeEnabled(): boolean {
  return resolvePhase2AliasResolverRuntimeFlag();
}
