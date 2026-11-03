import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { signUp, initApp, success, error } = vi.hoisted(() => ({
  signUp: vi.fn(), initApp: vi.fn(), success: vi.fn(), error: vi.fn(),
}));
vi.mock('../lib/supabase', () => ({ supabase: { auth: { signUp } } }));
vi.mock('../store/useStore', () => ({ useStore: () => ({ initApp }) }));
vi.mock('../store/useNotification', () => ({ notify: { success, error, warning: vi.fn() } }));
vi.mock('../lib/publicSettings', () => ({ usePublicSettings: () => ({ signupEnabled: true }) }));
vi.mock('../lib/kakaoAuth', () => ({ isKakaoLoginEnabled: () => true, signInWithKakao: vi.fn() }));
vi.mock('../lib/nativeAuth', () => ({ getAuthRedirectUrl: vi.fn() }));
vi.mock('../lib/nickname', () => ({
  NICKNAME_MAX_LENGTH: 20,
  validateNickname: (value: string) => value.length < 2 ? '닉네임을 입력해 주세요.' : null,
  checkNicknameAvailable: vi.fn().mockResolvedValue('available'),
}));

import Login from './Login';

afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

async function submitSignup() {
  render(<MemoryRouter initialEntries={['/login']}><Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/profile" element={<div>내 프로필</div>} />
  </Routes></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: '회원가입', exact: true }));
  fireEvent.change(screen.getByRole('textbox', { name: '닉네임' }), { target: { value: '테스트회원' } });
  fireEvent.change(screen.getByRole('textbox', { name: '이메일' }), { target: { value: 'signup@example.com' } });
  fireEvent.change(screen.getByLabelText('비밀번호', { exact: true }), { target: { value: 'Example123!' } });
  fireEvent.click(screen.getByRole('checkbox'));
  await waitFor(() => expect(screen.getByText('사용할 수 있는 닉네임입니다.')).toBeTruthy());
  fireEvent.click(screen.getByRole('button', { name: '가입하고 시작하기' }));
}

describe('email signup without confirmation mail', () => {
  it('opens the profile immediately when signup creates a session', async () => {
    signUp.mockResolvedValue({ data: { session: { access_token: 'test-session' } }, error: null });
    await submitSignup();
    expect(await screen.findByText('내 프로필')).toBeTruthy();
    expect(initApp).toHaveBeenCalledOnce();
    expect(success).toHaveBeenCalledWith('회원가입이 완료되었습니다.');
  });

  it('does not claim success or navigate if no authenticated session was created', async () => {
    signUp.mockResolvedValue({ data: { session: null }, error: null });
    await submitSignup();
    await waitFor(() => expect(error).toHaveBeenCalledWith('가입을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.'));
    expect(success).not.toHaveBeenCalled();
    expect(initApp).not.toHaveBeenCalled();
    expect(screen.queryByText('내 프로필')).toBeNull();
  });
});
