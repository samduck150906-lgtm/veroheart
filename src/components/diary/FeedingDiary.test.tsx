import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup, fireEvent, render as renderComponent, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { UserPetProfile } from '../../types';

// Keep private test fixtures independent of any signed-in account.
const h = vi.hoisted(() => ({
  state: { pets: [] as UserPetProfile[], activePetId: null as string | null, userId: 'u1' as string | null },
}));
vi.mock('../../store/useStore', () => ({ useStore: () => h.state }));
vi.mock('../../lib/supabase', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../lib/supabase')>(),
  getFeedingLogsByDate: vi.fn(async () => []),
  getFeedingLogMonth: vi.fn(async () => []),
  getFeedingLogsByMonthFull: vi.fn(async () => []),
  getFeedingLogsRange: vi.fn(async () => []),
}));

import FeedingDiary from './FeedingDiary';

function render() {
  return renderComponent(
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
  afterEach(cleanup);
  beforeEach(() => {
    h.state = { pets: [], activePetId: null, userId: 'u1' };
  });

  it('shows the "register a pet first" empty state when there are no pets', () => {
    render();
    expect(screen.getByText(/반려동물을 먼저 등록/)).toBeTruthy();
  });

  it('renders the pet selector, calendar and search when a pet exists', async () => {
    h.state = { pets: [choco], activePetId: 'p1', userId: 'u1' };
    render();
    await screen.findByText('아직 기록된 식사가 없어요.');
    expect(screen.getByRole('button', { name: /초코/ })).toBeTruthy();
    expect(screen.getByText(/말티즈/)).toBeTruthy();
    expect(screen.getByRole('button', { name: '주간 보기' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '기록 검색' })).toBeTruthy();
  });

  it.each(['달력 보기', '주간 보기', '목록 보기'])('offers one working add action in empty %s', async (mode) => {
    h.state = { pets: [choco], activePetId: 'p1', userId: 'u1' };
    render();
    fireEvent.click(screen.getByRole('button', { name: mode }));
    await screen.findByText('아직 기록된 식사가 없어요.');
    const addActions = screen.getAllByRole('button', { name: /기록 추가/ });
    expect(addActions).toHaveLength(1);
    fireEvent.click(addActions[0]);
    expect(await screen.findByRole('dialog', { name: '섭취 기록 추가' })).toBeTruthy();
  });
});
