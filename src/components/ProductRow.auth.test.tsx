import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { useStore } from '../store/useStore';
import { DEFAULT_USER_PET_PROFILE, type Product } from '../types';
import ProductRow from './ProductRow';

const pet = { ...DEFAULT_USER_PET_PROFILE, id: 'pet', name: '로니' };
const product: Product = {
  id: 'food', name: '닭고기 사료', brand: '브랜드', category: 'food', targetPetType: 'dog',
  imageUrl: '', reviewsCount: 0, averageRating: 0, analysisStatus: 'ready',
  ingredients: [{ id: 'chicken', nameKo: '닭고기', nameEn: 'chicken', purpose: '', riskLevel: 'safe' }],
};
afterEach(cleanup);

describe('product row personalization boundary', () => {
  it.each([false, true])('offers pet registration without a logged-in pet (logged in: %s)', isLoggedIn => {
    useStore.setState({ isLoggedIn, profile: isLoggedIn ? DEFAULT_USER_PET_PROFILE : pet, favorites: [] });
    render(<MemoryRouter><ProductRow product={product} /></MemoryRouter>);
    expect(screen.queryByText(/에게 딱|무난해/)).toBeNull();
    expect(screen.getByRole('button', { name: '우리 아이 등록하고 제품 궁합 알아보자!' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '닭고기 사료 상세 보기' })).toBeTruthy();
  });

  it('removes a personalized claim on logout even before the pet profile is cleared', () => {
    useStore.setState({ isLoggedIn: true, profile: pet, favorites: [] });
    render(<MemoryRouter><ProductRow product={product} /></MemoryRouter>);
    expect(screen.getByText('로니에게 딱')).toBeTruthy();
    act(() => useStore.setState({ isLoggedIn: false }));
    expect(screen.queryByText('로니에게 딱')).toBeNull();
    expect(screen.getByRole('button', { name: '우리 아이 등록하고 제품 궁합 알아보자!' })).toBeTruthy();
  });
});
