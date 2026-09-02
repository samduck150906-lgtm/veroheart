import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AppHeader from './AppHeader';
import { useStore } from '../store/useStore';
import { DEFAULT_USER_PET_PROFILE, type UserPetProfile } from '../types';

function renderHeader() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <AppHeader raised={false} />
    </MemoryRouter>,
  );
}

const loggedInPet: UserPetProfile = {
  ...DEFAULT_USER_PET_PROFILE,
  id: 'pet-1',
  name: '로니',
  species: 'Dog',
};

describe('앱 헤더 우측 프로필', () => {
  beforeEach(() => {
    useStore.setState({ isLoggedIn: false, profile: DEFAULT_USER_PET_PROFILE, selectedProduct: null });
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('로그아웃 상태에서는 반려동물 흔적이 남지 않는다', () => {
    // 기본 프로필 이름이 '우리 아이'라, 예전에는 로그아웃 상태에서도 첫 글자 '우'가 남았다.
    renderHeader();
    const login = screen.getByRole('button', { name: '로그인' });
    expect(login).toBeTruthy();
    expect(screen.queryByText('우')).toBeNull();
    expect(document.body.textContent).not.toContain('우리 아이');
  });

  it('로그인 상태여도 이름 첫 글자만 덩그러니 보여주지 않는다', () => {
    useStore.setState({ isLoggedIn: true, profile: loggedInPet });
    renderHeader();
    const petButton = screen.getByRole('button', { name: '로니 프로필' });
    expect(petButton).toBeTruthy();
    // 한 글자 아바타('로')를 쓰지 않는다 — 아이콘이나 사진으로 표시한다.
    expect(petButton.textContent?.trim()).toBe('');
    expect(petButton.querySelector('svg')).toBeTruthy();
  });

  it('프로필 사진이 있으면 사진을 쓴다', () => {
    useStore.setState({ isLoggedIn: true, profile: { ...loggedInPet, imageUrl: 'https://example.com/roni.jpg' } });
    renderHeader();
    const img = screen.getByRole('button', { name: '로니 프로필' }).querySelector('img');
    expect(img?.getAttribute('src')).toBe('https://example.com/roni.jpg');
  });

  it('로그아웃하면 반려동물 버튼이 사라진다', () => {
    useStore.setState({ isLoggedIn: true, profile: loggedInPet });
    const view = renderHeader();
    expect(screen.queryByRole('button', { name: '로니 프로필' })).toBeTruthy();

    view.unmount();
    useStore.setState({ isLoggedIn: false, profile: DEFAULT_USER_PET_PROFILE });
    renderHeader();
    expect(screen.queryByRole('button', { name: '로니 프로필' })).toBeNull();
    expect(screen.getByRole('button', { name: '로그인' })).toBeTruthy();
  });
});
