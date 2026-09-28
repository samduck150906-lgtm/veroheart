import { getProductDisplayParts } from '../utils/productDisplay.ts';

export interface ProductMetadataInput {
  id: string;
  name: string;
  displayName?: string | null;
  brand?: string | null;
  variantName?: string | null;
  netWeightText?: string | null;
  slug?: string | null;
  imageUrl?: string | null;
}

export interface ProductJsonLd {
  '@context': 'https://schema.org';
  '@type': 'Product';
  name: string;
  url: string;
  identifier: string;
  brand?: { '@type': 'Brand'; name: string };
  image?: string;
}

export interface ProductMetadata {
  title: string;
  description: string;
  canonicalUrl: string;
  jsonLd: ProductJsonLd;
}

export function buildProductPath(id: string, slug?: string | null): string {
  const encodedId = encodeURIComponent(id.trim());
  const cleanSlug = String(slug ?? '').trim();
  return cleanSlug
    ? `/product/${encodedId}/${encodeURIComponent(cleanSlug)}`
    : `/product/${encodedId}`;
}

export function buildProductMetadata(
  product: ProductMetadataInput,
  origin: string,
): ProductMetadata {
  const display = getProductDisplayParts(product);
  const canonicalUrl = new URL(buildProductPath(product.id, product.slug), `${origin.replace(/\/$/, '')}/`).toString();
  const subject = [display.brand, display.name].filter(Boolean).join(' ');
  const jsonLd: ProductJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: display.name,
    url: canonicalUrl,
    identifier: product.id,
  };
  if (display.brand) jsonLd.brand = { '@type': 'Brand', name: display.brand };
  if (product.imageUrl) jsonLd.image = product.imageUrl;

  return {
    title: `${subject} | 베로로`,
    description: `${subject}의 원료·영양 정보와 정보 확인 상태를 베로로에서 확인하세요.`,
    canonicalUrl,
    jsonLd,
  };
}
