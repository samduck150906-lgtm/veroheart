import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStore } from '../store/useStore';
import { DEFAULT_USER_PET_PROFILE, type Product } from '../types';
import Detail from './Detail';

vi.mock('../lib/supabase', async importOriginal => ({
  ...await importOriginal<typeof import('../lib/supabase')>(), getReviews: vi.fn().mockResolvedValue([]),
}));
const pet = { ...DEFAULT_USER_PET_PROFILE, id: 'pet', name: '로니' };
const product: Product = {
  id: 'food', name: '닭고기 사료', brand: '브랜드', category: 'food', targetPetType: 'dog',
  imageUrl: '', reviewsCount: 0, averageRating: 0, analysisStatus: 'ready',
  ingredients: [{ id: 'chicken', nameKo: '닭고기', nameEn: 'chicken', purpose: '', riskLevel: 'safe' }],
};
beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  useStore.setState({ profile: pet, isLoggedIn: true, userId: 'user', pets: [pet], products: [],
    selectedProduct: product, favorites: [], isLoadingProducts: false,
    fetchProductDetail: vi.fn().mockResolvedValue(undefined), trackRecentView: vi.fn() });
});
afterEach(cleanup);
const show = () => render(<HelmetProvider><MemoryRouter initialEntries={['/product/food']}>
  <Routes><Route path="/product/:id" element={<Detail />} /></Routes>
</MemoryRouter></HelmetProvider>);

describe('product detail guest compatibility', () => {
  it('replaces fit percentage and personal conclusions with registration guidance on logout', async () => {
    show();
    await screen.findByRole('region', { name: '로니 적합도' });
    act(() => useStore.setState({ isLoggedIn: false, userId: null }));
    expect(screen.queryByRole('region', { name: '로니 적합도' })).toBeNull();
    expect(screen.queryByText(/현재 궁합 점수는/)).toBeNull();
    expect(screen.getByRole('button', { name: '우리 아이 등록하고 제품 궁합 알아보자!' })).toBeTruthy();
  });

  it('clears personalized allergy warnings in an already-open ingredient sheet on logout', async () => {
    useStore.setState({ profile: { ...pet, allergies: ['닭'] } });
    show();
    fireEvent.click(screen.getByRole('button', { name: '닭고기 알레르기' }));
    const sheet = screen.getByRole('dialog', { name: '닭고기' });
    expect(within(sheet).getByText(/로니의 알레르기 유발 성분/)).toBeTruthy();
    act(() => useStore.setState({ isLoggedIn: false, userId: null }));
    expect(within(sheet).queryByText(/알레르기 유발 성분/)).toBeNull();
  });
});
