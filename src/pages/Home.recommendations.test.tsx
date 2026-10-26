import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { useStore } from '../store/useStore';
import { DEFAULT_USER_PET_PROFILE, type Product, type UserPetProfile } from '../types';
import { resolveProductDisplayVerdict } from '../utils/displayVerdict';
import Home from './Home';

const api = vi.hoisted(() => ({ search: vi.fn() }));
vi.mock('../lib/supabase', async (importOriginal) => ({
  ...await importOriginal<typeof import('../lib/supabase')>(),
  searchProductsPage: api.search,
}));
vi.mock('../lib/productCategories', () => ({ useProductCategories: () => [] }));

const dog: UserPetProfile = { ...DEFAULT_USER_PET_PROFILE, id: 'dog', name: '로니' };
const cat: UserPetProfile = { ...dog, id: 'cat', name: '영이', species: 'Cat' };
const food: Product = {
  id: 'food', name: '테스트 닭고기 사료', brand: '테스트', category: 'food', targetPetType: 'dog',
  imageUrl: '', reviewsCount: 0, averageRating: 0, analysisStatus: 'ready',
  ingredients: [{ id: 'chicken', nameKo: '닭고기', nameEn: 'chicken', purpose: '', riskLevel: 'safe' }],
};
function Destination() {
  const location = useLocation();
  return <output data-testid="destination">{JSON.stringify({ path: location.pathname + location.search, state: location.state })}</output>;
}
const show = () => render(<HelmetProvider><MemoryRouter><Home /><Destination /></MemoryRouter></HelmetProvider>);
const recommendationSection = () => screen.getByRole('region', { name: '로니에게 잘 맞는 제품' });

beforeEach(() => {
  api.search.mockReset().mockResolvedValue({ products: [food], nextOffset: null });
  useStore.setState({ profile: dog, products: [], recentViews: [], isLoggedIn: true });
});
afterEach(cleanup);

