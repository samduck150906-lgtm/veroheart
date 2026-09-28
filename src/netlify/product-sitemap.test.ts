import { afterEach, describe, expect, it, vi } from 'vitest';
import handler, { config, escapeXml } from '../../netlify/functions/product-sitemap';

const originalUrl = process.env.URL;
const originalSupabaseUrl = process.env.SUPABASE_URL;
const originalAnonKey = process.env.SUPABASE_ANON_KEY;

afterEach(() => {
  vi.unstubAllGlobals();
  process.env.URL = originalUrl;
  process.env.SUPABASE_URL = originalSupabaseUrl;
  process.env.SUPABASE_ANON_KEY = originalAnonKey;
});

describe('product sitemap function', () => {
  it('publishes only rows returned by the visible-product query', async () => {
    process.env.URL = 'https://veroro.example';
    process.env.SUPABASE_URL = 'https://db.example';
    process.env.SUPABASE_ANON_KEY = 'public-test-key';
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([
      { id: '11111111-1111-1111-1111-111111111111', slug: '연어-&-오리', last_observed_at: '2026-09-25T00:00:00Z' },
    ]), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await handler(new Request('https://veroro.example/sitemap-products.xml'));
    const xml = await response.text();
    const calledUrl = new URL(String(fetchMock.mock.calls[0][0]));

    expect(calledUrl.pathname).toBe('/rest/v1/products');
    expect(calledUrl.searchParams.get('select')).toBe('id,slug,last_observed_at');
    expect(calledUrl.searchParams.get('is_visible')).toBe('eq.true');
    expect(xml).toContain('/product/11111111-1111-1111-1111-111111111111/');
    expect(xml).not.toContain('private-product');
    expect(response.headers.get('cache-control')).toBe('public, max-age=300, stale-while-revalidate=3600');
    expect(response.headers.get('content-type')).toContain('application/xml');
    expect(config.path).toBe('/sitemap-products.xml');
  });

  it('escapes XML-reserved characters including quotes', () => {
    expect(escapeXml(`A&B <food> "quoted" 'single'`)).toBe(
      'A&amp;B &lt;food&gt; &quot;quoted&quot; &apos;single&apos;',
    );
  });
});
