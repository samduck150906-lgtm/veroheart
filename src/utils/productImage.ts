/** Stock photography must never stand in for a product's identity. */
export function productImageUrl(value: string | null | undefined): string {
  if (!value) return '';
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol)) return '';
    if (['images.unsplash.com', 'images.pexels.com', 'picsum.photos', 'placehold.co', 'via.placeholder.com'].includes(url.hostname)) return '';
    return value;
  } catch {
    return '';
  }
}
