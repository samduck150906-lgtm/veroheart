import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseProductRow } from './supabaseRowTypes';

const api = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => api }));
const chicken = { id: 'legacy-chicken', name_ko: '닭고기', name_en: 'Chicken', risk_level: 'safe' };
const rice = { id: 'legacy-rice', name_ko: '쌀', name_en: 'Rice', risk_level: 'safe' };
const current = {
  id: 'current-label', is_current: true,
  product_ingredient_label_items: [{
    display_order: 0, raw_ingredient_text: '신선한 닭고기 25%', match_status: 'matched' as const,
    canonical_ingredients: { id: 'canonical-chicken', canonical_name_ko: '닭고기', canonical_name_en: 'Chicken', status: 'active', ingredients: chicken },
  }],
};
const product: SupabaseProductRow = { id: 'p', name: 'Food A', brand_name: 'Brand A', product_type: 'food',
  product_ingredients: [{ ingredient_id: rice.id, sort_order: 0, ingredients: rice }], product_ingredient_label_sets: [current] };

function respond(row: SupabaseProductRow) {
  api.rpc.mockResolvedValue({ data: [{ product_id: row.id, rank: 100 }], error: null });
  api.from.mockImplementation(() => {
    let columns = '';
    const data = () => ({ ...row,
      product_ingredient_label_sets: columns.includes('product_ingredient_label_sets') ? row.product_ingredient_label_sets : undefined,
      nutritional_profiles: columns.includes('nutritional_profiles') ? row.nutritional_profiles : undefined,
    });
    const chain: Record<string, unknown> = {
      select: (selected: string) => { columns = selected; return chain; },
      single: () => Promise.resolve({ data: data(), error: null }),
      then: (resolve: (value: unknown) => void) => Promise.resolve({ data: [data()], error: null }).then(resolve),
    };
    for (const name of ['eq', 'in', 'order', 'limit', 'range', 'overlaps']) chain[name] = () => chain;
    return chain;
  });
}

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon');
  api.rpc.mockReset(); api.from.mockReset(); respond(product);
});
afterEach(() => vi.unstubAllEnvs());

describe('current ingredient evidence across product entry points', () => {
  it('loads the same reported nutrition for scored catalog candidates and product detail', async () => {
    respond({ ...product, nutritional_profiles: [{ crude_protein: 30, crude_fat: 15, crude_fiber: 3, crude_ash: 8, moisture: 10, calcium: 1, phosphorus: 0.8 }] });
    const { searchProductsPage, getProductDetail } = await import('./supabase');
    const [candidate] = (await searchProductsPage('')).products;
    const detail = await getProductDetail('p');
    expect(candidate.guaranteedAnalysis?.crudeProtein).toBe(30);
    expect(candidate.guaranteedAnalysis).toEqual(detail?.guaranteedAnalysis);
    expect(candidate.ingredients).toEqual(detail?.ingredients);
  });
  it.each(['닭고기', 'CHICKEN', 'legacy-chicken', 'canonical-chicken'])('excludes current canonical chicken using %s', async (excluded) => {
    const { searchProductsPage } = await import('./supabase');
    expect((await searchProductsPage('', undefined, [excluded])).products).toEqual([]);
  });
  it('does not exclude a product because an older legacy ingredient matches', async () => {
    const { searchProductsPage } = await import('./supabase');
    expect((await searchProductsPage('', undefined, ['쌀', 'legacy-rice'])).products.map((item) => item.id)).toEqual(['p']);
  });
  it('excludes literal raw label terms even when their risk mapping is unresolved', async () => {
    respond({ ...product, product_ingredient_label_sets: [{ ...current, product_ingredient_label_items: [{ display_order: 0, raw_ingredient_text: '신선한 닭고기 25%', match_status: 'unmatched' }] }] });
    const { searchProductsPage } = await import('./supabase');
    expect((await searchProductsPage('', undefined, ['닭고기'])).products).toEqual([]);
  });
  it('preserves legacy-only filtering when no current label exists', async () => {
    respond({ ...product, product_ingredient_label_sets: [] });
    const { searchProductsPage } = await import('./supabase');
    expect((await searchProductsPage('', undefined, ['쌀'])).products).toEqual([]);
  });
  it('can exclude a canonical identity while its risk metadata is still missing', async () => {
    respond({ ...product, product_ingredient_label_sets: [{ ...current, product_ingredient_label_items: [{ ...current.product_ingredient_label_items[0], canonical_ingredients: { ...current.product_ingredient_label_items[0].canonical_ingredients, ingredients: null } }] }] });
    const { searchProductsPage } = await import('./supabase');
    expect((await searchProductsPage('', undefined, ['canonical-chicken'])).products).toEqual([]);
  });
  it('does not revive stale legacy ingredients when the current label is empty', async () => {
    respond({ ...product, product_ingredient_label_sets: [{ ...current, product_ingredient_label_items: [] }] });
    const { searchProductsPage } = await import('./supabase');
    expect((await searchProductsPage('', undefined, ['쌀'])).products.map((item) => item.id)).toEqual(['p']);
  });
  it('does not mistake rice for the distinct English ingredient licorice', async () => {
    respond({ ...product, product_ingredient_label_sets: [{ ...current, product_ingredient_label_items: [{ display_order: 0, raw_ingredient_text: 'licorice root', match_status: 'unmatched' }] }] });
    const { searchProductsPage } = await import('./supabase');
    expect((await searchProductsPage('', undefined, ['rice'])).products.map((item) => item.id)).toEqual(['p']);
  });
  it('uses current raw and canonical names in the missing-RPC fallback', async () => {
    api.rpc.mockResolvedValue({ data: null, error: { code: 'PGRST202', message: 'missing' } });
    const { searchProductsPage } = await import('./supabase');
    expect((await searchProductsPage('닭고기')).products.map((item) => item.id)).toEqual(['p']);
    expect((await searchProductsPage('쌀')).products).toEqual([]);
  });
  it('hydrates brand products with the same current label as the detail', async () => {
    const { getProductsByBrand, getProductDetail } = await import('./supabase');
    const [brand] = await getProductsByBrand('Brand A');
    const detail = await getProductDetail('p');
    expect(brand.ingredients.map((item) => item.nameKo)).toEqual(['닭고기']);
    expect(brand.ingredients).toEqual(detail?.ingredients);
    expect(brand.ingredientLabelSetId).toBe('current-label');
  });
});
