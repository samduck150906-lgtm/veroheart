import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ detail: vi.fn(), products: vi.fn() }));
vi.mock('../lib/supabase', () => ({ supabase: {}, isSupabaseConfigured: false, getProductDetail: api.detail, getProducts: api.products }));
beforeEach(() => { vi.resetModules(); vi.clearAllMocks(); });

describe('catalog error state does not masquerade as absent product evidence', () => {
  it('records detail failure and clears it only after a new successful result', async () => {
    const { useStore } = await import('./useStore');
    api.detail.mockRejectedValueOnce(new Error('synthetic schema failure')).mockResolvedValueOnce(null);
    await useStore.getState().fetchProductDetail('fixture-product');
    expect(useStore.getState().selectedProduct).toBeNull();
    expect(useStore.getState().productDetailError).toContain('제품 정보를 불러오지 못했습니다');
    expect(useStore.getState().isLoadingProducts).toBe(false);
    await useStore.getState().fetchProductDetail('fixture-product');
    expect(useStore.getState().productDetailError).toBe('');
  });
  it('separates catalog failure from an honestly empty catalog', async () => {
    const { useStore } = await import('./useStore');
    api.products.mockRejectedValueOnce(new Error('synthetic schema failure')).mockResolvedValueOnce([]);
    await useStore.getState().fetchProducts();
    expect(useStore.getState().catalogError).toContain('검색 결과가 없는 상태와 다릅니다');
    await useStore.getState().fetchProducts();
    expect(useStore.getState().catalogError).toBe('');
  });
});
