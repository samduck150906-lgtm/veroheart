import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
const api = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock('../../lib/adminSupportApi', () => ({ fetchAdminAudit: api.list }));
import AdminAudit from './AdminAudit';
afterEach(cleanup);
it('loads an exact target and displays reason, operator and before/after values', async () => {
  api.list.mockResolvedValue({
    rows: [
      {
        id: 'audit',
        actor: 'qa-admin',
        action: 'supportCorrection',
        target_table: 'pets',
        target_id: 'pet-id',
        created_at: '2026-11-04T00:00:00Z',
        detail: {
          reason: '보호자 요청',
          before: { weight: 6.8 },
          after: { weight: 7 },
        },
      },
    ],
    total: 1,
  });
  render(
    <MemoryRouter initialEntries={['/admin/audit?targetId=pet-id']}>
      <AdminAudit />
    </MemoryRouter>,
  );
  await screen.findByText('qa-admin');
  expect(api.list).toHaveBeenCalledWith(
    expect.objectContaining({ targetId: 'pet-id' }),
  );
  expect(screen.getByText('보호자 요청')).toBeTruthy();
  expect(screen.getByText(/6.8/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '검색', exact: true }));
  await waitFor(() => expect(api.list).toHaveBeenCalledTimes(2));
  await screen.findByText('qa-admin');
});
