import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useStore } from '../store/useStore';
import type { Product } from '../types';
import RecentProducts from './RecentProducts';

const fetchRecent = vi.fn().mockResolvedValue(undefined);
const history: Product[] = Array.from({ length: 15 }, (_, i) => ({ id: `p${i}`, name: `최근 제품 ${i}`, brand: '예시', category: 'food', ingredients: [], imageUrl: '', reviewsCount: 0, averageRating: 0 }));
beforeEach(() => { fetchRecent.mockClear(); useStore.setState({ userId: 'owner', recentViews: history, isLoadingRecentViews: false, recentViewsError: '', fetchRecentViews: fetchRecent }); });
afterEach(cleanup);
const show = () => render(<MemoryRouter><RecentProducts /></MemoryRouter>);
describe('recent history screen', () => {
  it('renders every viewed product in stored visit order, without compatibility sorting', () => {
    show();
    const rows = within(screen.getByRole('list', { name: '최근 본 순' })).getAllByRole('listitem');
    expect(rows).toHaveLength(15);
    rows.forEach((row, i) => expect(row.textContent).toContain(`최근 제품 ${i}`));
    expect(fetchRecent).toHaveBeenCalledWith();
  });
  it('distinguishes loading, failure with retry, and empty history', () => {
    useStore.setState({ isLoadingRecentViews: true, recentViews: [] });
    show();
    expect(screen.getByRole('status').textContent).toContain('불러오는 중');
    act(() => useStore.setState({ isLoadingRecentViews: false, recentViewsError: 'offline' }));
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.queryByText('최근 본 상품이 없습니다')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(fetchRecent).toHaveBeenCalledTimes(2);
    act(() => useStore.setState({ recentViewsError: '' }));
    expect(screen.getByText('최근 본 상품이 없습니다')).toBeTruthy();
  });
});
