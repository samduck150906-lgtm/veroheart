import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => api }));
const row = (id: string, barcode: string, is_visible = true) => ({ id, barcode, is_visible, verification_status: 'verified', name: id, brand_name: 'Brand', product_type: 'food' });

function respond(rows: ReturnType<typeof row>[], error: object | null = null, aliases: Array<{product_id:string;barcode:string}>=[]) {
  api.from.mockImplementation((table:string) => {
    let selected: Array<Record<string,unknown>> = table==='product_barcodes' ? aliases : rows;
    const result = () => ({ data: selected, error });
    const chain = {
      select: () => chain,
      eq: (key: string, value: unknown) => { selected = selected.filter(item => item[key as keyof typeof item] === value); return chain; },
      in: (key: string, values: unknown[]) => { selected = selected.filter(item => values.includes(item[key as keyof typeof item])); return chain; },
      limit: (n: number) => { selected = selected.slice(0, n); return chain; },
      maybeSingle: () => Promise.resolve({ data: selected[0] ?? null, error }),
      single: () => Promise.resolve({ data: selected[0] ?? null, error }),
      then: (resolve: (result: unknown) => void) => Promise.resolve(result()).then(resolve),
    };
    return chain;
  });
}

beforeEach(() => {
  vi.resetModules(); api.from.mockReset();
  vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co'); vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon');
});
afterEach(() => vi.unstubAllEnvs());

describe('public barcode lookup', () => {
  it('opens the same formula from a manufacturer-declared package code and rechecks its public detail', async () => {
    respond([row('formula','')],null,[{product_id:'formula',barcode:'0036000291452'}]);
    const {getProductByBarcode}=await import('./supabase');
    expect((await getProductByBarcode('036000291452'))?.id).toBe('formula');
  });
  it('rejects conflicts between a primary code and another product package code', async () => {
    respond([row('primary','036000291452')],null,[{product_id:'other',barcode:'0036000291452'}]);
    const {getProductByBarcode}=await import('./supabase');
    await expect(getProductByBarcode('036000291452')).rejects.toMatchObject({reason:'ambiguous'});
  });
  it('finds UPC12 stored products from scanner EAN13 and GTIN14 equivalents', async () => {
    respond([row('upc', '036000291452')]);
    const { getProductByBarcode } = await import('./supabase');
    expect((await getProductByBarcode('0036000291452'))?.id).toBe('upc');
    expect((await getProductByBarcode('00036000291452'))?.id).toBe('upc');
  });
  it('keeps hidden products out of equivalent barcode matches', async () => {
    respond([row('hidden', '036000291452', false)]);
    const { getProductByBarcode } = await import('./supabase');
    expect(await getProductByBarcode('0036000291452')).toBeNull();
  });
  it('reports query errors rather than telling users the catalog has no match', async () => {
    respond([], { code: '42703', message: 'missing is_visible column' });
    const { getProductByBarcode } = await import('./supabase');
    await expect(getProductByBarcode('036000291452')).rejects.toMatchObject({ reason: 'unavailable' });
  });
  it('refuses ambiguous equivalent matches rather than opening an arbitrary product', async () => {
    respond([row('a', '036000291452'), row('b', '0036000291452')]);
    const { getProductByBarcode } = await import('./supabase');
    await expect(getProductByBarcode('036000291452')).rejects.toMatchObject({ reason: 'ambiguous' });
  });
  it('sanitizes transport failures into a recoverable unavailable error', async () => {
    api.from.mockImplementation(() => { throw new TypeError('Failed to fetch'); });
    const { getProductByBarcode } = await import('./supabase');
    await expect(getProductByBarcode('036000291452')).rejects.toMatchObject({ reason: 'unavailable' });
  });
});
