import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('./supabase', () => ({ supabase: api, isSupabaseConfigured: true }));

function respond(rows: { id?: string; name: string; hint: string | null; parent_id: string | null; is_active: boolean }[]) {
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
      { id: 'food', name: '사료', hint: '주식', parent_id: null, is_active: true },
      { name: '건식', hint: null, parent_id: 'food', is_active: true },
      { name: '숨긴 분류', hint: null, parent_id: 'food', is_active: false },
      { name: 'snack', hint: null, parent_id: 'snacks', is_active: true },
      { name: '간식', hint: null, parent_id: null, is_active: false },
    ]);
    const { loadProductCategories } = await import('./productCategories');
    expect(await loadProductCategories()).toEqual([{ name: '사료', hint: '주식', subCategories: ['건식'] }]);
  });

  it('respects an intentionally empty active main category list', async () => {
    respond([]);
    const { loadProductCategories } = await import('./productCategories');
    expect(await loadProductCategories()).toEqual([]);
  });

  it('reloads the public categories after the administrator changes them', async () => {
    respond([{ name: '간식', hint: null, parent_id: null, is_active: true }]);
    const { loadProductCategories, invalidateProductCategoriesCache } = await import('./productCategories');
    expect(await loadProductCategories()).toEqual([{ name: '간식', hint: null, subCategories: [] }]);
    respond([]);
    invalidateProductCategoriesCache();
    expect(await loadProductCategories()).toEqual([]);
  });

  it('preserves the last hierarchy on refresh failure and safely falls back on a cold failure', async () => {
    api.from.mockImplementation(() => { throw new Error('offline'); });
    const { loadProductCategories, invalidateProductCategoriesCache, DEFAULT_PRODUCT_CATEGORIES } = await import('./productCategories');
    expect(await loadProductCategories()).toEqual(DEFAULT_PRODUCT_CATEGORIES);
    respond([{ id: 'food', name: '사료', hint: null, parent_id: null, is_active: true },
      { name: 'dry', hint: null, parent_id: 'food', is_active: true }]);
    const loaded = await loadProductCategories();
    expect(loaded[0].subCategories).toEqual(['dry']);
    invalidateProductCategoriesCache();
    api.from.mockImplementation(() => { throw new Error('offline'); });
    expect(await loadProductCategories()).toEqual(loaded);
  });
});

describe('category link compatibility', () => {
  it('uses administrator-defined parents, including renamed and new child categories', async () => {
    const { resolveSearchCategory } = await import('./productCategories');
    const categories = [{ name: '새 대분류', hint: null, subCategories: ['새 소분류'] }];
    expect(resolveSearchCategory(categories, '새 소분류', null)).toEqual({ category: '새 대분류', subCategory: '새 소분류' });
  });

  it('prefers exact main names and does not guess between two parents', async () => {
    const { resolveSearchCategory } = await import('./productCategories');
    const categories = [{ name: '사료', hint: null, subCategories: ['영양제', '공통'] },
      { name: '영양제', hint: null, subCategories: ['공통'] }];
    expect(resolveSearchCategory(categories, '영양제', null)).toEqual({ category: '영양제', subCategory: '' });
    expect(resolveSearchCategory(categories, '공통', null)).toEqual({ category: '공통', subCategory: '' });
    expect(resolveSearchCategory(categories, '사료', '공통')).toEqual({ category: '사료', subCategory: '공통' });
  });

  it('keeps unknown restrictions instead of returning all products', async () => {
    const { resolveSearchCategory } = await import('./productCategories');
    expect(resolveSearchCategory([], 'dry', null)).toEqual({ category: 'dry', subCategory: '' });
    expect(resolveSearchCategory([], '사료', '미등록')).toEqual({ category: '사료', subCategory: '미등록' });
    expect(resolveSearchCategory([], null, 'dry')).toEqual({ category: '전체', subCategory: '' });
  });
});
