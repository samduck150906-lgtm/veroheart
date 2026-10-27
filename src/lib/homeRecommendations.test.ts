import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_USER_PET_PROFILE, type Ingredient, type Product, type UserPetProfile } from '../types';
import { resolveProductDisplayVerdict } from '../utils/displayVerdict';
import { loadHomeRecommendations, selectHomeRecommendations } from './homeRecommendations';

const api = vi.hoisted(() => ({ search: vi.fn() }));
vi.mock('./supabase', () => ({ searchProductsPage: api.search }));
const profile: UserPetProfile = { ...DEFAULT_USER_PET_PROFILE, id: 'pet', name: '로니' };
const ingredient = (name: string): Ingredient => ({ id: name, nameKo: name, nameEn: name, riskLevel: 'safe', purpose: '' });
const food: Product = {
  id: '90', name: '닭고기 사료', brand: '테스트', category: 'food', targetPetType: 'dog',
  imageUrl: '', reviewsCount: 0, averageRating: 0, analysisStatus: 'ready', ingredients: [ingredient('닭고기')],
};
beforeEach(() => api.search.mockReset());

describe('qualified home recommendations', () => {
  it('uses the actual personalized verdict at the inclusive 90-point boundary', () => {
    const preferred: Product = {
      ...food, id: '89', ingredients: [ingredient('닭고기'), ingredient('유산균'), ingredient('타우린')],
      guaranteedAnalysis: { crudeProtein: 30, crudeFat: 15, crudeFiber: 3, crudeAsh: 8, moisture: 10 },
    };
    const pet = { ...profile, productPreferences: { '89': 3 } };
    expect(resolveProductDisplayVerdict(preferred, pet).score).toBe(89);
    expect(resolveProductDisplayVerdict(food, pet).score).toBe(90);
    expect(selectHomeRecommendations([preferred, food], pet).map(({ product }) => product.id)).toEqual(['90']);
  });

  it('excludes missing species, incomplete evidence, allergy conflicts and veterinary guidance', () => {
    const unknown = [
      { ...food, id: 'no-species', targetPetType: undefined },
      { ...food, id: 'no-label', ingredients: [] },
      { ...food, id: 'partial', unknownIngredientTerms: ['미확인 원료'] },
      { ...food, id: 'blocked', analysisStatus: 'blocked' as const },
      { ...food, id: 'vet', requiresVeterinaryGuidance: true },
    ];
    expect(selectHomeRecommendations(unknown, profile)).toEqual([]);
    expect(selectHomeRecommendations([food], { ...profile, allergies: ['닭'] })).toEqual([]);
    expect(selectHomeRecommendations([food], DEFAULT_USER_PET_PROFILE)).toEqual([]);
    expect(selectHomeRecommendations([{ ...food, targetPetType: 'all' }], profile)).toHaveLength(1);
  });

  it('sorts qualifying products by capped score then stable ID, deduplicates, and limits to three', () => {
    const higher = { ...food, id: 'higher', ingredients: [ingredient('닭고기'), ingredient('유산균')] };
    expect(resolveProductDisplayVerdict(higher, profile).score).toBeGreaterThan(90);
    const products = ['c', 'b', 'a', 'b'].map((id) => ({ ...food, id }));
    expect(selectHomeRecommendations([...products, higher], profile).map(({ product }) => product.id)).toEqual(['higher', 'a', 'b']);
  });

  it('continues beyond a low-score first page, including pages with no candidates', async () => {
    api.search.mockResolvedValueOnce({ products: [{ ...food, targetPetType: 'cat' }], nextOffset: 100 });
    api.search.mockResolvedValueOnce({ products: [], nextOffset: 200 });
    api.search.mockResolvedValueOnce({ products: [food], nextOffset: null });
    expect((await loadHomeRecommendations(profile)).map(({ product }) => product.id)).toEqual(['90']);
    expect(api.search.mock.calls.map((call) => call[4])).toEqual([0, 100, 200]);
  });

  it('stops loading once three qualifying products are found', async () => {
    api.search.mockResolvedValueOnce({ products: ['a', 'b', 'c'].map((id) => ({ ...food, id })), nextOffset: 100 });
    expect(await loadHomeRecommendations(profile)).toHaveLength(3);
    expect(api.search).toHaveBeenCalledTimes(1);
  });

  it('does not count duplicate IDs across pages as additional recommendations', async () => {
    api.search.mockResolvedValueOnce({ products: [food], nextOffset: 100 });
    api.search.mockResolvedValueOnce({ products: [food, food], nextOffset: 200 });
    api.search.mockResolvedValueOnce({ products: [{ ...food, id: 'other' }], nextOffset: null });
    expect(await loadHomeRecommendations(profile)).toHaveLength(2);
    expect(api.search).toHaveBeenCalledTimes(3);
  });

  it('returns empty after exhausting the catalog instead of falling back to low-scoring entries', async () => {
    api.search.mockResolvedValueOnce({ products: [{ ...food, targetPetType: 'cat' }], nextOffset: null });
    expect(await loadHomeRecommendations(profile)).toEqual([]);
  });

  it('stops an obsolete profile request before reading another page', async () => {
    let cancelled = false;
    api.search.mockImplementationOnce(async () => {
      cancelled = true;
      return { products: [food], nextOffset: 100 };
    });
    expect(await loadHomeRecommendations(profile, () => cancelled)).toEqual([]);
    expect(api.search).toHaveBeenCalledTimes(1);
  });

  it('propagates unavailable data and rejects a non-advancing cursor instead of claiming no matches', async () => {
    api.search.mockRejectedValueOnce(new Error('offline'));
    await expect(loadHomeRecommendations(profile)).rejects.toThrow('offline');
    api.search.mockResolvedValueOnce({ products: [], nextOffset: 0 });
    await expect(loadHomeRecommendations(profile)).rejects.toThrow('추천 제품을 불러오지 못했습니다.');
  });
});
