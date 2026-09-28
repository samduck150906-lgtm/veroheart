import { describe, expect, it, vi } from 'vitest';

import {
  ExternalLookupError,
  lookupOpenPetFoodFacts,
  OPEN_PET_FOOD_FACTS_TIMEOUT_MS,
} from '../../netlify/functions/_shared/openPetFoodFacts';

describe('Open Pet Food Facts adapter', () => {
  it('uses a normalized barcode, field allowlist, explicit user agent, and five-second timeout', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      status: 1,
      product: {
        code: '0036000291452',
        product_name: '테스트 사료',
        brands: '테스트브랜드',
        quantity: '2 kg',
        image_front_url: 'https://images.example/front.jpg',
        ingredients_text: '연어, 쌀',
        nutriments: { proteins_100g: 24 },
        categories_tags: ['en:dog-food'],
        risk_score: 99,
      },
    }), { headers: { 'content-type': 'application/json' } }));

    const result = await lookupOpenPetFoodFacts('036000291452', { fetchImpl });

    const [url, init] = fetchImpl.mock.calls[0];
    const parsed = new URL(url);
    expect(parsed.pathname).toBe('/api/v3/product/0036000291452');
    expect(parsed.searchParams.get('fields')).toBe(
      'code,product_name,brands,quantity,image_front_url,ingredients_text,nutriments,categories_tags',
    );
    expect(new Headers(init.headers).get('user-agent')).toMatch(/^VeroHeart\//);
    expect(OPEN_PET_FOOD_FACTS_TIMEOUT_MS).toBe(5_000);
    expect(result).toMatchObject({ found: true, name: '테스트 사료', barcode: '0036000291452' });
    expect(JSON.stringify(result)).not.toContain('risk_score');
    expect(JSON.stringify(result)).not.toContain('99');
  });

  it('treats status=0 as a normal miss', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 0 })));

    await expect(lookupOpenPetFoodFacts('0036000291452', { fetchImpl })).resolves.toMatchObject({
      found: false,
      sourceUrl: 'https://world.openpetfoodfacts.org/product/0036000291452',
    });
  });

  it('maps invalid JSON to external_invalid_response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('<html>bad gateway</html>', {
      status: 200,
      headers: { 'content-type': 'text/html' },
    }));

    await expect(lookupOpenPetFoodFacts('0036000291452', { fetchImpl }))
      .rejects.toEqual(new ExternalLookupError('external_invalid_response'));
  });
});
