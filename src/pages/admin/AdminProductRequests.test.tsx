import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const api = vi.hoisted(() => ({ list: vi.fn(), review: vi.fn() }));
vi.mock('../../lib/adminApi', () => ({
  fetchProductRequests: api.list,
  reviewProductRequest: api.review,
}));
import AdminProductRequests from './AdminProductRequests';
const row = {
  id: 'request',
  requestedName: 'QA 사료',
  searchQuery: 'QA',
  productUrl: 'javascript:alert(1)',
  note: null,
  status: 'pending',
  createdAt: '2026-11-04T00:00:00Z',
  reviewedBy: null,
  reviewedAt: null,
  reviewNote: null,
  requestCount: 1,
  nickname: 'QA보호자',
};
beforeEach(() => {
  api.list.mockReset().mockResolvedValue({ rows: [row], total: 1 });
  api.review.mockReset().mockResolvedValue(undefined);
});
afterEach(cleanup);
it('requires a handling reason, blocks unsafe links and retains the product management path', async () => {
  render(<AdminProductRequests />);
  await screen.findByText('QA 사료');
  expect(screen.queryByRole('link', { name: /제품 링크/ })).toBeNull();
  expect(
    screen.getByRole('link', { name: '제품 조회·등록 관리' }),
  ).toHaveProperty('href', expect.stringContaining('/admin/products?q='));
  fireEvent.click(
    within(screen.getByRole('table')).getByRole('button', {
      name: '반려',
      exact: true,
    }),
  );
  expect(screen.getByRole('button', { name: '정정 저장' })).toHaveProperty(
    'disabled',
    true,
  );
  fireEvent.change(screen.getByLabelText('처리 사유 (필수)'), {
    target: { value: '공식 제품을 확인할 수 없음' },
  });
  fireEvent.click(screen.getByRole('button', { name: '정정 저장' }));
  await waitFor(() =>
    expect(api.review).toHaveBeenCalledWith(
      'request',
      'rejected',
      '공식 제품을 확인할 수 없음',
    ),
  );
});
it('allows a processed request to return to pending with a reason', async () => {
  api.list.mockResolvedValue({
    rows: [{ ...row, status: 'rejected' }],
    total: 1,
  });
  render(<AdminProductRequests />);
  await screen.findByText('QA 사료');
  fireEvent.click(screen.getByRole('button', { name: '재검토' }));
  fireEvent.change(screen.getByLabelText('처리 사유 (필수)'), {
    target: { value: '공식 링크 확보' },
  });
  fireEvent.click(screen.getByRole('button', { name: '정정 저장' }));
  await waitFor(() =>
    expect(api.review).toHaveBeenCalledWith(
      'request',
      'pending',
      '공식 링크 확보',
    ),
  );
});
