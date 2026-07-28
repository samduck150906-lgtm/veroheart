import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import type { AdminIngredient, UnmatchedIngredientRow, UnmatchedListParams } from '../../lib/adminApi';

const h = vi.hoisted(() => ({
  fetchUnmatchedPage: vi.fn(),
  mapUnmatchedIngredient: vi.fn(),
  ignoreUnmatchedIngredient: vi.fn(),
  reopenUnmatchedIngredient: vi.fn(),
  searchIngredients: vi.fn(),
}));

vi.mock('../../lib/adminApi', () => ({
  fetchUnmatchedPage: h.fetchUnmatchedPage,
  mapUnmatchedIngredient: h.mapUnmatchedIngredient,
  ignoreUnmatchedIngredient: h.ignoreUnmatchedIngredient,
  reopenUnmatchedIngredient: h.reopenUnmatchedIngredient,
  searchIngredients: h.searchIngredients,
}));

vi.mock('../../store/useNotification', () => ({
  notify: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

import AdminUnmatched from './AdminUnmatched';

const ROW: UnmatchedIngredientRow = {
  id: '11111111-1111-4111-8111-111111111111',
  raw_name: '동물성 지방',
  normalized_name: '동물성지방',
  occurrences: 42,
  status: 'pending',
  created_at: '2026-07-01T00:00:00Z',
  last_seen_at: '2026-07-22T00:00:00Z',
  review_note: null,
  reviewed_by: null,
  reviewed_at: null,
  mapped_ingredient_id: null,
  sample_product_id: null,
};

const CANDIDATE: AdminIngredient = {
  id: '22222222-2222-4222-8222-222222222222',
  name_ko: '동물성 지방',
  name_en: 'Animal fat',
  risk_level: 'caution',
  description: null,
  category: null,
};

async function flushDebounce(ms = 350) {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
}

describe('AdminUnmatched', () => {
  beforeEach(() => {
    h.fetchUnmatchedPage.mockReset().mockResolvedValue({ rows: [ROW], total: 1 });
    h.mapUnmatchedIngredient.mockReset().mockResolvedValue(undefined);
    h.ignoreUnmatchedIngredient.mockReset().mockResolvedValue(undefined);
    h.reopenUnmatchedIngredient.mockReset().mockResolvedValue(undefined);
    h.searchIngredients.mockReset().mockResolvedValue([CANDIDATE]);
  });

  afterEach(() => cleanup());

  it('기본으로 검토 대기 항목을 발생 횟수 순으로 조회한다', async () => {
    render(<AdminUnmatched />);
    await waitFor(() => expect(h.fetchUnmatchedPage).toHaveBeenCalled());

    const params = h.fetchUnmatchedPage.mock.calls[0][0] as UnmatchedListParams;
    expect(params.status).toBe('pending');
    expect(params.page).toBe(1);
    expect(await screen.findByText('동물성 지방')).toBeTruthy();
    expect(screen.getByText('42')).toBeTruthy();
  });

  it('상태 필터를 바꾸면 해당 상태로 다시 조회한다', async () => {
    render(<AdminUnmatched />);
    await screen.findByText('동물성 지방');

    fireEvent.click(screen.getByText('무시'));

    await waitFor(() => {
      const last = h.fetchUnmatchedPage.mock.calls.at(-1)?.[0] as UnmatchedListParams;
      expect(last.status).toBe('ignored');
      expect(last.page).toBe(1);
    });
  });

  it('매핑은 점수에 즉시 반영되지 않는다는 안전 안내를 노출한다', async () => {
    render(<AdminUnmatched />);
    expect(await screen.findByText(/사용자에게 보이는 점수·위험도 판정은 즉시 바뀌지 않으며/)).toBeTruthy();
  });

  it('성분을 선택하면 매핑 API 를 호출한다', async () => {
    render(<AdminUnmatched />);
    fireEvent.click(await screen.findByText('매핑'));
    await flushDebounce();

    const option = await screen.findByText(/Animal fat/);
    fireEvent.click(option.closest('button') as HTMLButtonElement);

    await waitFor(() => expect(h.mapUnmatchedIngredient).toHaveBeenCalledTimes(1));
    expect(h.mapUnmatchedIngredient).toHaveBeenCalledWith(ROW.id, CANDIDATE.id, undefined);
  });

  it('무시 처리와 되돌리기를 지원한다', async () => {
    render(<AdminUnmatched />);
    fireEvent.click(await screen.findByLabelText('동물성 지방 무시 처리'));
    await waitFor(() => expect(h.ignoreUnmatchedIngredient).toHaveBeenCalledWith(ROW.id, undefined));

    cleanup();
    h.fetchUnmatchedPage.mockResolvedValue({ rows: [{ ...ROW, status: 'ignored' }], total: 1 });
    render(<AdminUnmatched />);
    fireEvent.click(await screen.findByLabelText('동물성 지방 되돌리기'));
    await waitFor(() => expect(h.reopenUnmatchedIngredient).toHaveBeenCalledWith(ROW.id));
  });

  it('검토 대기 항목이 없으면 빈 상태를 안내한다', async () => {
    h.fetchUnmatchedPage.mockResolvedValue({ rows: [], total: 0 });
    render(<AdminUnmatched />);
    expect(await screen.findByText(/검토 대기 중인 미매칭 성분이 없습니다/)).toBeTruthy();
  });
});
