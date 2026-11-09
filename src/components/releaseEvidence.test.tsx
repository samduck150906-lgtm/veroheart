import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_USER_PET_PROFILE, type Product } from '../types';
import ProductCard from './ProductCard';
import ProductRow from './ProductRow';

const state = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
vi.mock('../store/useStore', () => ({ useStore: () => state.value }));
const unknown: Product = {
  id: 'unresolved', name: '정보 미확인 제품', brand: '제조사', category: 'food', imageUrl: '',
  ingredients: [], analysisStatus: 'ready', unknownIngredientTerms: ['미확인 원료'],
  reviewsCount: 0, averageRating: 0,
};
function prepare() {
  state.value = {
    profile: DEFAULT_USER_PET_PROFILE, favorites: [],
    products: [unknown, { ...unknown, id: 'second', name: '두 번째 제품' }],
    toggleFavorite: vi.fn(),
  };
}
afterEach(cleanup);
describe('public surfaces preserve unresolved evidence', () => {
  it.each([false, true])('card grid=%s does not invent a numeric score', grid => {
    prepare();
    render(<MemoryRouter><ProductCard product={unknown} grid={grid} /></MemoryRouter>);
    expect(screen.getByText('원료 1개 등록')).toBeTruthy();
    expect(screen.queryByText(/^\d+점$/)).toBeNull();
  });
  it('search row withholds grade and fit claim for stale-ready unknown labels', () => {
    prepare();
    render(<MemoryRouter><ProductRow product={unknown} /></MemoryRouter>);
    expect(screen.getByText('원료 1개 등록')).toBeTruthy();
    expect(screen.getByRole('button', { name: '우리 아이를 등록하고 궁합을 확인해 주세요.' })).toBeTruthy();
    expect(screen.queryByText(/^[A-F] \d+$/)).toBeNull();
  });

});
