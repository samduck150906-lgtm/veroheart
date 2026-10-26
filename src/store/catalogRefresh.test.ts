import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Product } from '../types';

const api = vi.hoisted(() => ({ products: vi.fn(), detail: vi.fn(), addRecent: vi.fn(), recent: vi.fn(), visible: vi.fn() }));
vi.mock('../lib/supabase', () => ({
  supabase: {}, isSupabaseConfigured: false,
  getProducts: api.products, getProductDetail: api.detail, addRecentView: api.addRecent, getRecentViews: api.recent,
  getVisibleProductsByIds: api.visible,
}));
const product: Product = {
  id: 'p', name: '사료', brand: '브랜드', category: 'food', imageUrl: '', reviewsCount: 0, averageRating: 0,
  ingredients: [{ id: 'chicken', nameKo: '닭고기', nameEn: 'chicken', riskLevel: 'safe', purpose: '' }],
};
beforeEach(() => { vi.resetModules(); vi.clearAllMocks(); });

describe('public catalog cache freshness', () => {
  it('does not resurrect an unavailable product from an earlier catalog/recent response', async () => {
    const { useStore } = await import('./useStore');
    let resolveProducts!: (products: Product[]) => void;
    let resolveRecent!: (products: Product[]) => void;
    api.products.mockReturnValueOnce(new Promise((resolve) => { resolveProducts = resolve; }));
    api.visible.mockReturnValueOnce(new Promise((resolve) => { resolveRecent = resolve; }));
    useStore.setState({ products: [product], recentViews: [product], selectedProduct: null });
    const beforeRevision = useStore.getState().catalogRevision;
    const refresh = useStore.getState().refreshCatalog();
    api.detail.mockResolvedValueOnce(null);
    await useStore.getState().fetchProductDetail('p');
    resolveProducts([product]);
    resolveRecent([product]);
    await refresh;
    expect(useStore.getState().products).toEqual([]);
    expect(useStore.getState().recentViews).toEqual([]);
    expect(useStore.getState().isLoadingProducts).toBe(false);
    expect(useStore.getState().catalogRevision).toBeGreaterThan(beforeRevision);
  });
  it('settles a foreground spinner superseded by a background refresh without clearing a pending detail', async () => {
    const { useStore } = await import('./useStore');
    let resolveOld!: (products: Product[]) => void;
    let resolveDetail!: (value: Product) => void;
    api.products.mockReturnValueOnce(new Promise((resolve) => { resolveOld = resolve; })).mockResolvedValueOnce([]);
    api.detail.mockReturnValueOnce(new Promise((resolve) => { resolveDetail = resolve; }));
    const old = useStore.getState().fetchProducts();
    const detail = useStore.getState().fetchProductDetail('p');
    await useStore.getState().fetchProducts(true);
    expect(useStore.getState().isLoadingProducts).toBe(true);
    resolveDetail(product);
    await detail;
    expect(useStore.getState().isLoadingProducts).toBe(false);
    resolveOld([product]);
    await old;
    expect(useStore.getState().isLoadingProducts).toBe(false);
    expect(useStore.getState().products).toEqual([]);
  });
  it('does not leave a foreground spinner running when a background request supersedes it', async () => {
    const { useStore } = await import('./useStore');
    api.products.mockReturnValueOnce(new Promise(() => {})).mockResolvedValueOnce([]);
    void useStore.getState().fetchProducts();
    await useStore.getState().fetchProducts(true);
    expect(useStore.getState().isLoadingProducts).toBe(false);
  });
  it('records the hydrated detail rather than losing its ingredients to a lightweight summary', async () => {
    const { useStore } = await import('./useStore');
    useStore.setState({ products: [{ ...product, ingredients: [] }], selectedProduct: product });
    await useStore.getState().trackRecentView('p');
    expect(useStore.getState().recentViews[0].ingredients).toEqual(product.ingredients);
  });
  it('purges an unavailable detail from cached cards and never records it as newly viewed', async () => {
    const { useStore } = await import('./useStore');
    useStore.setState({ products: [product], recentViews: [product], selectedProduct: product, userId: 'user' });
    api.detail.mockResolvedValue(null);
    await useStore.getState().fetchProductDetail('p');
    expect(useStore.getState().products).toEqual([]);
    expect(useStore.getState().recentViews).toEqual([]);
    await useStore.getState().trackRecentView('p');
    expect(api.addRecent).not.toHaveBeenCalled();
  });
  it('ignores an older product list response after a fresh visibility refresh', async () => {
    const { useStore } = await import('./useStore');
    let resolveOld!: (products: Product[]) => void;
    api.products.mockReturnValueOnce(new Promise((resolve) => { resolveOld = resolve; })).mockResolvedValueOnce([]);
    const old = useStore.getState().fetchProducts();
    await useStore.getState().fetchProducts();
    resolveOld([product]);
    await old;
    expect(useStore.getState().products).toEqual([]);
  });
});