describe('home recommendations', () => {
  it('does not recommend any of the initial catalog when all candidates score zero', async () => {
    const wrongSpecies = { ...food, targetPetType: 'cat' as const };
    expect(resolveProductDisplayVerdict(wrongSpecies, dog).score).toBe(0);
    useStore.setState({ products: [wrongSpecies] });
    api.search.mockResolvedValue({ products: [wrongSpecies], nextOffset: null });
    show();
    await screen.findByText('현재 등록된 제품 중 궁합 점수 90점 이상인 제품이 없습니다.');
    expect(screen.queryByRole('button', { name: /테스트 닭고기 사료/ })).toBeNull();
  });

  it('loads full evidence, shows a real 90-point product, and retains viewed products as eligible', async () => {
    expect(resolveProductDisplayVerdict(food, dog).score).toBe(90);
    useStore.setState({ products: [{ ...food, ingredients: [] }], recentViews: [food] });
    show();
    await screen.findByText('로니 기준 궁합 점수 90점');
    expect(screen.getByText('궁합 점수 90점 이상')).toBeTruthy();
    expect(within(recommendationSection()).getByRole('button', { name: /테스트 닭고기 사료/ })).toBeTruthy();
    expect(screen.getByRole('heading', { name: '최근 본 상품' })).toBeTruthy();
    expect(api.search).toHaveBeenCalledWith('', undefined, [], { targetPetType: 'dog' }, 0);
  });

  it('never fills remaining slots with unscorable, veterinary-only, or incompatible products', async () => {
    api.search.mockResolvedValue({ products: [
      food,
      { ...food, id: 'unknown', name: '정보 미확인', unknownIngredientTerms: ['미확인'] },
      { ...food, id: 'veterinary', name: '수의사 상담 제품', requiresVeterinaryGuidance: true },
      { ...food, id: 'low', name: '다른 동물 제품', targetPetType: 'cat' },
    ], nextOffset: null });
    show();
    await screen.findByText('로니 기준 궁합 점수 90점');
    expect(within(recommendationSection()).getAllByRole('button')).toHaveLength(1);
  });

  it.each([false, true])('does not personalize a default or logged-out profile (logged in: %s)', (isLoggedIn) => {
    useStore.setState({ isLoggedIn, profile: isLoggedIn ? DEFAULT_USER_PET_PROFILE : dog, products: [food] });
    show();
    expect(screen.queryByText('궁합 점수 90점 이상')).toBeNull();
    expect(api.search).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '우리 아이를 등록하고 궁합을 확인해 주세요.' }));
    expect(JSON.parse(screen.getByTestId('destination').textContent!)).toEqual(isLoggedIn
      ? { path: '/profile?tab=pets', state: null }
      : { path: '/login', state: { from: '/profile?tab=pets' } });
  });

  it('replaces completed recommendations with registration guidance immediately on logout', async () => {
    show();
    await screen.findByText('로니 기준 궁합 점수 90점');
    expect(screen.queryByRole('button', { name: '우리 아이를 등록하고 궁합을 확인해 주세요.' })).toBeNull();
    act(() => useStore.setState({ isLoggedIn: false }));
    expect(screen.queryByText(/기준 궁합 점수/)).toBeNull();
    expect(screen.queryByRole('region', { name: '로니에게 잘 맞는 제품' })).toBeNull();
    expect(screen.getByRole('button', { name: '우리 아이를 등록하고 궁합을 확인해 주세요.' })).toBeTruthy();
  });

  it('ignores a recommendation response that arrives after logout', async () => {
    let resolvePage!: (page: { products: Product[]; nextOffset: null }) => void;
    api.search.mockReturnValueOnce(new Promise((resolve) => { resolvePage = resolve; }));
    show();
    act(() => useStore.setState({ isLoggedIn: false }));
    await act(async () => resolvePage({ products: [food], nextOffset: null }));
    expect(screen.queryByText(/기준 궁합 점수/)).toBeNull();
    expect(screen.getByRole('button', { name: '우리 아이를 등록하고 궁합을 확인해 주세요.' })).toBeTruthy();
  });

  it('hides the previous pet immediately and ignores an earlier response after switching pets', async () => {
    let resolveDog!: (page: { products: Product[]; nextOffset: null }) => void;
    api.search.mockReturnValueOnce(new Promise((resolve) => { resolveDog = resolve; }));
    const catFood = { ...food, id: 'cat-food', name: '고양이 사료', targetPetType: 'cat' as const };
    api.search.mockResolvedValueOnce({ products: [catFood], nextOffset: null });
    show();
    act(() => useStore.setState({ profile: cat }));
    await screen.findByText('영이 기준 궁합 점수 90점');
    await act(async () => resolveDog({ products: [food], nextOffset: null }));
    expect(screen.queryByText('로니 기준 궁합 점수 90점')).toBeNull();
    expect(screen.queryByText(food.name)).toBeNull();
    expect(screen.getByText('영이 기준 궁합 점수 90점')).toBeTruthy();
  });

  it('clears completed recommendations when the selected pet acquires an allergy', async () => {
    show();
    await screen.findByText('로니 기준 궁합 점수 90점');
    act(() => useStore.setState({ profile: { ...dog, allergies: ['닭'] } }));
    expect(screen.queryByText('로니 기준 궁합 점수 90점')).toBeNull();
    await screen.findByText('현재 등록된 제품 중 궁합 점수 90점 이상인 제품이 없습니다.');
  });

  it('distinguishes a fetch error from no qualifying products and supports retry', async () => {
    api.search.mockRejectedValueOnce(new Error('offline'));
    show();
    await screen.findByText('추천 제품을 불러오지 못했습니다.');
    expect(screen.queryByText(/90점 이상인 제품이 없습니다/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    await screen.findByText('로니 기준 궁합 점수 90점');
    await waitFor(() => expect(api.search).toHaveBeenCalledTimes(2));
  });
});
