import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import type { AdminIngredient } from '../../lib/adminApi';

const h = vi.hoisted(() => ({
  ingredients: [] as AdminIngredient[],
  saveIngredient: vi.fn(),
  deleteIngredient: vi.fn(),
  getIngredientUsage: vi.fn(),
}));

vi.mock('../../lib/adminApi', () => ({
  fetchIngredients: () => Promise.resolve(h.ingredients),
  saveIngredient: h.saveIngredient,
  deleteIngredient: h.deleteIngredient,
  getIngredientUsage: h.getIngredientUsage,
}));

vi.mock('../../store/useNotification', () => ({
  notify: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

import AdminIngredients from './AdminIngredients';

const CHICKEN: AdminIngredient = {
  id: '11111111-1111-4111-8111-111111111111',
  name_ko: '닭고기',
  name_en: 'Chicken',
  risk_level: 'safe',
  description: '단백질원',
  category: '단백질원',
};

describe('AdminIngredients', () => {
  beforeEach(() => {
    h.ingredients = [CHICKEN];
    h.saveIngredient.mockReset().mockResolvedValue({ id: CHICKEN.id });
    h.deleteIngredient.mockReset().mockResolvedValue(undefined);
    h.getIngredientUsage.mockReset().mockResolvedValue(0);
  });

  afterEach(() => cleanup());

  it('성분 목록을 표시한다', async () => {
    render(<AdminIngredients />);
    expect(await screen.findByText('닭고기')).toBeTruthy();
  });

  it('한글 성분명이 비면 저장하지 않고 오류를 보여준다', async () => {
    render(<AdminIngredients />);
    fireEvent.click(await screen.findByText('신규 성분 등록'));
    fireEvent.click(screen.getByText('저장하기'));

    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      '한글 성분명을 입력해 주세요.',
    );
    expect(h.saveIngredient).not.toHaveBeenCalled();
  });

  it('신규 성분을 Edge Function 프록시로 저장한다', async () => {
    render(<AdminIngredients />);
    fireEvent.click(await screen.findByText('신규 성분 등록'));
    fireEvent.change(screen.getByLabelText('한글 성분명*'), { target: { value: '연어' } });
    fireEvent.click(screen.getByText('주의'));
    fireEvent.click(screen.getByText('저장하기'));

    await waitFor(() => expect(h.saveIngredient).toHaveBeenCalledTimes(1));
    expect(h.saveIngredient).toHaveBeenCalledWith(
      expect.objectContaining({ name_ko: '연어', risk_level: 'caution' }),
    );
  });

  it('저장 실패 원인을 화면에 표시한다', async () => {
    h.saveIngredient.mockRejectedValue(new Error('같은 이름의 성분이 이미 있습니다.'));
    render(<AdminIngredients />);
    fireEvent.click(await screen.findByText('신규 성분 등록'));
    fireEvent.change(screen.getByLabelText('한글 성분명*'), { target: { value: '닭고기' } });
    fireEvent.click(screen.getByText('저장하기'));

    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      '같은 이름의 성분이 이미 있습니다.',
    );
  });

  it('삭제는 확인 모달을 거친다', async () => {
    render(<AdminIngredients />);
    fireEvent.click(await screen.findByLabelText('닭고기 삭제'));

    expect(await screen.findByText('성분을 삭제할까요?')).toBeTruthy();
    expect(h.deleteIngredient).not.toHaveBeenCalled();

    await waitFor(() => expect(screen.getByText('삭제하기')).not.toHaveProperty('disabled', true));
    fireEvent.click(screen.getByText('삭제하기'));
    await waitFor(() => expect(h.deleteIngredient).toHaveBeenCalledWith(CHICKEN.id));
  });

  it('제품에 연결된 성분은 삭제 버튼이 잠기고 연결 수를 안내한다', async () => {
    h.getIngredientUsage.mockResolvedValue(7);
    render(<AdminIngredients />);
    fireEvent.click(await screen.findByLabelText('닭고기 삭제'));

    expect(await screen.findByText(/7개 제품에 연결되어 있어 삭제할 수 없습니다/)).toBeTruthy();
    expect(screen.getByText('삭제하기')).toHaveProperty('disabled', true);
    expect(h.deleteIngredient).not.toHaveBeenCalled();
  });
});
