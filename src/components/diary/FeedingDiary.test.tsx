import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup, fireEvent, render as renderComponent, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { UserPetProfile, PetFeedingLog } from '../../types';

// Keep private test fixtures independent of any signed-in account.
const h = vi.hoisted(() => ({
  state: { pets: [] as UserPetProfile[], activePetId: null as string | null, userId: 'u1' as string | null },
  day: vi.fn(), history: vi.fn(), create: vi.fn(),
}));
vi.mock('../../store/useStore', () => ({ useStore: () => h.state }));
vi.mock('../../lib/supabase', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../lib/supabase')>(),
  getFeedingLogsByDate: h.day,
  getFeedingLogMonth: vi.fn(async () => []),
  getFeedingLogsByMonthFull: vi.fn(async () => []),
  getFeedingLogsRange: vi.fn(async () => []),
  getFeedingLogsForProduct: h.history,
  searchDiaryProducts: vi.fn(async () => []),
  createFeedingLog: h.create,
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

const log: PetFeedingLog = {
  id: 'log', userId: 'u1', petId: 'p1', productId: 'food', productType: 'food', customProductName: null,
  isCustomProduct: false, feedingDate: '2026-10-12', feedingTime: '08:00', mealPeriod: 'morning',
  amount: 30, unit: 'g', memo: '이전 급여 메모', preferenceLevel: 4, reactionNote: null, imageUrl: null,
  createdAt: '2026-10-12', updatedAt: '2026-10-12',
  product: { id: 'food', name: '테스트 사료', brand: '예시', imageUrl: '', productType: 'food' },
};

describe('FeedingDiary', () => {
  afterEach(() => { cleanup(); vi.useRealTimers(); });
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-27T12:00:00'));
    h.state = { pets: [], activePetId: null, userId: 'u1' };
    h.day.mockReset().mockResolvedValue([]);
    h.history.mockReset().mockResolvedValue([log]);
    h.create.mockReset().mockResolvedValue({ ...log, id: 'new', feedingDate: '2026-10-27' });
  });

  it('shows the "register a pet first" empty state when there are no pets', () => {
    render();
    expect(screen.getByText('식이 기록을 시작하려면 반려동물을 등록해 주세요.')).toBeTruthy();
  });

  it('renders the pet selector, calendar and search when a pet exists', async () => {
    h.state = { pets: [choco], activePetId: 'p1', userId: 'u1' };
    render();
    await screen.findByText('아직 식사 기록이 없습니다.');
    expect(screen.getByRole('button', { name: /초코/ })).toBeTruthy();
    expect(screen.getByText(/말티즈/)).toBeTruthy();
    expect(screen.getByRole('button', { name: '주간 보기' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '기록 검색' })).toBeTruthy();
  });

  it.each(['달력 보기', '주간 보기', '목록 보기'])('offers one working add action in empty %s', async (mode) => {
    h.state = { pets: [choco], activePetId: 'p1', userId: 'u1' };
    render();
    fireEvent.click(screen.getByRole('button', { name: mode }));
    await screen.findByText('아직 식사 기록이 없습니다.');
    const addActions = screen.getAllByRole('button', { name: /기록 추가/ });
    expect(addActions).toHaveLength(1);
    fireEvent.click(addActions[0]);
    expect(await screen.findByRole('dialog', { name: '섭취 기록 추가' })).toBeTruthy();
  });

  it.each(['닫기', '배경', 'Escape'])('returns from relog via %s to the same history and previous diary date', async (method) => {
    h.state = { pets: [choco], activePetId: 'p1', userId: 'u1' };
    h.day.mockResolvedValue([log]);
    const view = render();
    fireEvent.click(screen.getByRole('button', { name: '12', exact: true }));
    fireEvent.click(await screen.findByRole('button', { name: '이력', exact: true }));
    const history = await screen.findByRole('dialog', { name: '테스트 사료' });
    const historyScroll = history.children[2] as HTMLElement;
    historyScroll.scrollTop = 120;
    fireEvent.click(await within(history).findByRole('button', { name: '다시 기록' }));
    const form = await screen.findByRole('dialog', { name: '섭취 기록 추가' });
    expect(form.querySelector<HTMLInputElement>('input[type="date"]')?.value).toBe('2026-10-27');
    expect(view.container.textContent).toContain('10월 12일');
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    if (method === '닫기') fireEvent.click(within(form).getByRole('button', { name: '닫기' }));
    else if (method === '배경') fireEvent.click(form.previousElementSibling!);
    else fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '섭취 기록 추가' })).toBeNull());
    expect(screen.getByRole('dialog', { name: '테스트 사료' })).toBe(history);
    expect(history.children[2]).toBe(historyScroll);
    expect(historyScroll.scrollTop).toBe(120);
    expect(history.textContent).toContain('이전 급여 메모');
    expect(h.history).toHaveBeenCalledTimes(1);
    expect(h.create).not.toHaveBeenCalled();
    fireEvent.click(within(history).getByRole('button', { name: '닫기' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(view.container.textContent).toContain('10월 12일');
    expect(document.body.style.overflow).toBe('');
  });

  it('moves to the saved date only after relog is saved successfully', async () => {
    h.state = { pets: [choco], activePetId: 'p1', userId: 'u1' };
    h.day.mockResolvedValue([log]);
    const view = render();
    fireEvent.click(screen.getByRole('button', { name: '12', exact: true }));
    fireEvent.click(await screen.findByRole('button', { name: '이력', exact: true }));
    const history = await screen.findByRole('dialog', { name: '테스트 사료' });
    fireEvent.click(await within(history).findByRole('button', { name: '다시 기록' }));
    const form = await screen.findByRole('dialog', { name: '섭취 기록 추가' });
    fireEvent.click(within(form).getByRole('button', { name: '기록 저장' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(h.create).toHaveBeenCalledWith('u1', expect.objectContaining({ feedingDate: '2026-10-27', amount: 30 }));
    expect(view.container.textContent).toContain('10월 27일');
  });

  it('keeps the selected diary day when cancelling relog directly from a record', async () => {
    h.state = { pets: [choco], activePetId: 'p1', userId: 'u1' };
    h.day.mockResolvedValue([log]);
    const view = render();
    fireEvent.click(screen.getByRole('button', { name: '12', exact: true }));
    fireEvent.click(await screen.findByRole('button', { name: '다시 기록' }));
    const form = await screen.findByRole('dialog', { name: '섭취 기록 추가' });
    fireEvent.click(within(form).getByRole('button', { name: '닫기' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(view.container.textContent).toContain('10월 12일');
    expect(h.create).not.toHaveBeenCalled();
  });
});
