import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { DEFAULT_USER_PET_PROFILE } from '../types';
import Search from './Search';

const api = vi.hoisted(() => ({ search: vi.fn(), categories: [] as import('../lib/productCategories').ProductCategory[] }));
vi.mock('../lib/supabase', async (original) => ({
  ...await original<typeof import('../lib/supabase')>(),
  searchProductsPage: api.search,
  getAllIngredients: async () => [],
}));
vi.mock('../lib/productCategories', async (original) => ({
  ...await original<typeof import('../lib/productCategories')>(),
  useProductCategories: () => api.categories,
}));

function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();
  return <><button onClick={() => navigate('/search')}>기본 검색 열기</button>
    <button onClick={() => navigate(-1)}>뒤로</button>
    <output data-testid="route">{location.search}</output></>;
}
const show = (route = '/search') => render(<MemoryRouter initialEntries={[route]}><Search /><Navigation /></MemoryRouter>);
const finishDebounce = () => act(async () => { await vi.advanceTimersByTimeAsync(401); });

beforeEach(() => {
  vi.useFakeTimers(); localStorage.clear();
  api.categories = [
    { name: '사료', hint: null, subCategories: ['dry', '습식'] },
    { name: '간식', hint: null, subCategories: ['snack'] },
  ];
  api.search.mockReset().mockResolvedValue({ products: [], nextOffset: null });
  useStore.setState({ profile: { ...DEFAULT_USER_PET_PROFILE, species: 'Cat', name: '고양이' }, products: [], catalogRevision: 0, comparisonList: ['one', 'two'] });
});

describe('category navigation', () => {
  it('resolves a late hierarchy and ignores an older unresolved request', async () => {
    const hierarchy = api.categories;
    api.categories = [{ name: '사료', hint: null }];
    let finishOld!: (value: { products: []; nextOffset: number | null }) => void;
    api.search.mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve; }));
    const view = show('/search?category=dry');
    await finishDebounce();
    expect(api.search.mock.calls[0][1]).toBe('dry');
    api.categories = hierarchy;
    view.rerender(<MemoryRouter initialEntries={['/search?category=dry']}><Search /><Navigation /></MemoryRouter>);
    await finishDebounce();
    expect(api.search).toHaveBeenLastCalledWith('', '사료', [], expect.objectContaining({ subCategory: 'dry' }));
    await act(async () => finishOld({ products: [], nextOffset: 100 }));
    expect(screen.queryByRole('button', { name: '제품 더 불러오기' })).toBeNull();
    expect(screen.getByText('이 분류에서 현재 볼 수 있는 제품이 없습니다. 다른 분류를 선택해 주세요.')).toBeTruthy();
  });

  it.each([
    ['/search?category=dry', '사료', 'dry'],
    ['/search?category=snack', '간식', 'snack'],
    ['/search?category=사료&subCategory=dry', '사료', 'dry'],
  ])('loads a child category with its parent on direct entry: %s', async (route, main, child) => {
    show(route);
    await finishDebounce();
    expect(api.search).toHaveBeenLastCalledWith('', main, [], expect.objectContaining({ subCategory: child }));
    expect(within(screen.getByRole('group', { name: `${main} 세부 분류` })).getByRole('button', { name: child }).getAttribute('aria-pressed')).toBe('true');
  });

  it('selects children using the URL and restores the selection on back navigation', async () => {
    show('/search?category=사료');
    await finishDebounce();
    fireEvent.click(screen.getByRole('button', { name: 'dry' }));
    await finishDebounce();
    const params = new URLSearchParams(screen.getByTestId('route').textContent ?? '');
    expect(params.get('category')).toBe('사료');
    expect(params.get('subCategory')).toBe('dry');
    fireEvent.click(screen.getByRole('button', { name: '간식', exact: true }));
    await finishDebounce();
    expect(api.search.mock.calls.at(-1)?.[3].subCategory).toBeUndefined();
    expect(screen.queryByRole('button', { name: 'dry' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '뒤로' }));
    await finishDebounce();
    expect(api.search).toHaveBeenLastCalledWith('', '사료', [], expect.objectContaining({ subCategory: 'dry' }));
  });

  it('keeps the child category when loading more results', async () => {
    api.search.mockResolvedValueOnce({ products: [], nextOffset: 60 });
    show('/search?category=dry');
    await finishDebounce();
    fireEvent.click(screen.getByRole('button', { name: '제품 더 불러오기' }));
    await act(async () => {});
    expect(api.search).toHaveBeenLastCalledWith('', '사료', [], expect.objectContaining({ subCategory: 'dry' }), 60);
  });

  it('clears extra filters from an empty result without losing the selected child category', async () => {
    show('/search?category=dry');
    await finishDebounce();
    fireEvent.click(screen.getByRole('button', { name: '필터', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: '강아지', exact: true }));
    await finishDebounce();
    fireEvent.click(screen.getByRole('button', { name: '0개 결과 보기' }));
    fireEvent.click(screen.getByRole('button', { name: '상세 필터 해제' }));
    await finishDebounce();
    expect(api.search).toHaveBeenLastCalledWith('', '사료', [], expect.objectContaining({ subCategory: 'dry', targetPetType: undefined }));
  });

  it('offers other products when a category has no publicly available products', async () => {
    show('/search?category=dry');
    await finishDebounce();
    expect(screen.getByText('이 분류에서 현재 볼 수 있는 제품이 없습니다. 다른 분류를 선택해 주세요.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '전체 제품 보기' }));
    await finishDebounce();
    expect(api.search).toHaveBeenLastCalledWith('', '전체', [], expect.objectContaining({ subCategory: undefined }));
  });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('search defaults and refresh', () => {
  it('loads the public catalog without requiring a query or profile species filter', async () => {
    show();
    expect(screen.queryByText('검색 결과가 없습니다')).toBeNull();
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
    expect(screen.queryByText('검색 결과가 없습니다')).toBeNull();
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
