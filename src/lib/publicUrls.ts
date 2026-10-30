const DEFAULT_PUBLIC_ORIGIN = 'https://veroro-app.netlify.app';

/** Sharing and auth redirects must never point at the packaged WebView's localhost. */
export function getPublicOrigin(): string {
  try {
    const url = new URL(import.meta.env.VITE_PUBLIC_APP_URL || DEFAULT_PUBLIC_ORIGIN);
    if (url.protocol !== 'https:' || url.username || url.password
      || url.hostname === 'localhost' || url.hostname.endsWith('.localhost')
      || url.hostname === '[::1]' || /^127\./.test(url.hostname)) return DEFAULT_PUBLIC_ORIGIN;
    return url.origin;
  } catch {
    return DEFAULT_PUBLIC_ORIGIN;
  }
}

export function publicUrl(path: string): string {
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) {
    throw new Error('A public URL requires an app-relative path');
  }
  return new URL(path, getPublicOrigin()).href;
}
