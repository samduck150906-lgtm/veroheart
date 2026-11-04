import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import AdminCorrectionDialog from './AdminCorrectionDialog';
afterEach(cleanup);
it('requires a reason and keeps the draft when saving fails', async () => {
  const save = vi
      .fn()
      .mockRejectedValue(new Error('사용자가 먼저 수정했습니다.')),
    close = vi.fn();
  render(
    <AdminCorrectionDialog
      title="몸무게 정정"
      fields={[
        { key: 'weight', label: '몸무게', value: '6.8', type: 'number' },
      ]}
      onClose={close}
      onSave={save}
    />,
  );
  expect(screen.getByRole('button', { name: '정정 저장' })).toHaveProperty(
    'disabled',
    true,
  );
  fireEvent.change(screen.getByLabelText('몸무게'), {
    target: { value: '7.2' },
  });
  fireEvent.change(screen.getByLabelText('처리 사유 (필수)'), {
    target: { value: '보호자 요청' },
  });
  fireEvent.click(screen.getByRole('button', { name: '정정 저장' }));
  await waitFor(() =>
    expect(save).toHaveBeenCalledWith({ weight: '7.2' }, '보호자 요청'),
  );
  expect(await screen.findByRole('alert')).toHaveProperty(
    'textContent',
    '사용자가 먼저 수정했습니다.',
  );
  expect(screen.getByLabelText('몸무게')).toHaveProperty('value', '7.2');
  expect(close).not.toHaveBeenCalled();
});
