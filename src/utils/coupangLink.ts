/** 쿠팡·파트너스 랜딩 URL 형식 검증 (https, coupang 도메인 등) */
export function isValidCoupangLink(raw: string): boolean {
  const url = raw.trim();
  if (!url) return true; /* 빈 값은 필드 비움 허용 */
  if (!/^https:\/\//i.test(url)) return false;
  try {
    const { hostname } = new URL(url);
    const h = hostname.toLowerCase();
    if (h === 'coupa.ng') return true;
    if (h === 'link.coupang.com' || h.endsWith('.link.coupang.com')) return true;
    if (h === 'coupang.com' || h.endsWith('.coupang.com')) return true;
    return false;
  } catch {
    return false;
  }
}

export function normalizeCoupangLink(raw: string | null | undefined): string | null {
  if (raw == null || !String(raw).trim()) return null;
  return String(raw).trim();
}
