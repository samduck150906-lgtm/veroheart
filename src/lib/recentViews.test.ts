import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ from: vi.fn(), ranges: [] as number[][], upsert: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => api }));
const product = (id: string, status = 'verified', visible = true) => ({ id, name: id, product_type: 'food', verification_status: status, is_visible: visible });
const history = Array.from({ length: 205 }, (_, i) => ({ user_id: 'owner', product_id: `p${i.toString().padStart(3, '0')}`,
  viewed_at: new Date(2026, 0, 1, 0, i).toISOString(), products: product(`p${i.toString().padStart(3, '0')}`) }));

function respond(failOffset?: number) {
  api.from.mockImplementation(() => {
    let rows = [...history, { ...history[0], product_id: 'pending', products: product('pending', 'pending'), viewed_at: '2027-01-01' },
      { ...history[0], product_id: 'hidden', products: product('hidden', 'verified', false), viewed_at: '2027-01-01' },
      { ...history[0], user_id: 'other', product_id: 'private', products: product('private'), viewed_at: '2027-01-01' }];
    let start = 0; let end = 999; let inner = false;
    const orders: { key: string; ascending: boolean }[] = [];
    const value = (r: typeof rows[number], key: string) => key.startsWith('products.')
      ? r.products[key.slice(9) as keyof typeof r.products] : r[key as keyof typeof r];
    const filters: ((r: typeof rows[number]) => boolean)[] = [];
    const chain = {
      select: (columns: string) => { inner = columns.includes('products!inner'); return chain; },
      eq: (key: string, v: unknown) => { if (key.startsWith('products.')) filters.push(r => value(r, key) === v); else rows = rows.filter(r => value(r, key) === v); return chain; },
      in: (key: string, values: unknown[]) => { filters.push(r => values.includes(value(r, key))); return chain; },
      order: (key: string, options: { ascending: boolean }) => { orders.push({ key, ...options }); return chain; },
      limit: (count: number) => { end = count - 1; return chain; },
      range: (a: number, b: number) => { start = a; end = b; api.ranges.push([a, b]); return chain; },
      upsert: api.upsert,
      then: (resolve: (v: unknown) => void) => {
        const selected = inner ? rows.filter(r => filters.every(f => f(r))) : rows;
        selected.sort((a, b) => { for (const { key, ascending } of orders) { const diff = String(value(a, key)).localeCompare(String(value(b, key))); if (diff) return ascending ? diff : -diff; } return 0; });
        return Promise.resolve({ error: start === failOffset ? { message: 'offline' } : null,
          data: selected.slice(start, end + 1).map(r => ({ ...r, products: filters.every(f => f(r)) ? r.products : null })) }).then(resolve);
      },
    };
    return chain;
  });
}
beforeEach(() => { vi.resetModules(); vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co'); vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon'); api.ranges.length = 0; api.upsert.mockReset(); respond(); });
afterEach(() => vi.unstubAllEnvs());

describe('recent product history', () => {
  it('loads all pages in newest-first order and excludes other owners, hidden and pending products', async () => {
    const { getRecentViews } = await import('./supabase');
    const result = await getRecentViews('owner', true);
    expect(result.map(p => p.id)).toEqual(history.toReversed().map(r => r.product_id));
    expect(api.ranges).toEqual([[0, 99], [100, 199], [200, 299]]);
  });
  it('keeps home startup lightweight without letting private rows consume preview slots', async () => {
    const { getRecentViews } = await import('./supabase');
    expect((await getRecentViews('owner')).map(p => p.id)).toEqual(history.toReversed().slice(0, 10).map(r => r.product_id));
    expect(api.ranges).toEqual([]);
  });
  it('reports a later-page failure instead of returning a partial or false empty history', async () => {
    respond(100);
    const { getRecentViews } = await import('./supabase');
    await expect(getRecentViews('owner', true)).rejects.toThrow('최근 본 상품을 불러오지 못했습니다.');
  });
  it('updates one owner/product record and reports a failed save', async () => {
    api.upsert.mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ error: { message: 'offline' } });
    const { addRecentView } = await import('./supabase');
    await addRecentView('owner', 'p1');
    expect(api.upsert).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'owner', product_id: 'p1', viewed_at: expect.any(String) }), { onConflict: 'user_id,product_id' });
    await expect(addRecentView('owner', 'p1')).rejects.toThrow();
  });
});
