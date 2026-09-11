export const ADMIN_HOSTNAMES = new Set([
  'veroro-admin.netlify.app',
]);

export const PUBLIC_APP_HOSTNAMES = new Set([
  'veroro-app.netlify.app',
]);

export function isAdminHostname(hostname: string) {
  return ADMIN_HOSTNAMES.has(hostname.toLowerCase());
}

export function isAdminRoute(pathname: string) {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

export function isPublicAppHostname(hostname: string) {
  return PUBLIC_APP_HOSTNAMES.has(hostname.toLowerCase());
}

export function isBlockedAdminRoute(hostname: string, pathname: string) {
  return isPublicAppHostname(hostname) && isAdminRoute(pathname);
}

export function isAdminExperience(hostname: string, pathname: string) {
  return isAdminHostname(hostname) || (!isPublicAppHostname(hostname) && isAdminRoute(pathname));
}

export function isAdminHost() {
  if (typeof window === 'undefined') return false;
  return isAdminExperience(window.location.hostname, window.location.pathname);
}

export function toggleAdminDesktopMode(enabled: boolean) {
  if (typeof document === 'undefined') return;
  document.body.classList.toggle('admin-desktop-mode', enabled);
  document.documentElement.classList.toggle('admin-desktop-mode', enabled);
  document.getElementById('root')?.classList.toggle('admin-desktop-mode', enabled);
}
