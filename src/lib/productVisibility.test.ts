import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => api }));

beforeEach(() => {
  vi.resetModules(); api.from.mockReset(); api.rpc.mockReset();
  vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon');
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe('public product visibility', () => {
  it.each(['is_visible', 'is_pinned', 'has_ingredients'])('never retries without visibility after missing %s', async (missing) => {
    const executed: boolean[] = [];
    api.from.mockImplementation(() => {
      let visibleOnly = false;
      const chain: Record<string, unknown> = {
        eq: (field: string, value: unknown) => { if (field === 'is_visible' && value === true) visibleOnly = true; return chain; },
        then: (resolve: (result: unknown) => void) => {
          executed.push(visibleOnly);
          return Promise.resolve(visibleOnly
            ? { data: null, error: { code: '42703', message: `column products.${missing} does not exist` } }
            : { data: [{ id: 'hidden', name: 'Hidden', brand_name: 'B', product_type: 'food' }], error: null }).then(resolve);
        },
      };
      for (const method of ['select', 'order', 'range']) chain[method] = () => chain;
      return chain;
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { getProducts } = await import('./supabase');
    await expect(getProducts()).rejects.toThrow();
    await expect(getProducts()).rejects.toThrow();
    expect(executed.every(Boolean)).toBe(true);
  });
});
