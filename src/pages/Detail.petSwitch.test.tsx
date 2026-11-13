import { reviewedLabelFixture } from '../test/reviewedLabelFixture';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStore } from '../store/useStore';
import { restoreSelectedPet } from '../lib/petPreferences';
import { DEFAULT_USER_PET_PROFILE, type Product, type UserPetProfile } from '../types';
import Detail from './Detail';

vi.mock('../lib/supabase', async importOriginal => ({
  ...await importOriginal<typeof import('../lib/supabase')>(), getReviews: vi.fn().mockResolvedValue([]),
}));
const first: UserPetProfile = { ...DEFAULT_USER_PET_PROFILE, id: 'first', name: '로니', allergies: [], createdAt: '2025-01-01' };
const second: UserPetProfile = { ...first, id: 'second', name: '모찌', allergies: ['닭'], createdAt: '2025-02-01' };
const cat: UserPetProfile = { ...first, id: 'cat', name: '나비', species: 'Cat', createdAt: '2025-03-01' };
const product: Product = reviewedLabelFixture({
  id: 'food', name: '닭고기 사료', brand: '브랜드', category: 'food', targetPetType: 'dog',
  imageUrl: '', reviewsCount: 0, averageRating: 0, analysisStatus: 'ready',
  ingredients: [{ id: 'chicken', nameKo: '닭고기', nameEn: 'chicken', purpose: '', riskLevel: 'safe' }],
});
const initialState = useStore.getState();
beforeEach(() => {
  localStorage.clear();
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  useStore.setState({ ...initialState, profile: first, activePetId: first.id, isLoggedIn: true, userId: 'owner',
    pets: [first, second, cat], products: [], selectedProduct: product, favorites: [], isLoadingProducts: false,
    fetchProductDetail: vi.fn().mockResolvedValue(undefined), trackRecentView: vi.fn() });
});
afterEach(() => { cleanup(); useStore.setState(initialState); localStorage.clear(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const show = () => render(<HelmetProvider><MemoryRouter initialEntries={['/product/food']}>
  <Routes><Route path="/product/:id" element={<Detail />} /></Routes>
</MemoryRouter></HelmetProvider>);
const picker = () => screen.getByRole('group', { name: '궁합을 확인할 반려동물' });

describe('product detail pet switching', () => {
  it('accepts a saved pet with no allergies instead of asking for a nonexistent allergy', async () => {
    show();
    await screen.findByRole('heading', { level: 1, name: '닭고기 사료' });
    expect(screen.queryByText('알레르기 프로필을 채워 주세요')).toBeNull();
    expect(screen.queryByText('프로필 미등록')).toBeNull();
  });

  it('does not offer a personalized feeding calculator for another species', async () => {
    useStore.setState({ profile: { ...cat, weightKg: 4.2 }, activePetId: cat.id });
    show();
    await screen.findByRole('heading', { level: 1, name: '닭고기 사료' });
    expect(screen.getByText(/나비의 종과 제품의 급여 대상이 다릅니다/)).toBeTruthy();
    expect(screen.queryByRole('heading', { name: /나비.*급여량/ })).toBeNull();
    expect(screen.getByRole('heading', { name: '열량 기준 참고 급여량 안내' })).toBeTruthy();
    expect(screen.queryByText(/하루 약 .*g/)).toBeNull();
    expect(screen.getAllByText(/영양정보 부족으로 영양 균형을 평가할 수 없/).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: '몸무게 입력하러 가기' })).toBeNull();
  });
  it('switches the actual saved profile and updates compatibility and allergy warnings without leaving the product', async () => {
    show();
    const originalFit = await screen.findByRole('region', { name: '로니 참고 평가' });
    expect(Number(within(originalFit).getByText(/^\d+점$/).textContent?.replace('점', ''))).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: '닭고기 알레르기' })).toBeNull();
    fireEvent.click(within(picker()).getByRole('button', { name: '모찌 선택' }));
    const fit = screen.getByRole('region', { name: '모찌 참고 평가' });
    expect(screen.queryByRole('region', { name: '로니 참고 평가' })).toBeNull();
    expect(within(fit).getByText('0점')).toBeTruthy();
    expect(screen.getByRole('button', { name: '닭고기 알레르기' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1, name: '닭고기 사료' })).toBeTruthy();
    expect(useStore.getState().activePetId).toBe('second');
    expect(restoreSelectedPet('owner', [first, second, cat], null)?.id).toBe('second');
    expect(within(picker()).getByRole('button', { name: '모찌 선택', pressed: true })).toBeTruthy();
  });

  it('keeps registration order instead of moving the selected pet to the front', async () => {
    show();
    await screen.findByRole('region', { name: '로니 참고 평가' });
    const names = () => within(picker()).getAllByRole('button').map(button => button.getAttribute('aria-label'));
    expect(names()).toEqual(['로니 선택', '모찌 선택', '나비 선택']);
    fireEvent.click(within(picker()).getByRole('button', { name: '나비 선택' }));
    expect(names()).toEqual(['로니 선택', '모찌 선택', '나비 선택']);
    expect(within(screen.getByRole('region', { name: '나비 참고 평가' })).getByText('0점')).toBeTruthy();
  });

  it.each([
    { loggedIn: false, ownedPets: [first, second] },
    { loggedIn: true, ownedPets: [first] },
    { loggedIn: true, ownedPets: [] },
  ])('does not offer switching without multiple authenticated pets (%j)', async ({ loggedIn, ownedPets }) => {
    useStore.setState({ isLoggedIn: loggedIn, userId: loggedIn ? 'owner' : null, pets: ownedPets });
    show();
    await screen.findByRole('heading', { level: 1, name: '닭고기 사료' });
    expect(screen.queryByRole('group', { name: '궁합을 확인할 반려동물' })).toBeNull();
  });

  it('still permits pet switching when the product has no scoreable ingredient data', async () => {
    useStore.setState({ selectedProduct: { ...product, ingredients: [], analysisStatus: 'unavailable' } });
    show();
    await screen.findByRole('heading', { level: 1, name: '닭고기 사료' });
    fireEvent.click(within(picker()).getByRole('button', { name: '모찌 선택' }));
    expect(useStore.getState().activePetId).toBe('second');
    expect(screen.queryByRole('region', { name: '모찌 참고 평가' })).toBeNull();
  });

  it('re-evaluates an open ingredient sheet when the active pet changes, in either direction', async () => {
    show();
    await screen.findByRole('region', { name: '로니 참고 평가' });
    fireEvent.click(screen.getByRole('button', { name: '닭고기 일반 원료' }));
    const sheet = screen.getByRole('dialog', { name: '닭고기' });
    act(() => useStore.getState().selectPet(second.id));
    expect(within(sheet).getByText(/모찌의 등록한 회피 성분과 직접 일치/)).toBeTruthy();
    act(() => useStore.getState().selectPet(first.id));
    expect(within(sheet).queryByText(/등록한 회피 성분과 직접 일치/)).toBeNull();
  });
});
