// Explicit, region-aware manufacturer allowlist. Adding a source requires a
// reviewed adapter and matching SQL validation; arbitrary retail URLs are rejected.
export const MANUFACTURER_SOURCES = [
  ['하림펫푸드', 'https://harimpetfood.com', /^\/product\/[^/]+\/(\d+)\/$/, 'harim-kr'],
  ['네츄럴코어', 'https://naturalcore.co.kr', /^\/product\/[^/]+\/(\d+)\/$/, 'naturalcore-kr'],
  ['트릿테이블', 'https://dogttfood.cafe24.com', /^\/product\/[^/]+\/(\d+)\/$/, 'treattable-kr'],
  ['이나바', 'https://www.inaba-petfood.co.jp', /^\/product\/detail\/[^/]+\/(\d+)$/, 'inaba-jp'],
  ['오리젠', 'https://www.orijenpetfoods.com', /^\/en-US\/(?:dogs\/dog|cats\/cat)-food\/[^/]+\/([a-z0-9-]+)\.html$/, 'orijen-us'],
  ['아카나', 'https://www.acana.com', /^\/en-US\/(?:dogs\/dog|cats\/cat)-food\/[^/]+\/([a-z0-9-]+)\.html$/, 'acana-us'],
];

export function manufacturerSourceIdentity(candidate) {
  const url = new URL(candidate.sourceUrl);
  if (url.username || url.password || url.search || url.hash) return null;
  for (const [brand, origin, pattern, namespace] of MANUFACTURER_SOURCES) {
    const match = url.pathname.match(pattern);
    if (candidate.brand === brand && url.origin === origin && match?.[1] === candidate.sourceProductId) {
      if (namespace.endsWith('-us') && candidate.species !== (url.pathname.includes('/dogs/') ? 'dog' : 'cat')) return null;
      return { namespace, sourceProductId: match[1] };
    }
  }
  return null;
}
