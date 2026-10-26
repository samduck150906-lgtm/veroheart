import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => api }));
const row = (id: string, verification_status: string | null, is_visible = true) => ({
  id, name: id, brand_name: 'Brand', product_type: 'food', verification_status, is_visible,
  barcode: id === 'pending' ? '036000291452' : null,
});
const catalog = [row('pending', 'pending'), row('reviewed', 'reviewed'), row('verified', 'verified'),
  row('hidden', 'verified', false), row('null-status', null), row('unknown-status', 'invalid')];

function respond(rows = catalog) {
  api.from.mockImplementation((table: string) => {
    let selected = rows;
    const value = (item: typeof catalog[number], key: string) => item[key.replace(/^products\./, '') as keyof typeof item];
    const result = () => ({ data: table === 'recent_views' ? selected.map(product => ({ products: product, product_id: product.id })) : selected, error: null });
    const chain: Record<string, unknown> = {
      eq: (key: string, expected: unknown) => { if (key !== 'user_id') selected = selected.filter(item => value(item, key) === expected); return chain; },
      in: (key: string, values: unknown[]) => { selected = selected.filter(item => values.includes(value(item, key))); return chain; },
      single: () => Promise.resolve(selected[0] ? { data: selected[0], error: null } : { data: null, error: { code: 'PGRST116', message: 'not found' } }),
      then: (resolve: (result: unknown) => void) => Promise.resolve(result()).then(resolve),
    };
    for (const method of ['select', 'order', 'range', 'limit', 'overlaps', 'or']) chain[method] = () => chain;
    return chain;
  });
  api.rpc.mockResolvedValue({ data: rows.map(product => ({ product_id: product.id, rank: 1 })), error: null });
}

beforeEach(() => {
  vi.resetModules(); api.from.mockReset(); api.rpc.mockReset();
  vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co'); vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon');
  vi.spyOn(console, 'error').mockImplementation(() => {});
  respond();
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe.each([false, true])('public review boundary with verified-only setting %s', strict => {
  it('filters initial, ranked/fallback search, brand, diary, saved and recent products', async () => {
    const db = await import('./supabase');
    db.setHideUnverifiedProducts(strict);
    const expected = strict ? ['verified'] : ['reviewed', 'verified'];
    expect((await db.getProducts()).map(p => p.id)).toEqual(expected);
    expect((await db.searchProductsPage('')).products.map(p => p.id)).toEqual(expected);
    api.rpc.mockResolvedValueOnce({ data: null, error: { code: 'PGRST202', message: 'missing RPC' } });
    expect((await db.searchProductsPage('')).products.map(p => p.id)).toEqual(expected);
    expect((await db.getProductsByBrand('Brand')).map(p => p.id)).toEqual(expected);
    expect((await db.searchDiaryProducts('')).map(p => p.id)).toEqual(expected);
    expect((await db.getVisibleProductsByIds(catalog.map(p => p.id))).map(p => p.id)).toEqual(expected);
    expect((await db.getRecentViews('owner')).map(p => p.id)).toEqual(expected);
  });

  it('blocks direct detail and barcode access to visible-but-pending products', async () => {
    const db = await import('./supabase');
    db.setHideUnverifiedProducts(strict);
    expect(await db.getProductDetail('pending')).toBeNull();
    expect(await db.getProductDetail('null-status')).toBeNull();
    expect(await db.getProductDetail('unknown-status')).toBeNull();
    expect(await db.getProductByBarcode('036000291452')).toBeNull();
    expect((await db.getProductDetail('verified'))?.id).toBe('verified');
    expect((await db.getProductDetail('reviewed'))?.id ?? null).toBe(strict ? null : 'reviewed');
  });

  it('does not expose brands that have only pending products', async () => {
    respond([row('pending', 'pending')]);
    const db = await import('./supabase');
    db.setHideUnverifiedProducts(strict);
    expect(await db.getBrands()).toEqual([]);
  });
});
