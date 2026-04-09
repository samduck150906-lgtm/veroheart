export const ADMIN_HOSTNAMES = new Set([
  'veroro-admin.netlify.app',
]);

export function isAdminHostname(hostname: string) {
  return ADMIN_HOSTNAMES.has(hostname.toLowerCase());
}

export function isAdminHost() {
  if (typeof window === 'undefined') return false;
  return isAdminHostname(window.location.hostname);
}
