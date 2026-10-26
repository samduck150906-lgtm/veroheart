import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('./supabase', () => ({ supabase: api, isSupabaseConfigured: true }));

function respond(rows: { name: string; hint: string | null; parent_id: string | null; is_active: boolean }[]) {
  api.from.mockImplementation(() => {
    let selected = rows;
    const chain = {
      select: () => chain,
      eq: (field: string, value: unknown) => { selected = selected.filter(row => row[field as keyof typeof row] === value); return chain; },
      is: (field: string, value: unknown) => { selected = selected.filter(row => row[field as keyof typeof row] === value); return chain; },
      order: () => chain,
      then: (resolve: (result: unknown) => void) => Promise.resolve({ data: selected, error: null }).then(resolve),
    };
    return chain;
  });
}

beforeEach(() => { vi.resetModules(); api.from.mockReset(); });
afterEach(() => vi.restoreAllMocks());

describe('public category hierarchy', () => {
  it('only offers active main categories as home cards and search category chips', async () => {
    respond([
      { name: '사료', hint: '주식', parent_id: null, is_active: true },
      { name: '건식', hint: null, parent_id: 'food', is_active: true },
      { name: '간식', hint: null, parent_id: null, is_active: false },
    ]);
    const { loadProductCategories } = await import('./productCategories');
    expect(await loadProductCategories()).toEqual([{ name: '사료', hint: '주식' }]);
  });

  it('respects an intentionally empty active main category list', async () => {
    respond([]);
    const { loadProductCategories } = await import('./productCategories');
    expect(await loadProductCategories()).toEqual([]);
  });

  it('reloads the public categories after the administrator changes them', async () => {
    respond([{ name: '간식', hint: null, parent_id: null, is_active: true }]);
    const { loadProductCategories, invalidateProductCategoriesCache } = await import('./productCategories');
    expect(await loadProductCategories()).toEqual([{ name: '간식', hint: null }]);
    respond([]);
    invalidateProductCategoriesCache();
    expect(await loadProductCategories()).toEqual([]);
  });
});
