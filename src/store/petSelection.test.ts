import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabasePet } from '../types';

const api = vi.hoisted(() => ({ user: vi.fn(), pets: vi.fn(), save: vi.fn(), remove: vi.fn() }));
vi.mock('../lib/supabase', () => ({
  isSupabaseConfigured: false,
  supabase: { auth: { onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) } },
  getInitialSessionUser: (...args: unknown[]) => api.user(...args),
  getUserPets: (...args: unknown[]) => api.pets(...args),
  saveUserPet: (...args: unknown[]) => api.save(...args),
  deleteUserPet: (...args: unknown[]) => api.remove(...args),
  getFavorites: async () => [], getRecentViews: async () => [], getProducts: async () => [],
  getProductDetail: vi.fn(), addFavorite: vi.fn(), removeFavorite: vi.fn(), addRecentView: vi.fn(), signOut: vi.fn(),
}));
const first = { id: 'pet-1', user_id: 'owner', name: '하루', pet_type: 'dog', age_group: 'adult', created_at: '2026-01-01T00:00:00Z' } as SupabasePet;
const second = { ...first, id: 'pet-2', name: '나비', pet_type: 'cat', created_at: '2026-02-01T00:00:00Z' } as SupabasePet;
async function openApp() {
  vi.resetModules(); // A full page load creates a new store; browser storage survives.
  const { useStore } = await import('./useStore');
  await useStore.getState().initApp();
  return useStore;
}
beforeEach(() => {
  localStorage.clear(); vi.restoreAllMocks();
  api.user.mockReset().mockResolvedValue({ id: 'owner' });
  api.pets.mockReset().mockResolvedValue([first, second]);
  api.remove.mockReset().mockResolvedValue(true);
  api.save.mockReset();
});

describe('active pet across full app loads', () => {
  it('restores the selected second pet after the app store is recreated', async () => {
    const store = await openApp();
    store.getState().selectPet(second.id);
    const reopened = await openApp();
    expect(reopened.getState().activePetId).toBe(second.id);
    expect(reopened.getState().profile.name).toBe('나비');
  });
  it('does not reset the current selection on same-account initialization', async () => {
    const store = await openApp();
    store.getState().selectPet(second.id);
    await store.getState().initApp();
    expect(store.getState().activePetId).toBe(second.id);
  });
  it('keeps account selections separate and validates the saved pet against owned rows', async () => {
    const store = await openApp();
    store.getState().selectPet(second.id);
    api.user.mockResolvedValue({ id: 'other-owner' });
    api.pets.mockResolvedValue([{ ...first, id: 'other-pet', user_id: 'other-owner' }]);
    expect((await openApp()).getState().activePetId).toBe('other-pet');
    api.user.mockResolvedValue({ id: 'owner' }); api.pets.mockResolvedValue([first, second]);
    expect((await openApp()).getState().activePetId).toBe(second.id);
    api.pets.mockResolvedValue([first]); // Selected pet deleted elsewhere.
    expect((await openApp()).getState().activePetId).toBe(first.id);
  });
  it('preserves a choice made while a private-data refresh is still loading', async () => {
    const store = await openApp();
    let resolve!: (rows: SupabasePet[]) => void;
    api.pets.mockReturnValueOnce(new Promise<SupabasePet[]>(done => { resolve = done; }));
    const pending = store.getState().initApp();
    await vi.waitFor(() => expect(api.pets).toHaveBeenCalledTimes(2));
    store.getState().selectPet(second.id);
    resolve([first, second]); await pending;
    expect(store.getState().activePetId).toBe(second.id);
  });
  it('retains the saved selection through a failed pet request', async () => {
    const store = await openApp(); store.getState().selectPet(second.id);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    api.pets.mockRejectedValueOnce(new Error('offline'));
    await openApp();
    expect((await openApp()).getState().activePetId).toBe(second.id);
  });
  it('persists newly saved and fallback pets and clears an empty list', async () => {
    const store = await openApp();
    api.save.mockResolvedValue(second);
    await store.getState().savePet({ ...store.getState().profile, id: second.id, name: '나비' });
    expect((await openApp()).getState().activePetId).toBe(second.id);
    await store.getState().removePet(second.id);
    expect((await openApp()).getState().activePetId).toBe(first.id);
    api.pets.mockResolvedValue([]);
    await openApp();
    expect(localStorage.length).toBe(0);
  });
  it('keeps a newer selection when a different pet deletion completes late', async () => {
    const third = { ...first, id: 'pet-3', created_at: '2026-03-01T00:00:00Z' };
    api.pets.mockResolvedValue([first, second, third]);
    const store = await openApp(); store.getState().selectPet(second.id);
    let resolve!: (ok: boolean) => void;
    api.remove.mockReturnValueOnce(new Promise<boolean>(done => { resolve = done; }));
    const pending = store.getState().removePet(first.id);
    store.getState().selectPet(third.id); resolve(true); await pending;
    expect(store.getState().activePetId).toBe(third.id);
  });
  it('still works in memory when device storage is unavailable', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    const store = await openApp(); store.getState().selectPet(second.id);
    expect(store.getState().profile.id).toBe(second.id);
  });
});

describe('registration order', () => {
  it('orders by registration time then ID, independent of name, age, weight and response order', async () => {
    const tie = { ...first, id: 'pet-0', name: '초코', weight: 30, age_group: 'senior' };
    api.pets.mockResolvedValue([second, first, tie]);
    const store = await openApp();
    expect(store.getState().pets.map(p => p.id)).toEqual(['pet-0', 'pet-1', 'pet-2']);
    api.save.mockResolvedValue({ ...first, name: '가나다', weight: 2 });
    await store.getState().savePet({ ...store.getState().pets[1], name: '가나다' });
    expect(store.getState().pets.map(p => p.id)).toEqual(['pet-0', 'pet-1', 'pet-2']);
    expect((await openApp()).getState().pets.map(p => p.id)).toEqual(['pet-0', 'pet-1', 'pet-2']);
  });
});
