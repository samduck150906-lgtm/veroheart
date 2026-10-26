import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const api = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => api }));
vi.mock('../store/useNotification', () => ({ notify: { error: vi.fn() } }));
beforeEach(() => {
  vi.resetModules(); api.from.mockReset();
  vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co'); vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon');
});
afterEach(() => vi.unstubAllEnvs());
function respond(data: unknown[], error: unknown = null) {
  const query = {
    select: vi.fn(), eq: vi.fn(), order: vi.fn(),
    then: (resolve: (value: unknown) => void) => Promise.resolve({ data, error }).then(resolve),
  };
  for (const method of [query.select, query.eq, query.order]) method.mockReturnValue(query);
  api.from.mockReturnValue(query);
  return query;
}
it('requests owned pets in stable original-registration order', async () => {
  const query = respond([{ id: 'first' }, { id: 'second' }]);
  const { getUserPets } = await import('./supabase');
  expect(await getUserPets('owner')).toEqual([{ id: 'first' }, { id: 'second' }]);
  expect(query.eq).toHaveBeenCalledWith('user_id', 'owner');
  expect(query.order.mock.calls).toEqual([['created_at', { ascending: true }], ['id', { ascending: true }]]);
});
it('does not turn a query error into an empty pet list that erases a saved choice', async () => {
  const error = new Error('offline'); respond([], error);
  const { getUserPets } = await import('./supabase');
  await expect(getUserPets('owner')).rejects.toBe(error);
});
