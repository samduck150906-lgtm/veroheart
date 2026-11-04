import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
const api = vi.hoisted(() => ({ list: vi.fn(), moderate: vi.fn() }));
vi.mock('../../lib/adminSupportApi', () => ({
  fetchAdminReviews: api.list,
  moderateReview: api.moderate,
}));
import AdminReviews from './AdminReviews';
const row = {
  id: 'review',
  user_id: 'member',
  product_id: 'food',
  rating: 4,
  is_hidden: false,
  created_at: '2026-11-04T00:00:00Z',
  users: { nickname: 'QA보호자' },
  products: { name: 'QA 사료' },
};
beforeEach(() => {
  api.list.mockReset().mockResolvedValue({ rows: [row], total: 1 });
  api.moderate.mockReset().mockResolvedValue({ ok: true });
});
afterEach(cleanup);
it('keeps member scope, requires a moderation reason and reloads after hiding', async () => {
  render(
    <MemoryRouter initialEntries={['/admin/reviews?userId=member']}>
      <AdminReviews />
    </MemoryRouter>,
  );
  await screen.findByText('QA보호자');
  expect(api.list).toHaveBeenCalledWith(
    expect.objectContaining({ userId: 'member' }),
  );
  fireEvent.click(screen.getByRole('button', { name: '숨김', exact: true }));
  expect(screen.getByRole('button', { name: '정정 저장' })).toHaveProperty(
    'disabled',
    true,
  );
  fireEvent.change(screen.getByLabelText('처리 사유 (필수)'), {
    target: { value: 'QA 노출 검증' },
  });
  api.list.mockResolvedValue({ rows: [{ ...row, is_hidden: true }], total: 1 });
  fireEvent.click(screen.getByRole('button', { name: '정정 저장' }));
  await waitFor(() =>
    expect(api.moderate).toHaveBeenCalledWith(row, 'QA 노출 검증'),
  );
  expect(
    await screen.findByRole('button', { name: '복구', exact: true }),
  ).toBeTruthy();
});
it('can submit the same search again without remaining in loading state', async () => {
  render(
    <MemoryRouter>
      <AdminReviews />
    </MemoryRouter>,
  );
  await screen.findByText('QA보호자');
  fireEvent.click(screen.getByRole('button', { name: '검색', exact: true }));
  await waitFor(() => expect(api.list).toHaveBeenCalledTimes(2));
  await screen.findByText('QA보호자');
  expect(screen.queryByText('별점을 불러오는 중…')).toBeNull();
});
