import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useStore } from '../store/useStore';
import { DEFAULT_USER_PET_PROFILE, type Product } from '../types';
import Detail from './Detail';

vi.mock('../lib/supabase', async original => ({
  ...await original<typeof import('../lib/supabase')>(), getReviews: vi.fn().mockResolvedValue([]),
}));
const initial = useStore.getState();
const shareDescriptor = Object.getOwnPropertyDescriptor(navigator, 'share');
const share = vi.fn().mockResolvedValue(undefined);
const fixture: Product = { id: 'layout-fixture', name: '합성 레이아웃 제품', brand: '합성 브랜드',
  category: 'food', imageUrl: '', ingredients: [], analysisStatus: 'unavailable',
  reviewsCount: 0, averageRating: 0 };
beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
  Object.defineProperty(navigator, 'share', { configurable: true, value: share.mockClear() });
  useStore.setState({ ...initial, profile: DEFAULT_USER_PET_PROFILE, isLoggedIn: false, userId: null,
    pets: [], selectedProduct: fixture, isLoadingProducts: false, productDetailError: '',
    fetchProductDetail: vi.fn().mockResolvedValue(undefined), trackRecentView: vi.fn() });
});
afterEach(() => {
  cleanup(); useStore.setState(initial); vi.restoreAllMocks();
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
  if (shareDescriptor) Object.defineProperty(navigator, 'share', shareDescriptor);
  else Reflect.deleteProperty(navigator, 'share');
});
function show() {
  render(<HelmetProvider><MemoryRouter initialEntries={['/search', '/product/layout-fixture']}>
    <Routes>
      <Route path="/product/:id" element={<Detail />} />
      <Route path="/search" element={<h1>합성 탐색 화면</h1>} />
      <Route path="/login" element={<h1>합성 로그인 화면</h1>} />
    </Routes>
  </MemoryRouter></HelmetProvider>);
}
const tools = () => screen.getByRole('group', { name: '빠른 이동 버튼' });
it('places navigation after the last content and before the unchanged action bar', async () => {
  show(); await screen.findByText('아직 별점이 없습니다. 첫 별점을 남겨 주세요.');
  const review = screen.getByRole('heading', { name: '후기 0' }).closest('section')!;
  expect(review.compareDocumentPosition(tools()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(tools().compareDocumentPosition(screen.getByRole('region', { name: '제품 액션' })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
it('keeps the existing back action', () => {
  show(); fireEvent.click(within(tools()).getByRole('button', { name: '뒤로 가기' }));
  expect(screen.getByRole('heading', { name: '합성 탐색 화면' })).toBeTruthy();
});
it('keeps product sharing without transmitting anything in this synthetic test', () => {
  show(); fireEvent.click(within(tools()).getByRole('button', { name: '공유하기' }));
  expect(share).toHaveBeenCalledWith(expect.objectContaining({ url: expect.stringContaining('/product/layout-fixture') }));
});
it('keeps the real scroll-to-top utility available after scrolling', () => {
  show(); expect(within(tools()).queryByRole('button', { name: '맨 위로 이동' })).toBeNull();
  act(() => { Object.defineProperty(window, 'scrollY', { configurable: true, value: 500 }); window.dispatchEvent(new Event('scroll')); });
  vi.mocked(window.scrollTo).mockClear();
  fireEvent.click(within(tools()).getByRole('button', { name: '맨 위로 이동' }));
  expect(window.scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }));
});
it('keeps the guest feeding-log action routed to login without saving', () => {
  show(); fireEvent.click(screen.getByRole('button', { name: '섭취 기록 추가' }));
  expect(screen.getByRole('heading', { name: '합성 로그인 화면' })).toBeTruthy();
});
