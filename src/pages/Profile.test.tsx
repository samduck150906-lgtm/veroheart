import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import type { Product, UserPetProfile } from '../types';

const h = vi.hoisted(() => ({
  state: {
    userId: 'owner', isLoggedIn: true,
    pets: [{ id: 'pet-1', name: '초코', species: 'Dog', age: 4, allergies: [], healthConcerns: [] }] as UserPetProfile[],
    activePetId: 'pet-1', favorites: [] as string[], products: [] as Product[], catalogRevision: 0,
    profile: { id: 'pet-1', name: '초코', species: 'Dog', age: 4, allergies: [], healthConcerns: [] } as UserPetProfile,
    toggleFavorite: vi.fn(),
    selectPet: vi.fn(), savePet: vi.fn(), removePet: vi.fn(), logout: vi.fn(),
  },
  currentUser: vi.fn(), userProfile: vi.fn(), resetPassword: vi.fn(), manageAccount: vi.fn(), savedProducts: vi.fn(),
}));
vi.mock('../store/useStore', () => ({ useStore: Object.assign(() => h.state, { getState: () => h.state }) }));
vi.mock('../lib/supabase', async (importOriginal) => ({
  ...await importOriginal<typeof import('../lib/supabase')>(),
  getCurrentUser: h.currentUser,
  getUserProfile: h.userProfile,
  getVisibleProductsByIds: h.savedProducts,
  manageAccount: h.manageAccount,
  supabase: { auth: { resetPasswordForEmail: h.resetPassword } },
  getFeedingLogMonth: vi.fn(async () => []),
  getFeedingLogsByDate: vi.fn(async () => []),
}));

import Profile from './Profile';
import Diary from './Diary';
import { getAuthRedirectUrl } from '../lib/nativeAuth';

function LoginDestination() {
  const { state } = useLocation();
  return <p>로그인 후 돌아갈 화면: {state?.from}</p>;
}

function mount(path = '/profile') {
  return render(<MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/profile" element={<Profile />} />
    <Route path="/diary" element={<Diary />} />
    <Route path="/login" element={<LoginDestination />} />
    <Route path="/" element={<h1>홈 화면</h1>} />
  </Routes></MemoryRouter>);
}

beforeEach(() => {
  vi.clearAllMocks();
  h.state.userId = 'owner';
  h.state.favorites = [];
  h.state.products = [];
  h.state.catalogRevision = 0;
  h.savedProducts.mockReset().mockResolvedValue([]);
  h.currentUser.mockResolvedValue({ id: 'owner', email: 'owner@example.com', app_metadata: { provider: 'email', providers: ['email'] } });
  h.userProfile.mockReset().mockImplementation(async (id: string) => ({ id, nickname: '가입닉네임' }));
  h.resetPassword.mockResolvedValue({ data: {}, error: null });
  h.state.logout.mockResolvedValue(undefined);
  h.manageAccount.mockResolvedValue(undefined);
});

const savedFood: Product = {
  id: 'saved-food', name: '저장한 닭고기 사료', brand: '브랜드', category: 'food', targetPetType: 'dog',
  imageUrl: '/food.jpg', reviewsCount: 0, averageRating: 0, analysisStatus: 'ready', ingredientDataLoaded: true,
  ingredients: [{ id: 'chicken', nameKo: '닭고기', nameEn: 'chicken', purpose: '', riskLevel: 'safe' }],
};

