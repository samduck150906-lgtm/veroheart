import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import type { UserPetProfile } from '../../types';

// zustand의 SSR 스냅샷은 초기 상태를 반환하므로, 스토어 훅을 모킹해 상태를 주입한다.
const h = vi.hoisted(() => ({
  state: { pets: [] as UserPetProfile[], activePetId: null as string | null, userId: 'u1' as string | null },
}));
vi.mock('../../store/useStore', () => ({ useStore: () => h.state }));

import FeedingDiary from './FeedingDiary';

function render() {
  return renderToStaticMarkup(
    <MemoryRouter>
      <FeedingDiary onRegisterPet={() => {}} />
    </MemoryRouter>,
  );
}

const choco: UserPetProfile = {
  id: 'p1',
  name: '초코',
  species: 'Dog',
  age: 10,
  weightKg: 5.2,
  breed: '말티즈',
  healthConcerns: [],
  allergies: [],
};

describe('FeedingDiary', () => {
  beforeEach(() => {
    h.state = { pets: [], activePetId: null, userId: 'u1' };
  });

  it('shows the "register a pet first" empty state when there are no pets', () => {
    const html = render();
    expect(html).toContain('반려동물을 먼저 등록');
  });

  it('renders the pet selector, calendar and add button when a pet exists', () => {
    h.state = { pets: [choco], activePetId: 'p1', userId: 'u1' };
    const html = render();
    expect(html).toContain('초코');
    expect(html).toContain('말티즈');
    expect(html).toContain('기록 추가');
    // 달력 요일 헤더
    expect(html).toContain('일');
    expect(html).toContain('월');
    // 리뉴얼된 다이어리 컨트롤: 주간 뷰 토글 + 기록 검색
    expect(html).toContain('주간 보기');
    expect(html).toContain('기록 검색');
  });
});
