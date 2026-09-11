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
  created_at: '2026-01-10T01:00:00.000Z',
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

const OAT: AdminIngredient = {
  id: '22222222-2222-4222-8222-222222222222',
  created_at: '2026-03-10T01:00:00.000Z',
  name_ko: '귀리',
  name_en: 'Oat',
  risk_level: 'safe',
  description: '곡물 원료',
  category: '탄수화물·곡물',
  crude_protein_pct: 9.64,
};

const CORN: AdminIngredient = {
  id: '33333333-3333-4333-8333-333333333333',
  created_at: '2026-02-10T01:00:00.000Z',
  name_ko: '옥수수',
  name_en: 'Corn',
  risk_level: 'caution',
  description: '곡물 원료',
  category: '탄수화물·곡물',
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
    fireEvent.click(screen.getByRole('radio', { name: '주의' }));
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

  it('기본 최근 등록순과 오래된 등록순으로 목록을 정렬한다', async () => {
    h.ingredients = [CHICKEN, OAT, CORN];
    render(<AdminIngredients />);
    await screen.findByText('귀리');

    const visibleNames = () => Array.from(document.querySelectorAll('tbody .admin-item-main'))
      .map((element) => element.textContent);
    expect(visibleNames()).toEqual(['귀리', '옥수수', '닭고기']);

    fireEvent.change(screen.getByLabelText('성분 정렬 순서'), { target: { value: 'oldest' } });
    expect(visibleNames()).toEqual(['닭고기', '옥수수', '귀리']);
  });

  it('탄수화물 분류와 영양 DB 상태를 함께 필터링하고 초기화한다', async () => {
    h.ingredients = [CHICKEN, OAT, CORN];
    render(<AdminIngredients />);
    await screen.findByText('귀리');

    fireEvent.change(screen.getByLabelText('성분 분류 필터'), {
      target: { value: '탄수화물·곡물' },
    });
    expect(screen.queryByText('닭고기')).toBeNull();
    expect(screen.getByText('귀리')).toBeTruthy();
    expect(screen.getByText('옥수수')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('영양 DB 필터'), { target: { value: 'linked' } });
    expect(screen.getByText('귀리')).toBeTruthy();
    expect(screen.queryByText('옥수수')).toBeNull();
    expect(screen.getByText(/전체 3개 중/)).toHaveProperty('textContent', '전체 3개 중 1개 표시');

    fireEvent.click(screen.getByText('필터 초기화'));
    expect(screen.getByText('닭고기')).toBeTruthy();
    expect(screen.getByText('옥수수')).toBeTruthy();
  });

  it('위험 성분만 모아볼 수 있다', async () => {
    h.ingredients = [CHICKEN, OAT, CORN];
    render(<AdminIngredients />);
    await screen.findByText('귀리');
    fireEvent.change(screen.getByLabelText('성분 위험도 필터'), { target: { value: 'caution' } });

    expect(screen.getByText('옥수수')).toBeTruthy();
    expect(screen.queryByText('귀리')).toBeNull();
    expect(screen.queryByText('닭고기')).toBeNull();
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
