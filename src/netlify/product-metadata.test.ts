import { afterEach, describe, expect, it, vi } from 'vitest';
import handler from '../../netlify/edge-functions/product-metadata';

const SHELL = `<!doctype html><html><head>
  <title data-veroro-meta="title">베로로</title>
  <meta data-veroro-meta="description" name="description" content="반려동물 제품 정보" />
  <link data-veroro-meta="canonical" rel="canonical" href="https://veroro.example/" />
  <script id="veroro-product-jsonld" type="application/ld+json">{}</script>
</head><body><div id="root"></div></body></html>`;

const request = new Request('https://veroro.example/product/11111111-1111-1111-1111-111111111111/wrong-slug');
const htmlResponse = () => new Response(SHELL, { headers: { 'content-type': 'text/html; charset=utf-8' } });
const edgeEnvironment = {
  env: {
    get: (name: string) => ({
      SUPABASE_URL: 'https://db.example',
      SUPABASE_ANON_KEY: 'public-test-key',
    })[name],
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('product metadata edge function', () => {
  it('injects known product facts and the database canonical slug', async () => {
    vi.stubGlobal('Netlify', edgeEnvironment);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify([{
      id: '11111111-1111-1111-1111-111111111111',
      name: '쿠팡 원문 무료배송',
      display_name: '오리지널 독',
      brand_name: '오리젠',
      slug: '오리젠-오리지널-독',
      image_url: 'https://images.example/product.jpg',
      verification_status: 'verified',
    }]), { status: 200, headers: { 'content-type': 'application/json' } })));
    const next = vi.fn().mockResolvedValue(htmlResponse());

    const response = await handler(request, { next });
    const html = await response.text();

    expect(next).toHaveBeenCalledTimes(1);
    expect(html).toContain('<title data-veroro-meta="title">오리젠 오리지널 독 | 베로로</title>');
    expect(html).toContain('/product/11111111-1111-1111-1111-111111111111/%EC%98%A4%EB%A6%AC%EC%A0%A0-%EC%98%A4%EB%A6%AC%EC%A7%80%EB%84%90-%EB%8F%85');
    expect(html).toContain('"@type":"Product"');
    expect(html).not.toContain('무료배송');
  });

  it.each([
    ['missing row', vi.fn().mockResolvedValue(new Response('[]', { status: 200 }))],
    ['fetch error', vi.fn().mockRejectedValue(new Error('network'))],
  ])('returns the untouched shell on %s', async (_label, fetchMock) => {
    vi.stubGlobal('Netlify', edgeEnvironment);
    vi.stubGlobal('fetch', fetchMock);
    const next = vi.fn().mockResolvedValue(htmlResponse());

    const response = await handler(request, { next });
    expect(await response.text()).toBe(SHELL);
  });

  it('does not alter non-HTML responses', async () => {
    vi.stubGlobal('Netlify', edgeEnvironment);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify([{
      id: '11111111-1111-1111-1111-111111111111', name: '제품', display_name: '제품', brand_name: '브랜드', slug: 'product',
    }]), { status: 200 })));
    const next = vi.fn().mockResolvedValue(new Response('binary', { headers: { 'content-type': 'application/octet-stream' } }));

    const response = await handler(request, { next });
    expect(await response.text()).toBe('binary');
  });
});
