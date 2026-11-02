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
  it('retains guest history IDs for retry without showing unvalidated cached products', async () => {
    const { useStore } = await import('./useStore');
    useStore.setState({ userId: null, recentViews: [product] });
    api.visible.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([product]);
    await useStore.getState().fetchRecentViews();
    expect(useStore.getState().recentViews).toEqual([]);
    await useStore.getState().fetchRecentViews();
    expect(api.visible.mock.calls).toEqual([[['p']], [['p']]]);
    expect(useStore.getState().recentViews).toEqual([product]);
  });

  it('does not truncate a full history when delayed startup requests the home preview', async () => {
    const { useStore } = await import('./useStore');
    let resolveFirst!: (rows: unknown[]) => void;
    api.recent.mockReturnValueOnce(new Promise(resolve => { resolveFirst = resolve; }))
      .mockImplementationOnce(async (_owner, all) => Array.from({ length: all ? 15 : 10 }, (_, i) => ({ id: String(i), name: '사료' })));
    useStore.setState({ userId: 'owner' });
    const full = useStore.getState().fetchRecentViews();
    await useStore.getState().fetchRecentViews(false);
    resolveFirst([]); await full;
    expect(useStore.getState().recentViews).toHaveLength(15);
  });

  it('loads all saved history and revalidates guest history in its original order', async () => {
    const { useStore } = await import('./useStore');
    api.recent.mockResolvedValue([{ id: 'saved', name: '저장 상품', brand_name: '브랜드', product_type: 'food' }]);
    useStore.setState({ userId: 'owner' });
    await useStore.getState().fetchRecentViews();
    expect(api.recent).toHaveBeenCalledWith('owner', true);
    expect(useStore.getState().recentViews.map(p => p.id)).toEqual(['saved']);
    useStore.setState({ userId: null, recentViews: [product, { ...product, id: 'older' }] });
    api.visible.mockResolvedValue([product]);
    await useStore.getState().fetchRecentViews();
    expect(api.visible).toHaveBeenCalledWith(['p', 'older']);
    expect(useStore.getState().recentViews.map(p => p.id)).toEqual(['p']);
  });

  it('does not let a previous account or request replace the current full history', async () => {
    const { useStore } = await import('./useStore');
    let resolveOld!: (rows: unknown[]) => void;
    api.recent.mockReturnValueOnce(new Promise(resolve => { resolveOld = resolve; })).mockResolvedValueOnce([]);
    useStore.setState({ userId: 'old' });
    const old = useStore.getState().fetchRecentViews();
    useStore.setState({ userId: 'new', recentViews: [] });
    await useStore.getState().fetchRecentViews();
    resolveOld([{ id: 'private', name: '이전 계정' }]); await old;
    expect(useStore.getState().recentViews).toEqual([]);
    expect(useStore.getState().isLoadingRecentViews).toBe(false);
  });

  it('waits for ordered view writes before reloading the saved history', async () => {
    const { useStore } = await import('./useStore');
    let finishWrite!: () => void;
    api.addRecent.mockReturnValueOnce(new Promise<void>(resolve => { finishWrite = resolve; })).mockResolvedValueOnce(undefined);
    api.recent.mockResolvedValue([]);
    useStore.setState({ userId: 'owner', selectedProduct: product });
    const first = useStore.getState().trackRecentView('p');
    useStore.setState({ selectedProduct: { ...product, id: 'second' } });
    const second = useStore.getState().trackRecentView('second');
    const reload = useStore.getState().fetchRecentViews();
    await Promise.resolve(); await Promise.resolve();
    expect(api.recent).not.toHaveBeenCalled();
    expect(api.addRecent.mock.calls.map(call => call[1])).toEqual(['p']);
    finishWrite(); await Promise.all([first, second, reload]);
    expect(api.addRecent.mock.calls.map(call => call[1])).toEqual(['p', 'second']);
    expect(api.recent).toHaveBeenCalledWith('owner', true);
  });

  it('retries a stale history response after a newer view and reports query errors', async () => {
    const { useStore } = await import('./useStore');
    let resolveOld!: (rows: unknown[]) => void;
    api.recent.mockReturnValueOnce(new Promise(resolve => { resolveOld = resolve; })).mockResolvedValueOnce([{ id: 'p', name: '사료' }]);
    api.addRecent.mockResolvedValue(undefined);
    useStore.setState({ userId: 'owner', selectedProduct: product });
    const reload = useStore.getState().fetchRecentViews();
    await useStore.getState().trackRecentView('p');
    resolveOld([]); await reload;
    expect(useStore.getState().recentViews.map(p => p.id)).toEqual(['p']);
    expect(api.recent).toHaveBeenCalledTimes(2);
    api.recent.mockRejectedValueOnce(new Error('목록 조회 실패'));
    await useStore.getState().fetchRecentViews();
    expect(useStore.getState()).toMatchObject({ recentViewsError: '목록 조회 실패', isLoadingRecentViews: false, recentViews: [] });
  });

  it('retains more than ten viewed products and moves a repeated view to the front', async () => {
    const { useStore } = await import('./useStore');
    const history = Array.from({ length: 15 }, (_, i) => ({ ...product, id: String(i) }));
    useStore.setState({ recentViews: history, selectedProduct: history[12], userId: null });
    await useStore.getState().trackRecentView('12');
    expect(useStore.getState().recentViews.map(p => p.id)).toEqual(['12', ...history.filter(p => p.id !== '12').map(p => p.id)]);
  });

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
