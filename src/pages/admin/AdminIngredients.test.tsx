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
  aliases: ['치킨', '계육'],
  nutrition_tags: ['고단백'],
  caution_conditions: [],
  allergy_triggers: ['닭고기'],
};

describe('AdminIngredients', () => {
  beforeEach(() => {
    h.ingredients = [CHICKEN];
    h.saveIngredient.mockReset().mockResolvedValue({ id: CHICKEN.id, ingredient: CHICKEN });
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
    fireEvent.change(screen.getByLabelText('성분 분류'), { target: { value: '동물성 단백질' } });
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
    fireEvent.change(screen.getByLabelText('성분 분류'), { target: { value: '동물성 단백질' } });
    fireEvent.click(screen.getByText('저장하기'));

    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      '같은 이름의 성분이 이미 있습니다.',
    );
  });

  it('기존 성분의 이름·분류·영양값을 수정한다', async () => {
    render(<AdminIngredients />);
    fireEvent.click(await screen.findByLabelText('닭고기 수정'));
    fireEvent.change(screen.getByLabelText('영문 성분명'), { target: { value: 'Chicken meat' } });
    fireEvent.change(screen.getByLabelText('성분 분류'), { target: { value: '동물성 단백질' } });
    fireEvent.change(screen.getByLabelText('조단백질'), { target: { value: '27.5' } });
    fireEvent.click(screen.getByText('저장하기'));

    await waitFor(() => expect(h.saveIngredient).toHaveBeenCalledWith(expect.objectContaining({
      id: CHICKEN.id,
      name_en: 'Chicken meat',
      category: '동물성 단백질',
      crude_protein_pct: 27.5,
    })));
  });

  it('표준사료 DB를 신규 성분의 구조화 영양값으로 불러온다', async () => {
    render(<AdminIngredients />);
    fireEvent.click(await screen.findByText('신규 성분 등록'));
    fireEvent.click(screen.getByText('한국표준사료성분표 데이터에서 불러오기'));
    fireEvent.change(screen.getByLabelText('표준사료성분 검색'), { target: { value: '귀리 (연맥)' } });
    fireEvent.click(await screen.findByText('귀리 (연맥)'));

    expect(screen.getByLabelText('영양정보 출처')).toHaveProperty('value', '한국표준사료성분표 2022');
    expect(screen.getByLabelText('조단백질')).not.toHaveProperty('value', '');
    fireEvent.click(screen.getByText('저장하기'));
    await waitFor(() => expect(h.saveIngredient).toHaveBeenCalledWith(expect.objectContaining({
      name_ko: '귀리 (연맥)',
      nutrition_source: '한국표준사료성분표 2022',
      crude_protein_pct: expect.any(Number),
    })));
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
