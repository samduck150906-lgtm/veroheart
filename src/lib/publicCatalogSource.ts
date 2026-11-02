/** Manufacturer source references are public, canonical HTTPS URLs, not signed links. */
export function publicCatalogSourceUrl(value: string | null | undefined): string | undefined {
  if (!value || value !== value.trim()) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) return undefined;
    return value;
  } catch { return undefined; }
}