describe('Profile saved products', () => {
  it('loads saved IDs beyond the initial catalog instead of dropping them', async () => {
    h.state.favorites = [savedFood.id];
    h.savedProducts.mockResolvedValue([savedFood]);
    mount('/profile?tab=favorites');
    expect(await screen.findByText('저장한 닭고기 사료')).toBeTruthy();
    expect(h.savedProducts).toHaveBeenCalledWith(['saved-food']);
    expect(screen.queryByText('저장한 제품이 없습니다.')).toBeNull();
  });

  it('shows an error with retry instead of using stale cached products or an empty state', async () => {
    h.state.favorites = [savedFood.id];
    h.state.products = [savedFood];
    h.savedProducts.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([savedFood]);
    mount('/profile?tab=favorites');
    expect((await screen.findByRole('alert')).textContent).toContain('불러오지 못했어요');
    expect(screen.queryByText('저장한 닭고기 사료')).toBeNull();
    expect(screen.queryByText('저장한 제품이 없습니다.')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '저장한 제품 다시 불러오기' }));
    expect(await screen.findByText('저장한 닭고기 사료')).toBeTruthy();
  });

  it('clears stale products on catalog refresh and ignores an older response', async () => {
    h.state.favorites = [savedFood.id];
    h.savedProducts.mockResolvedValueOnce([savedFood]);
    const view = render(<MemoryRouter initialEntries={['/profile?tab=favorites']}><Profile /></MemoryRouter>);
    await screen.findByText('저장한 닭고기 사료');
    let finishOld!: (products: Product[]) => void;
    h.savedProducts.mockImplementationOnce(() => new Promise((resolve) => { finishOld = resolve; }));
    h.state.catalogRevision = 1;
    view.rerender(<MemoryRouter initialEntries={['/profile?tab=favorites']}><Profile /></MemoryRouter>);
    expect(screen.queryByText('저장한 닭고기 사료')).toBeNull();
    h.savedProducts.mockResolvedValueOnce([]);
    h.state.catalogRevision = 2;
    view.rerender(<MemoryRouter initialEntries={['/profile?tab=favorites']}><Profile /></MemoryRouter>);
    await screen.findByText('저장한 제품 중 현재 볼 수 있는 제품이 없어요.');
    await act(async () => finishOld([savedFood]));
    expect(screen.queryByText('저장한 닭고기 사료')).toBeNull();
  });

  it('does not show a previous account\'s saved products after identity changes', async () => {
    h.state.favorites = [savedFood.id];
    let finishOld!: (products: Product[]) => void;
    h.savedProducts.mockImplementationOnce(() => new Promise((resolve) => { finishOld = resolve; }));
    const view = render(<MemoryRouter initialEntries={['/profile?tab=favorites']}><Profile /></MemoryRouter>);
    await waitFor(() => expect(h.savedProducts).toHaveBeenCalledWith([savedFood.id]));
    h.state.userId = 'next-owner';
    h.state.favorites = [];
    view.rerender(<MemoryRouter initialEntries={['/profile?tab=favorites']}><Profile /></MemoryRouter>);
    await act(async () => finishOld([savedFood]));
    expect(screen.queryByText('저장한 닭고기 사료')).toBeNull();
    expect(screen.getByText('저장한 제품이 없습니다.')).toBeTruthy();
  });
});
afterEach(cleanup);

