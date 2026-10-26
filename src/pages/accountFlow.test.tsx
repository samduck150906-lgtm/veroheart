import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const state = { userId: 'owner', logout: vi.fn(async () => {}) };
const manage = vi.fn();
const getUser = vi.fn();
const updateUser = vi.fn();
vi.mock('../store/useStore', () => ({ useStore: Object.assign(() => state, { getState: () => state }) }));
vi.mock('../lib/supabase', () => ({ manageAccount: (...args) => manage(...args), supabase: { auth: { getUser: (...args) => getUser(...args), updateUser: (...args) => updateUser(...args) } } }));
import AccountDelete from './AccountDelete';
import PasswordRecovery from './PasswordRecovery';

afterEach(() => { cleanup(); vi.clearAllMocks(); });
it('shows deletion failure, retains identity, and permits an explicit retry', async () => {
  manage.mockRejectedValueOnce(new Error('정리 실패')).mockResolvedValueOnce(undefined);
  render(<MemoryRouter><AccountDelete /></MemoryRouter>);
  const button = screen.getByRole('button', { name: '계정 영구 삭제' });
  expect(button.hasAttribute('disabled')).toBe(true);
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(button);
  expect((await screen.findByRole('alert')).textContent).toContain('정리 실패');
  expect(state.logout).not.toHaveBeenCalled();
  fireEvent.click(button);
  await waitFor(() => expect(state.logout).toHaveBeenCalledOnce());
  expect(screen.getByRole('status').textContent).toContain('완료');
});
it('expired recovery sessions cannot submit a replacement password', async () => {
  getUser.mockResolvedValue({ data: { user: null }, error: null });
  render(<MemoryRouter><PasswordRecovery /></MemoryRouter>);
  await screen.findByRole('alert');
  expect(screen.getByRole('button', { name: '비밀번호 변경' }).hasAttribute('disabled')).toBe(true);
  expect(updateUser).not.toHaveBeenCalled();
});
it('valid recovery changes password and signs out before asking for fresh login', async () => {
  getUser.mockResolvedValue({ data: { user: { id: 'owner' } }, error: null });
  updateUser.mockResolvedValue({ error: null });
  render(<MemoryRouter><PasswordRecovery /></MemoryRouter>);
  await waitFor(() => expect(screen.getByLabelText('새 비밀번호').hasAttribute('disabled')).toBe(false));
  fireEvent.change(screen.getByLabelText('새 비밀번호'), { target: { value: 'Changed123!' } });
  fireEvent.change(screen.getByLabelText('새 비밀번호 확인'), { target: { value: 'Changed123!' } });
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: '비밀번호 변경' })); });
  expect(updateUser).toHaveBeenCalledWith({ password: 'Changed123!' });
  expect(state.logout).toHaveBeenCalledOnce();
  expect(screen.getByRole('status').textContent).toContain('새 비밀번호');
});
