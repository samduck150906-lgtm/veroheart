import { buildProductPath } from '../../src/lib/productMetadata.ts';

interface SitemapProductRow {
  id: string;
  slug?: string | null;
  last_observed_at?: string | null;
  verification_status?: string | null;
}

const CACHE_CONTROL = 'no-store';
const PAGE_SIZE = 1000;

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function validLastModified(value: string | null | undefined): string | null {
  if (!value || !Number.isFinite(Date.parse(value))) return null;
  return new Date(value).toISOString();
}

async function readPublicProducts(baseUrl: string, anonKey: string): Promise<SitemapProductRow[]> {
  const rows: SitemapProductRow[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const url = new URL('/rest/v1/products', baseUrl);
    url.searchParams.set('select', 'id,slug,last_observed_at,verification_status');
    url.searchParams.set('is_visible', 'eq.true');
    url.searchParams.set('verification_status', 'in.(reviewed,verified)');
    url.searchParams.set('order', 'id.asc');
    url.searchParams.set('offset', String(offset));
    url.searchParams.set('limit', String(PAGE_SIZE));

    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    });
    if (!response.ok) throw new Error(`public products query failed (${response.status})`);
    const page = await response.json();
    if (!Array.isArray(page)) throw new Error('public products response is not an array');
    rows.push(...(page as SitemapProductRow[]).filter(row => row.verification_status === 'reviewed' || row.verification_status === 'verified'));
    if (page.length < PAGE_SIZE) break;
  }
  return rows;
}

export default async function productSitemap(request: Request): Promise<Response> {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '';
  const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? '';
  const siteOrigin = (process.env.URL ?? new URL(request.url).origin).replace(/\/$/, '');
  if (!supabaseUrl || !anonKey) {
    return new Response('Sitemap configuration is unavailable.', { status: 503 });
  }

  try {
    const products = await readPublicProducts(supabaseUrl, anonKey);
    const urls = products.map((product) => {
      const location = escapeXml(`${siteOrigin}${buildProductPath(product.id, product.slug)}`);
      const lastModified = validLastModified(product.last_observed_at);
      return [
        '  <url>',
        `    <loc>${location}</loc>`,
        lastModified ? `    <lastmod>${escapeXml(lastModified)}</lastmod>` : null,
        '  </url>',
      ].filter(Boolean).join('\n');
    });
    const body = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...urls,
      '</urlset>',
      '',
    ].join('\n');

    return new Response(body, {
      status: 200,
      headers: {
        'content-type': 'application/xml; charset=utf-8',
        'cache-control': CACHE_CONTROL,
        'netlify-cdn-cache-control': CACHE_CONTROL,
      },
    });
  } catch (error) {
    console.error('product sitemap failed:', error instanceof Error ? error.message : String(error));
    return new Response('Sitemap is temporarily unavailable.', {
      status: 502,
      headers: { 'cache-control': 'no-store' },
    });
  }
}

export const config = {
  path: '/sitemap-products.xml',
};
