import { beforeEach, expect, it, vi } from 'vitest';

let authChange: (event: string, session: unknown) => void;
const subscribe = vi.fn((callback) => { authChange = callback; return { data: { subscription: { unsubscribe() {} } } }; });
const pets = vi.fn(async () => []);
const favorites = vi.fn(async () => []);
const initialUser = vi.fn(async () => null);
const addFavorite = vi.fn(async () => true);
const saveUserPet = vi.fn();
const signOut = vi.fn(async () => {});
vi.mock('../lib/supabase', () => ({
  isSupabaseConfigured: false,
  supabase: { auth: { onAuthStateChange: (...a) => subscribe(...a) } },
  getInitialSessionUser: (...a) => initialUser(...a), getUserPets: (...a) => pets(...a),
  getFavorites: (...a) => favorites(...a), getRecentViews: async () => [], getProducts: async () => [],
  getProductDetail: vi.fn(), saveUserPet: (...a) => saveUserPet(...a), deleteUserPet: vi.fn(),
  addFavorite: (...a) => addFavorite(...a), removeFavorite: vi.fn(), addRecentView: vi.fn(), signOut: (...a) => signOut(...a),
}));
const { useStore } = await import('./useStore');
const baseline = useStore.getState();
beforeEach(async () => {
  useStore.setState(baseline);
  pets.mockReset().mockResolvedValue([]); favorites.mockReset().mockResolvedValue([]);
  initialUser.mockReset().mockResolvedValue(null); signOut.mockReset().mockResolvedValue(undefined);
  await useStore.getState().initApp();
});

it('subscribes once before a guest session exists and clears private state immediately on identity change', async () => {
  await useStore.getState().initApp();
  await useStore.getState().initApp();
  expect(subscribe).toHaveBeenCalledTimes(1);
  useStore.setState({ userId: 'old', favorites: ['private'], recentViews: [{ id: 'secret' }], pets: [{ id: 'old-pet' }] } as never);
  authChange('SIGNED_IN', { user: { id: 'new' } });
  expect(useStore.getState()).toMatchObject({ userId: 'new', favorites: [], recentViews: [], pets: [] });
  await vi.waitFor(() => expect(pets).toHaveBeenCalledWith('new'));
});

it('discards pet responses from a previous identity', async () => {
  let resolve;
  pets.mockReturnValue(new Promise((r) => { resolve = r; }));
  useStore.setState({ userId: 'first' });
  const pending = useStore.getState().fetchPets();
  authChange('SIGNED_OUT', null);
  resolve([{ id: 'private-pet', name: 'private', user_id: 'first', pet_type: 'dog' }]);
  await pending;
  expect(useStore.getState().pets).toEqual([]);
  expect(useStore.getState().userId).toBeNull();
});

it('does not roll a previous account favorite back into the current account', async () => {
  let resolve;
  addFavorite.mockReturnValue(new Promise((r) => { resolve = r; }));
  useStore.setState({ userId: 'first' });
  const pending = useStore.getState().toggleFavorite('private-product');
  authChange('SIGNED_IN', { user: { id: 'second' } });
  useStore.setState({ favorites: ['second-only'] });
  resolve(false);
  await pending;
  expect(useStore.getState().favorites).toEqual(['second-only']);
});

it('does not apply or roll back a pet save after an account change', async () => {
  let resolve;
  saveUserPet.mockReturnValue(new Promise((r) => { resolve = r; }));
  useStore.setState({ userId: 'first' });
  const pending = useStore.getState().updateProfile({ name: 'first private pet' });
  authChange('SIGNED_IN', { user: { id: 'second' } });
  resolve(null);
  await pending;
  expect(useStore.getState().profile.name).not.toBe('first private pet');
});

it('both logout entry points invalidate initialization before waiting for sign-out', async () => {
  let resolve;
  initialUser.mockReturnValue(new Promise((r) => { resolve = r; }));
  const pending = useStore.getState().initApp();
  await useStore.getState().signOut();
  resolve({ id: 'previous' });
  await pending;
  expect(useStore.getState().userId).toBeNull();
  expect(useStore.getState().pets).toEqual([]);
});
