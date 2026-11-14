/** A signed QA session must remain bound to its currently provisioned access. */
export function isAdminSessionActorCurrent(
  actor: string,
  sessionExpiry: number,
  getEnv: (name: string) => string | undefined,
  now = Math.floor(Date.now() / 1000),
): boolean {
  if (!actor.startsWith('qa-')) return true;
  const expiry = Number(getEnv('TEMP_ADMIN_EXPIRES_AT'));
  return /^qa-[a-z0-9-]{1,40}$/.test(actor)
    && actor === getEnv('TEMP_ADMIN_ID')
    && /^[a-f0-9]{64}$/.test(getEnv('TEMP_ADMIN_CREDENTIAL_SHA256') ?? '')
    && Number.isSafeInteger(expiry) && expiry > now && expiry <= now + 3600
    && Number.isSafeInteger(sessionExpiry) && sessionExpiry > now && sessionExpiry <= expiry;
}
