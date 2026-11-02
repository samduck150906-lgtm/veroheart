import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mapProductFromSupabaseRow, type SupabaseProductRow } from './supabaseRowTypes';

const api = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), calls: [] as Array<[string, unknown]> }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => api }));
let response: { data: unknown; error: { code: string; message: string; details?: string } | null };
beforeEach(() => {
  vi.resetModules(); api.calls.length = 0;
  vi.stubEnv('VITE_SUPABASE_URL', 'https://fixture.supabase.co');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'synthetic-public-key');
  response = { data: null, error: { code: '42703', message: 'column products.catalog_source_url does not exist' } };
  api.rpc.mockResolvedValue({ data: [{ product_id: 'fixture-product', rank: 1 }], error: null });
  api.from.mockImplementation(() => {
    const chain: Record<string, unknown> = {
      single: () => Promise.resolve({ ...response, data: Array.isArray(response.data) ? response.data[0] : response.data }),
      then: (resolve: (r: unknown) => void) => Promise.resolve(response).then(resolve),
    };
    for (const method of ['select', 'eq', 'in', 'order', 'range', 'limit', 'overlaps', 'or']) chain[method] = (...args: unknown[]) => {
      api.calls.push([method, args]); return chain;
    };
    return chain;
  });
});
afterEach(() => vi.unstubAllEnvs());

describe('missing product source schema is an error, not product absence', () => {
  it('rejects the observed 42703 in detail and preserves public filters', async () => {
    const { getProductDetail } = await import('./supabase');
    await expect(getProductDetail('fixture-product')).rejects.toThrow('제품 정보를 불러오지 못했습니다');
    expect(api.calls).toContainEqual(['eq', ['is_visible', true]]);
    expect(api.calls).toContainEqual(['in', ['verification_status', ['reviewed', 'verified']]]);
    expect(api.calls.filter(([method]) => method === 'select')).toHaveLength(1); // no unsafe fallback
  });
  it('rejects list/search failures rather than returning an empty successful page', async () => {
    const { getProductsPage, searchProductsPage, getProductsByBrand, searchDiaryProducts, getBrands } = await import('./supabase');
    await expect(getProductsPage()).rejects.toThrow('제품 목록을 불러오지 못했습니다');
    await expect(searchProductsPage('')).rejects.toThrow('제품 정보를 불러오지 못했습니다');
    await expect(getProductsByBrand('Fixture')).rejects.toThrow('제품 정보를 불러오지 못했습니다');
    await expect(searchDiaryProducts('fixture', 'food')).rejects.toThrow('제품 정보를 불러오지 못했습니다');
    await expect(getBrands()).rejects.toThrow('제품 정보를 불러오지 못했습니다');
  });
  it('returns null only for an explicit zero-row response, not ambiguous rows or permissions', async () => {
    const { getProductDetail } = await import('./supabase');
    response = { data: null, error: { code: 'PGRST116', message: 'Cannot coerce', details: 'The result contains 0 rows' } };
    expect(await getProductDetail('fixture-product')).toBeNull();
    for (const error of [
      { code: 'PGRST116', message: 'Cannot coerce', details: 'The result contains 2 rows' },
      { code: '42501', message: 'permission denied' },
      { code: 'PGRST116', message: 'unexplained' },
    ]) {
      response = { data: null, error };
      await expect(getProductDetail('fixture-product')).rejects.toThrow('제품 정보를 불러오지 못했습니다');
    }
  });
  it('maps actual NULL source, unread projection and valid evidence distinctly; preserves zero', () => {
    const row: SupabaseProductRow = { id: 'fixture-product', name: 'Synthetic', brand_name: 'Fixture', product_type: 'food' };
    expect(mapProductFromSupabaseRow(row).catalogSourceStatus).toBe('not_loaded');
    const absent = mapProductFromSupabaseRow({ ...row, catalog_source_url: null, nutritional_profiles: [{ crude_protein: 0, crude_fat: null }] });
    expect(absent.catalogSourceStatus).toBe('absent');
    expect(absent.guaranteedAnalysis?.crudeProtein).toBe(0);
    expect(absent.guaranteedAnalysis?.crudeFat).toBeUndefined();
    const available = mapProductFromSupabaseRow({ ...row, catalog_source_url: 'https://manufacturer.example/fixture' });
    expect(available.catalogSourceStatus).toBe('available');
    const invalid = mapProductFromSupabaseRow({ ...row, catalog_source_url: 'javascript:invalid' });
    expect(invalid.catalogSourceStatus).toBe('invalid');
    expect(invalid.catalogSourceUrl).toBeUndefined();
  });
  it('still loads an eligible product with explicit source absence across public paths', async () => {
    response = { data: [{ id: 'fixture-product', name: 'Synthetic', brand_name: 'Fixture', product_type: 'food', catalog_source_url: null }], error: null };
    const { getProductDetail, getProductsPage, searchProductsPage, getProductsByBrand, searchDiaryProducts } = await import('./supabase');
    const detail = await getProductDetail('fixture-product');
    const products = [detail, ...(await getProductsPage()), ...(await searchProductsPage('')).products,
      ...(await getProductsByBrand('Fixture')), ...(await searchDiaryProducts('', 'food'))];
    expect(products).toHaveLength(5);
    for (const p of products) {
      expect(p?.id).toBe('fixture-product');
      expect(p?.catalogSourceStatus).toBe('absent');
      expect(p?.catalogSourceUrl).toBeUndefined();
    }
  });
  it.each(['https://user:synthetic@example.com/path','https://manufacturer.example/path?token=synthetic',
    'https://manufacturer.example/path#session=synthetic','https://',' http://example.com/path'])('does not expose a private/malformed source URL (%s)', url => {
    const p = mapProductFromSupabaseRow({ id:'fixture',name:'Fixture',brand_name:'Fixture',product_type:'food',catalog_source_url:url });
    expect(p.catalogSourceUrl).toBeUndefined();
    expect(p.catalogSourceStatus).toBe('invalid');
  });
});
