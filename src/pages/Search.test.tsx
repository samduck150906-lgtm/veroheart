import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { DEFAULT_USER_PET_PROFILE } from '../types';
import Search from './Search';

const api = vi.hoisted(() => ({ search: vi.fn() }));
vi.mock('../lib/supabase', async (original) => ({
  ...await original<typeof import('../lib/supabase')>(),
  searchProductsPage: api.search,
  getAllIngredients: async () => [],
}));
vi.mock('../lib/productCategories', () => ({ useProductCategories: () => [] }));

function Navigation() {
  const navigate = useNavigate();
  return <button onClick={() => navigate('/search')}>기본 검색 열기</button>;
}
const show = (route = '/search') => render(<MemoryRouter initialEntries={[route]}><Search /><Navigation /></MemoryRouter>);
const finishDebounce = () => act(async () => { await vi.advanceTimersByTimeAsync(401); });

beforeEach(() => {
  vi.useFakeTimers(); localStorage.clear();
  api.search.mockReset().mockResolvedValue({ products: [], nextOffset: null });
  useStore.setState({ profile: { ...DEFAULT_USER_PET_PROFILE, species: 'Cat', name: '고양이' }, products: [], catalogRevision: 0, comparisonList: ['one', 'two'] });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('search defaults and refresh', () => {
  it('loads the public catalog without requiring a query or profile species filter', async () => {
    show();
    expect(screen.queryByText('검색 결과가 없어요')).toBeNull();
    expect(screen.queryByRole('button', { name: /비교함/ })).toBeNull();
    await finishDebounce();
    expect(api.search).toHaveBeenCalledWith('', '전체', [], expect.objectContaining({ targetPetType: undefined }));
  });

  it('clears an old URL keyword when navigation returns to unfiltered search', async () => {
    show('/search?q=연어');
    await finishDebounce();
    fireEvent.click(screen.getByRole('button', { name: '기본 검색 열기' }));
    await finishDebounce();
    expect(screen.getByRole('searchbox')).toHaveProperty('value', '');
    expect(api.search.mock.calls.at(-1)?.[0]).toBe('');
  });

  it('shows a query failure instead of a false empty catalog', async () => {
    api.search.mockRejectedValue(new Error('연결을 다시 확인해 주세요.'));
    show();
    await finishDebounce();
    expect(screen.getByRole('alert').textContent).toContain('연결을 다시 확인해 주세요.');
    expect(screen.queryByText('검색 결과가 없어요')).toBeNull();
  });

  it('refreshes results after the public catalog revision changes', async () => {
    show();
    await finishDebounce();
    expect(api.search).toHaveBeenCalledTimes(1);
    act(() => useStore.setState({ catalogRevision: 1 }));
    await finishDebounce();
    expect(api.search).toHaveBeenCalledTimes(2);
  });
});
