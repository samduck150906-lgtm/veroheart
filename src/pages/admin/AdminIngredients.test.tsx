import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render as renderComponent, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type {
  AdminIngredient,
  CanonicalIngredientReviewData,
} from '../../lib/adminApi';

const h = vi.hoisted(() => ({
  ingredients: [] as AdminIngredient[],
  saveIngredient: vi.fn(),
  deleteIngredient: vi.fn(),
  getIngredientUsage: vi.fn(),
  canonicalReview: { rows: [], canonicalIngredients: [], activeEngine: null } as CanonicalIngredientReviewData,
  resolveCanonicalIngredientReview: vi.fn(),
}));

vi.mock('../../lib/adminApi', () => ({
  fetchIngredients: () => Promise.resolve(h.ingredients),
  saveIngredient: h.saveIngredient,
  deleteIngredient: h.deleteIngredient,
  getIngredientUsage: h.getIngredientUsage,
  fetchCanonicalIngredientReview: () => Promise.resolve(h.canonicalReview),
  resolveCanonicalIngredientReview: h.resolveCanonicalIngredientReview,
}));

vi.mock('../../store/useNotification', () => ({
  notify: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

import AdminIngredients from './AdminIngredients';

// 성분 사전은 미매칭 성분 탭과 한 화면을 쓰게 되면서 ?tab= 쿼리를 읽는다.
const render = (ui: React.ReactElement, route = '/') => renderComponent(
  <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>,
);

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
    h.resolveCanonicalIngredientReview.mockReset().mockResolvedValue({ enqueuedProducts: 3 });
    h.canonicalReview = { rows: [], canonicalIngredients: [], activeEngine: null };
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

  it('근거 검수 큐를 발생 횟수순으로 보여주고 영향 제품·원문·근거를 함께 표시한다', async () => {
    h.canonicalReview = {
      activeEngine: { id: '99999999-9999-4999-8999-999999999999', version: 'ingredient-v2' },
      canonicalIngredients: [{
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        canonicalNameKo: '닭고기분',
        canonicalNameEn: 'Chicken meal',
        status: 'active',
        evidence: [{
          sourceId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          title: '공식 원료 근거',
          organization: 'AAFCO',
          url: 'https://example.com/evidence',
          claimSummary: '검토된 원료 정의',
        }],
      }],
      rows: [
        {
          id: '11111111-1111-4111-8111-111111111111', submittedText: '낮은 빈도', normalizedText: '낮은빈도',
          occurrenceCount: 2, affectedProductCount: 1, rawExamples: ['낮은 빈도 1%'],
          candidateIngredientIds: [], aliasOwnerCanonicalId: null, firstSeenAt: '', lastSeenAt: '',
        },
        {
          id: '22222222-2222-4222-8222-222222222222', submittedText: '치킨 밀', normalizedText: '치킨밀',
          occurrenceCount: 18, affectedProductCount: 7, rawExamples: ['치킨 밀 20%', 'Chicken meal'],
          candidateIngredientIds: ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'], aliasOwnerCanonicalId: null,
          firstSeenAt: '', lastSeenAt: '',
        },
      ],
    };
    render(<AdminIngredients />, '/admin/ingredients?tab=canonical');
    expect(await screen.findByText('치킨 밀')).toBeTruthy();
    const names = Array.from(document.querySelectorAll('tbody .admin-item-main')).map((node) => node.textContent);
    expect(names).toEqual(['치킨 밀', '낮은 빈도']);
    expect(screen.getByText('7개')).toBeTruthy();
    expect(screen.getByText('치킨 밀 20% · Chicken meal')).toBeTruthy();

    fireEvent.click(screen.getAllByText('근거 연결')[0]);
    expect(await screen.findByText('공식 원료 근거')).toBeTruthy();
    const evidenceLink = screen.getByRole('link', { name: /AAFCO/ });
    expect(evidenceLink.getAttribute('target')).toBe('_blank');
    expect(evidenceLink.getAttribute('rel')).toBe('noopener noreferrer');
    expect(screen.getByText('검수 반영')).toHaveProperty('disabled', true);
    fireEvent.change(screen.getByLabelText('검수 메모*'), { target: { value: '공식 정의와 라벨 표기가 일치함' } });
    expect(screen.getByText('검수 반영')).toHaveProperty('disabled', false);
    fireEvent.click(screen.getByText('검수 반영'));
    await waitFor(() => expect(h.resolveCanonicalIngredientReview).toHaveBeenCalledWith(expect.objectContaining({
      aliasText: '치킨 밀',
      resolutionNote: '공식 정의와 라벨 표기가 일치함',
    })));
    expect(await screen.findByText('검수 완료 · 3개 제품 재분석 대기')).toBeTruthy();
  });

  it('근거가 없거나 별칭이 충돌하면 검수 반영을 막는다', async () => {
    h.canonicalReview = {
      activeEngine: { id: '99999999-9999-4999-8999-999999999999', version: 'ingredient-v2' },
      canonicalIngredients: [
        { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', canonicalNameKo: '근거 없음', canonicalNameEn: null, status: 'draft', evidence: [] },
        { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', canonicalNameKo: '기존 소유 원료', canonicalNameEn: null, status: 'active', evidence: [{ sourceId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', title: '근거', organization: null, url: null, claimSummary: '근거' }] },
      ],
      rows: [{
        id: '11111111-1111-4111-8111-111111111111', submittedText: '충돌 별칭', normalizedText: '충돌별칭',
        occurrenceCount: 4, affectedProductCount: 2, rawExamples: ['충돌 별칭'],
        candidateIngredientIds: [], aliasOwnerCanonicalId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', firstSeenAt: '', lastSeenAt: '',
      }],
    };
    render(<AdminIngredients />, '/admin/ingredients?tab=canonical');
    fireEvent.click(await screen.findByText('근거 연결'));
    fireEvent.change(screen.getByLabelText('표준 원료'), { target: { value: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' } });
    expect(await screen.findByText('검토 완료된 근거가 없어 활성화할 수 없습니다.')).toBeTruthy();
    expect(screen.getByText('검수 반영')).toHaveProperty('disabled', true);

    fireEvent.change(screen.getByLabelText('표준 원료'), { target: { value: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' } });
    expect(screen.getAllByRole('alert').map((alert) => alert.textContent).join(' ')).toContain('이미 기존 소유 원료에 연결');
    expect(h.resolveCanonicalIngredientReview).not.toHaveBeenCalled();
  });
});
