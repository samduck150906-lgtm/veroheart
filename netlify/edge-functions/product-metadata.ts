import { buildProductMetadata } from '../../src/lib/productMetadata.ts';

interface EdgeContext {
  next(): Promise<Response>;
}

interface NetlifyEnvironment {
  env?: { get(name: string): string | undefined };
}

interface ProductMetadataRow {
  id: string;
  name: string;
  display_name?: string | null;
  brand_name?: string | null;
  variant_name?: string | null;
  net_weight_text?: string | null;
  slug?: string | null;
  image_url?: string | null;
  verification_status?: string | null;
}

function readEnvironment(primary: string, fallback: string): string {
  const netlify = (globalThis as typeof globalThis & { Netlify?: NetlifyEnvironment }).Netlify;
  return netlify?.env?.get(primary) ?? netlify?.env?.get(fallback) ?? '';
}

function escapeHtmlText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeHtmlAttribute(value: string): string {
  return escapeHtmlText(value).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function safeJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

async function fetchPublicProduct(id: string): Promise<ProductMetadataRow | null> {
  const supabaseUrl = readEnvironment('SUPABASE_URL', 'VITE_SUPABASE_URL');
  const anonKey = readEnvironment('SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY');
  if (!supabaseUrl || !anonKey) return null;

  const url = new URL('/rest/v1/products', supabaseUrl);
  url.searchParams.set(
    'select',
    'id,name,display_name,brand_name,variant_name,net_weight_text,slug,image_url,verification_status',
  );
  url.searchParams.set('id', `eq.${id}`);
  url.searchParams.set('is_visible', 'eq.true');
  url.searchParams.set('limit', '1');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const rows = await response.json();
    return Array.isArray(rows) && rows[0] ? rows[0] as ProductMetadataRow : null;
  } finally {
    clearTimeout(timeout);
  }
}

function injectMetadata(html: string, row: ProductMetadataRow, origin: string): string {
  const metadata = buildProductMetadata({
    id: row.id,
    name: row.name,
    displayName: row.display_name,
    brand: row.brand_name,
    variantName: row.variant_name,
    netWeightText: row.net_weight_text,
    slug: row.slug,
    imageUrl: row.image_url,
  }, origin);

  return html
    .replace(
      /<title data-veroro-meta="title">[\s\S]*?<\/title>/i,
      `<title data-veroro-meta="title">${escapeHtmlText(metadata.title)}</title>`,
    )
    .replace(
      /<meta data-veroro-meta="description"[^>]*>/i,
      `<meta data-veroro-meta="description" name="description" content="${escapeHtmlAttribute(metadata.description)}" />`,
    )
    .replace(
      /<link data-veroro-meta="canonical"[^>]*>/i,
      `<link data-veroro-meta="canonical" rel="canonical" href="${escapeHtmlAttribute(metadata.canonicalUrl)}" />`,
    )
    .replace(
      /<script id="veroro-product-jsonld" type="application\/ld\+json">[\s\S]*?<\/script>/i,
      `<script id="veroro-product-jsonld" type="application/ld+json">${safeJson(metadata.jsonLd)}</script>`,
    );
}

export default async function productMetadata(
  request: Request,
  context: EdgeContext,
): Promise<Response> {
  const shellPromise = context.next();
  const url = new URL(request.url);
  const match = /^\/product\/([0-9a-f-]{36})(?:\/[^/]+)?\/?$/i.exec(url.pathname);
  if (!match) return shellPromise;

  try {
    const row = await fetchPublicProduct(match[1]);
    const shell = await shellPromise;
    if (!row || !shell.headers.get('content-type')?.toLowerCase().includes('text/html')) return shell;

    const html = injectMetadata(await shell.clone().text(), row, url.origin);
    const headers = new Headers(shell.headers);
    headers.delete('content-length');
    headers.delete('content-encoding');
    return new Response(html, {
      status: shell.status,
      statusText: shell.statusText,
      headers,
    });
  } catch {
    return shellPromise;
  }
}

export const config = {
  path: '/product/*',
  onError: 'bypass',
};
