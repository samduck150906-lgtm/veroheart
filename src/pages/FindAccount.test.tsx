import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const h = vi.hoisted(() => ({ request: vi.fn(), getUser: vi.fn() }));
vi.mock('../lib/supabase', () => ({ supabase: { auth: { getUser: h.getUser } } }));
vi.mock('../lib/accountRecovery', async importOriginal => ({ ...await importOriginal<typeof import('../lib/accountRecovery')>(), requestAccountRecovery: h.request }));
import FindAccount from './FindAccount';
afterEach(cleanup);
beforeEach(() => { vi.clearAllMocks(); h.request.mockResolvedValue(undefined); h.getUser.mockResolvedValue({ data: { user: null }, error: null }); });
function mount(url = '/account/find?mode=id') { render(<MemoryRouter initialEntries={[url]}><FindAccount /></MemoryRouter>); }
describe('account recovery screens', () => {
  it('opens both recovery methods without requiring signup consent', () => {
    mount();
    expect(screen.getByRole('heading', { name: '아이디를 잊었어요!' })).toBeTruthy();
    expect(screen.queryByRole('checkbox')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '비밀번호 찾기', exact: true }));
    expect(screen.getByRole('heading', { name: '비밀번호를 잊었어요!' })).toBeTruthy();
    expect(screen.getByRole('link', { name: '카카오 비밀번호 찾기 안내' }).getAttribute('href')).toBe('https://cs.kakao.com/helps_html/1073209954');
    expect(h.request).not.toHaveBeenCalled();
  });
  it('validates input, then acknowledges without exposing account existence and blocks duplicate requests across tabs', async () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: '계정 확인 링크 받기' }));
    expect(screen.getByRole('alert').textContent).toContain('올바른 이메일');
    expect(h.request).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('확인할 이메일'), { target: { value: 'owner@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: '계정 확인 링크 받기' }));
    expect((await screen.findByRole('status')).textContent).toContain('가입한 계정이 있다면');
    expect(h.request).toHaveBeenCalledExactlyOnceWith('id', 'owner@example.com');
    fireEvent.click(screen.getByRole('button', { name: '비밀번호 찾기', exact: true }));
    expect(screen.getByRole('button', { name: /초 후 다시 요청/ }).hasAttribute('disabled')).toBe(true);
  });
  it('keeps failed requests retryable without reporting success', async () => {
    h.request.mockRejectedValueOnce(new Error('안내를 보내지 못했습니다.'));
    mount('/account/find?mode=password');
    fireEvent.change(screen.getByLabelText('가입한 이메일'), { target: { value: 'owner@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: '비밀번호 재설정하기' }));
    expect((await screen.findByRole('alert')).textContent).toContain('보내지 못했습니다');
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByRole('button', { name: '비밀번호 재설정하기' }).hasAttribute('disabled')).toBe(false);
  });
  it('does not reveal an ID from an untrusted verified query parameter alone', async () => {
    mount('/account/find?mode=id&verified=1');
    await screen.findByRole('alert');
    expect(screen.queryByText('로그인 아이디를 확인했어요')).toBeNull();
    expect(screen.getByLabelText('확인할 이메일')).toBeTruthy();
  });
  it('shows only the authenticated owner email after verification', async () => {
    h.getUser.mockResolvedValue({ data: { user: { id: 'owner', email: 'owner@example.com' } }, error: null });
    mount('/account/find?mode=id&verified=1');
    expect(await screen.findByText('owner@example.com')).toBeTruthy();
    expect(screen.getByRole('link', { name: '새 비밀번호도 설정할게요' }).getAttribute('href')).toBe('/auth/recovery');
    expect(h.request).not.toHaveBeenCalled();
  });
  it('offers a fresh request for expired links', async () => {
    mount('/account/find?mode=password&link=expired');
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('만료'));
    expect(screen.getByRole('button', { name: '비밀번호 재설정하기' }).hasAttribute('disabled')).toBe(false);
  });
});
