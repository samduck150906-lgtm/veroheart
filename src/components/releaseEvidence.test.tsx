import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_USER_PET_PROFILE, type Product } from '../types';
import ProductCard from './ProductCard';
import ProductRow from './ProductRow';
import Comparison from '../pages/Comparison';

const state = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
vi.mock('../store/useStore', () => ({ useStore: () => state.value, MAX_COMPARISON: 3 }));
const unknown: Product = {
  id: 'unresolved', name: '정보 미확인 제품', brand: '제조사', category: 'food', imageUrl: '',
  ingredients: [], analysisStatus: 'ready', unknownIngredientTerms: ['미확인 원료'],
  reviewsCount: 0, averageRating: 0,
};
function prepare() {
  state.value = {
    profile: DEFAULT_USER_PET_PROFILE, favorites: [], comparisonList: ['unresolved', 'second'],
    products: [unknown, { ...unknown, id: 'second', name: '두 번째 제품' }],
    toggleFavorite: vi.fn(), addToComparison: vi.fn(), removeFromComparison: vi.fn(),
  };
}
afterEach(cleanup);
describe('public surfaces preserve unresolved evidence', () => {
  it.each([false, true])('card grid=%s does not invent a numeric score', grid => {
    prepare();
    render(<MemoryRouter><ProductCard product={unknown} grid={grid} /></MemoryRouter>);
    expect(screen.getByText('원료 상세 확인 필요')).toBeTruthy();
    expect(screen.queryByText(/^\d+점$/)).toBeNull();
  });
  it('search row withholds grade and fit claim for stale-ready unknown labels', () => {
    prepare();
    render(<MemoryRouter><ProductRow product={unknown} /></MemoryRouter>);
    expect(screen.getByText('원료 상세 확인 필요')).toBeTruthy();
    expect(screen.getByText('원료 확인 필요')).toBeTruthy();
    expect(screen.queryByText(/^[A-F] \d+$/)).toBeNull();
  });
  it('comparison does not call two unanalysed products similarly suitable', () => {
    prepare();
    render(<MemoryRouter><Comparison /></MemoryRouter>);
    expect(screen.getAllByText('분석 정보 부족')).toHaveLength(2);
    expect(screen.queryByText(/비슷하게 잘 맞아|조금 더 잘 맞아/)).toBeNull();
  });
});
