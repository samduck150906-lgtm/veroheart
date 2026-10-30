import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const api = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => api }));
beforeEach(() => {
  vi.resetModules(); api.from.mockReset();
  vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co'); vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon');
});
afterEach(() => vi.unstubAllEnvs());

const rows = [
  { id: 'a', name: 'A', brand_name: 'Brand', product_type: 'food', is_visible: true, verification_status: 'reviewed' },
  { id: 'hidden', name: 'Hidden', brand_name: 'Brand', product_type: 'food', is_visible: false, verification_status: 'verified' },
  { id: 'b', name: 'B', brand_name: 'Brand', product_type: 'food', is_visible: true, verification_status: 'verified' },
];

function respond(error: object | null = null) {
  api.from.mockImplementation(() => {
    let selected = rows;
    let columns = '';
    const chain = {
      select: (projection: string) => { columns = projection; return chain; },
      in: (key: string, values: unknown[]) => { selected = selected.filter(row => values.includes(row[key as keyof typeof row])); return chain; },
      eq: (key: string, value: unknown) => { selected = selected.filter(row => row[key as keyof typeof row] === value); return chain; },
      then: (resolve: (result: unknown) => void) => Promise.resolve({ error, data: selected.map(row => ({ ...row,
        nutritional_profiles: columns.includes('nutritional_profiles') ? [{ crude_protein: 25 }] : undefined,
        product_ingredient_label_sets: columns.includes('product_ingredient_label_sets') ? [{ id: 'label', is_current: true, product_ingredient_label_items: [{ display_order: 0, raw_ingredient_text: '연어', match_status: 'unmatched' }] }] : undefined,
      })) }).then(resolve),
    };
    return chain;
  });
}

describe('cached product revalidation', () => {
  it('returns ordered hydrated visible products, excluding deleted and hidden IDs', async () => {
    respond();
    const { getVisibleProductsByIds } = await import('./supabase');
    const result = await getVisibleProductsByIds(['b', 'hidden', 'a', 'deleted', 'b']);
    expect(result.map(product => product.id)).toEqual(['b', 'a']);
    expect(result[0].guaranteedAnalysis?.crudeProtein).toBe(25);
    expect(result[0].unknownIngredientTerms).toEqual(['연어']);
  });
  it('rejects query errors and never returns partial cached hydration', async () => {
    respond({ code: '42703', message: 'schema mismatch' });
    const { getVisibleProductsByIds } = await import('./supabase');
    await expect(getVisibleProductsByIds(['a'])).rejects.toThrow();
  });
  it('avoids a query for empty IDs', async () => {
    const { getVisibleProductsByIds } = await import('./supabase');
    expect(await getVisibleProductsByIds([])).toEqual([]);
    expect(api.from).not.toHaveBeenCalled();
  });
});