describe('Profile navigation and account settings', () => {
  it('opens real account details from the account row instead of leaving it inert', async () => {
    h.currentUser.mockResolvedValueOnce({ id: 'owner', email: 'owner@example.com', phone: '+821012345678', user_metadata: { nickname: '이전닉네임' }, app_metadata: { provider: 'email', providers: ['email'] } });
    mount();
    fireEvent.click(screen.getByRole('link', { name: /로그인한 계정을 관리해요/ }));
    expect(await screen.findByText('owner@example.com')).toBeTruthy();
    expect(screen.getByText('가입닉네임')).toBeTruthy();
    expect(screen.queryByText('이전닉네임')).toBeNull();
    expect(screen.getByText('+821012345678')).toBeTruthy();
    expect(screen.getByText('이메일')).toBeTruthy();
    expect(screen.getByRole('link', { name: '계정 및 데이터 삭제' }).getAttribute('href')).toBe('/account/delete');
    expect(h.resetPassword).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: '식이 다이어리' })).toBeNull();
  });

  it('shows an explicit unset phone state instead of inventing contact information', async () => {
    mount('/profile?tab=account');
    await screen.findByText('owner@example.com');
    expect(screen.getByText('등록된 휴대폰 번호가 없어요')).toBeTruthy();
    expect(screen.getByText('가입닉네임')).toBeTruthy();
  });

  it('uses a supplied name and phone metadata for older accounts without a public nickname', async () => {
    h.userProfile.mockResolvedValueOnce(null);
    h.currentUser.mockResolvedValueOnce({ id: 'owner', email: 'owner@example.com', phone: ' ', user_metadata: { nickname: ' ', name: { invalid: true }, full_name: '가입이름', phone_number: '010-1234-5678' }, app_metadata: { provider: 'kakao', providers: ['kakao'] } });
    mount('/profile?tab=account');
    expect(await screen.findByText('가입이름')).toBeTruthy();
    expect(screen.getByText('010-1234-5678')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '비밀번호 재설정 메일 받기' })).toBeNull();
  });

  it('distinguishes a failed profile lookup from unset fields and supports retry', async () => {
    h.userProfile.mockRejectedValueOnce(new Error('offline'));
    mount('/profile?tab=account');
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.queryByText('등록된 휴대폰 번호가 없어요')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '계정 정보 다시 불러오기' }));
    expect(await screen.findByText('가입닉네임')).toBeTruthy();
  });

  it('ignores an old nickname response when the signed-in account changes', async () => {
    let finishProfile!: (value: { id: string; nickname: string }) => void;
    h.userProfile.mockImplementationOnce(() => new Promise(resolve => { finishProfile = resolve; }));
    const view = render(<MemoryRouter initialEntries={['/profile?tab=account']}><Profile /></MemoryRouter>);
    await waitFor(() => expect(h.userProfile).toHaveBeenCalledWith('owner'));
    h.state.userId = 'next-owner';
    h.currentUser.mockResolvedValueOnce({ id: 'next-owner', email: 'next@example.com', user_metadata: { nickname: '다음계정' }, app_metadata: { provider: 'email', providers: ['email'] } });
    h.userProfile.mockResolvedValueOnce({ id: 'next-owner', nickname: '다음계정' });
    view.rerender(<MemoryRouter initialEntries={['/profile?tab=account']}><Profile /></MemoryRouter>);
    expect(await screen.findByText('다음계정')).toBeTruthy();
    await act(async () => finishProfile({ id: 'owner', nickname: '이전계정' }));
    expect(screen.queryByText('이전계정')).toBeNull();
    expect(screen.queryByText('owner@example.com')).toBeNull();
  });

  it('redirects legacy diary links to the diary page without the account settings footer', async () => {
    mount('/profile?tab=diary');
    expect(await screen.findByRole('button', { name: '기록 검색' })).toBeTruthy();
    expect(screen.queryByText('로그인한 계정을 관리해요')).toBeNull();
    expect(screen.queryByRole('link', { name: '계정 및 데이터 삭제' })).toBeNull();
  });

  it('sends one recovery email only after an explicit click and shows the next step', async () => {
    mount('/profile?tab=account');
    await screen.findByText('owner@example.com');
    const button = screen.getByRole('button', { name: '비밀번호 재설정 메일 받기' });
    expect(h.resetPassword).not.toHaveBeenCalled();
    fireEvent.click(button);
    await waitFor(() => expect(h.resetPassword).toHaveBeenCalledWith('owner@example.com', { redirectTo: getAuthRedirectUrl('recovery') }));
    expect((await screen.findByRole('status')).textContent).toContain('메일');
    expect(button.hasAttribute('disabled')).toBe(true);
    fireEvent.click(button);
    expect(h.resetPassword).toHaveBeenCalledOnce();
  });

  it('asks guests to log in before showing a diary and keeps the diary return destination', () => {
    h.state.userId = null;
    mount('/diary');
    expect(screen.queryByRole('button', { name: '기록 검색' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '로그인 / 회원가입' }));
    expect(screen.getByText('로그인 후 돌아갈 화면: /diary')).toBeTruthy();
  });

  it('shows Kakao account guidance without offering email-password reset for social-only accounts', async () => {
    h.currentUser.mockResolvedValue({ id: 'owner', email: 'owner@example.com', app_metadata: { provider: 'kakao', providers: ['kakao'] } });
    mount('/profile?tab=account');
    expect(await screen.findByText('카카오')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '비밀번호 재설정 메일 받기' })).toBeNull();
    expect(h.resetPassword).not.toHaveBeenCalled();
  });

  it('keeps account details hidden after a failed load and lets the user retry', async () => {
    h.currentUser.mockRejectedValueOnce(new Error('offline'));
    mount('/profile?tab=account');
    expect((await screen.findByRole('alert')).textContent).toContain('불러오지 못했어요');
    fireEvent.click(screen.getByRole('button', { name: '계정 정보 다시 불러오기' }));
    expect(await screen.findByText('owner@example.com')).toBeTruthy();
  });

  it('logs out through the account view and returns to home', async () => {
    mount('/profile?tab=account');
    await screen.findByText('owner@example.com');
    fireEvent.click(screen.getByRole('button', { name: '로그아웃' }));
    expect(await screen.findByRole('heading', { name: '홈 화면' })).toBeTruthy();
    expect(h.state.logout).toHaveBeenCalledOnce();
  });

  it('does not display account details returned for a different signed-in identity', async () => {
    h.currentUser.mockResolvedValueOnce({ id: 'previous-owner', email: 'previous@example.com', app_metadata: { provider: 'email', providers: ['email'] } });
    mount('/profile?tab=account');
    await screen.findByRole('alert');
    expect(screen.queryByText('previous@example.com')).toBeNull();
    expect(screen.queryByRole('button', { name: '비밀번호 재설정 메일 받기' })).toBeNull();
  });

  it('ignores an old account response when the signed-in identity changes', async () => {
    let finishOldRequest: (value: unknown) => void;
    h.currentUser.mockImplementationOnce(() => new Promise((resolve) => { finishOldRequest = resolve; }));
    const view = render(<MemoryRouter initialEntries={['/profile?tab=account']}><Profile /></MemoryRouter>);
    h.state.userId = 'next-owner';
    h.currentUser.mockResolvedValueOnce({ id: 'next-owner', email: 'next@example.com', app_metadata: { provider: 'email', providers: ['email'] } });
    view.rerender(<MemoryRouter initialEntries={['/profile?tab=account']}><Profile /></MemoryRouter>);
    expect(await screen.findByText('next@example.com')).toBeTruthy();
    await act(async () => finishOldRequest({ id: 'owner', email: 'owner@example.com', app_metadata: { provider: 'email', providers: ['email'] } }));
    expect(screen.queryByText('owner@example.com')).toBeNull();
    expect(screen.getByText('next@example.com')).toBeTruthy();
  });

  it('lets a failed recovery request be retried without reporting success', async () => {
    h.resetPassword.mockResolvedValueOnce({ data: {}, error: { message: 'offline' } });
    mount('/profile?tab=account');
    await screen.findByText('owner@example.com');
    const button = screen.getByRole('button', { name: '비밀번호 재설정 메일 받기' });
    fireEvent.click(button);
    expect((await screen.findByRole('alert')).textContent).toContain('메일을 보내지 못했어요');
    expect(button.hasAttribute('disabled')).toBe(false);
    expect(screen.queryByRole('status')).toBeNull();
    fireEvent.click(button);
    expect((await screen.findByRole('status')).textContent).toContain('메일');
  });

  it('runs pending-photo cleanup without invoking account deletion', async () => {
    mount('/profile?tab=account');
    await screen.findByText('owner@example.com');
    fireEvent.click(screen.getByRole('button', { name: '삭제 대기 사진 정리 다시 시도' }));
    expect((await screen.findByRole('status')).textContent).toContain('사진 정리를 완료');
    expect(h.manageAccount).toHaveBeenCalledExactlyOnceWith('cleanup-photos');
  });
});
