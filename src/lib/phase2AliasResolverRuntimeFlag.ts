/**
 * Runtime flag accessor for the Phase 2 alias resolver scoring path.
 *
 * This deliberately returns false. It must not read env/config/secrets yet,
 * because a live config-backed flag could accidentally enable app-visible
 * behavior without the required review packet and owner approval.
 */
export function isPhase2AliasResolverRuntimeEnabled(): boolean {
  return false;
}
