import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const h = vi.hoisted(() => ({ fetchDiaryPage: vi.fn() }));
vi.mock('../../lib/adminApi', () => ({ fetchDiaryPage: h.fetchDiaryPage }));

import AdminDiary from './AdminDiary';

describe('AdminDiary', () => {
  beforeEach(() => {
    h.fetchDiaryPage.mockReset().mockResolvedValue({
      total: 1,
      rows: [{
        id: '1',
        feedingDate: '2026-09-10',
        feedingTime: '08:30:00',
        memberNickname: '보리보호자',
        petName: '보리',
        petType: 'dog',
        productName: '오리젠',
        amount: 80,
        unit: 'g',
        preferenceLevel: 5,
        imageUrl: null,
        memo: '잘 먹음',
        createdAt: '2026-09-10T00:00:00Z',
      }],
    });
  });

  afterEach(() => cleanup());

  it('실제 다이어리 행을 페이지 단위로 보여준다', async () => {
    render(<MemoryRouter><AdminDiary /></MemoryRouter>);
    expect(await screen.findByText('보리보호자')).toBeTruthy();
    expect(screen.getByText('오리젠')).toBeTruthy();
    expect(h.fetchDiaryPage).toHaveBeenCalledWith(expect.objectContaining({ page: 1, pageSize: 20 }));
  });

  it('동물종·사진 필터를 서버 요청에 반영한다', async () => {
    render(<MemoryRouter><AdminDiary /></MemoryRouter>);
    await screen.findByText('보리보호자');
    fireEvent.change(screen.getByLabelText('대상'), { target: { value: 'cat' } });
    fireEvent.change(screen.getByLabelText('사진'), { target: { value: 'yes' } });
    await waitFor(() => {
      expect(h.fetchDiaryPage).toHaveBeenLastCalledWith(expect.objectContaining({ petType: 'cat', hasPhoto: true }));
    });
  });
});
