const RETURN_KEY = 'veroro.auth.returnTo';

export function safeAuthReturn(value: unknown): string {
  if (typeof value !== 'string') return '/profile';
  let inspected=value;
  for (let pass=0;pass<3;pass+=1) {
    if (!inspected.startsWith('/') || inspected.startsWith('//') || inspected.includes('\\')
      || [...inspected].some(character => character.charCodeAt(0) < 32)
      || /^\/(?:login|auth)(?:\/|\?|$)/i.test(inspected)) return '/profile';
    try { const decoded=decodeURIComponent(inspected); if(decoded===inspected)break; inspected=decoded; }
    catch { return '/profile'; }
  }
  return value;
}

export function rememberAuthReturn(path: string): void {
  try { sessionStorage.setItem(RETURN_KEY, safeAuthReturn(path)); } catch { /* optional storage */ }
}

export function consumeAuthReturn(): string {
  try {
    const value = sessionStorage.getItem(RETURN_KEY);
    sessionStorage.removeItem(RETURN_KEY);
    return safeAuthReturn(value);
  } catch { return '/profile'; }
}
