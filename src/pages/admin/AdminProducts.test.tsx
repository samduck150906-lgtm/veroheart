import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { AdminProductRow, ProductListParams } from '../../lib/adminApi';

const h = vi.hoisted(() => ({
  fetchProductsPage: vi.fn(),
  fetchProductIngredients: vi.fn(),
  saveProduct: vi.fn(),
  deleteProduct: vi.fn(),
  uploadProductImage: vi.fn(),
  searchIngredients: vi.fn(),
}));

vi.mock('../../lib/adminApi', () => ({
  fetchProductsPage: h.fetchProductsPage,
  fetchProductIngredients: h.fetchProductIngredients,
  saveProduct: h.saveProduct,
  deleteProduct: h.deleteProduct,
  uploadProductImage: h.uploadProductImage,
  searchIngredients: h.searchIngredients,
  validateProductImage: () => null,
}));

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }),
    }),
  },
}));

vi.mock('../../store/useNotification', () => ({
  notify: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

import AdminProducts from './AdminProducts';

function makeRow(index: number): AdminProductRow {
  return {
    id: `1111111${index}-1111-4111-8111-111111111111`,
    name: `테스트 사료 ${index}`,
    brand_name: '베로로',
    main_category: '사료',
    sub_category: null,
    target_pet_type: 'dog',
    target_life_stage: ['adult'],
    image_url: null,
    min_price: 10000,
    created_at: '2026-07-20T00:00:00Z',
  };
}

function renderProducts() {
  return render(
    <MemoryRouter>
      <AdminProducts />
    </MemoryRouter>,
  );
}

/** 검색 디바운스(300ms) 통과 */
async function flushDebounce() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 350));
  });
}

describe('AdminProducts', () => {
  beforeEach(() => {
    h.fetchProductsPage.mockReset().mockResolvedValue({
      rows: [makeRow(1), makeRow(2)],
      total: 45,
    });
    h.fetchProductIngredients.mockReset().mockResolvedValue([]);
    h.saveProduct.mockReset().mockResolvedValue({ id: 'p1' });
    h.deleteProduct.mockReset().mockResolvedValue(undefined);
    h.searchIngredients.mockReset().mockResolvedValue([]);
  });

  afterEach(() => cleanup());

  it('전건 조회 대신 서버 페이지네이션으로 조회한다', async () => {
    renderProducts();
    await waitFor(() => expect(h.fetchProductsPage).toHaveBeenCalled());

    const params = h.fetchProductsPage.mock.calls[0][0] as ProductListParams;
    expect(params.page).toBe(1);
    expect(params.pageSize).toBe(20);
    expect(await screen.findByText(/총 45개 제품/)).toBeTruthy();
    expect(screen.getByText(/1–20 표시 중/)).toBeTruthy();
  });

  it('다음 페이지로 이동하면 page 파라미터가 증가한다', async () => {
    renderProducts();
    await screen.findByText('테스트 사료 1');

    fireEvent.click(screen.getByLabelText('다음 페이지'));

    await waitFor(() => {
      const last = h.fetchProductsPage.mock.calls.at(-1)?.[0] as ProductListParams;
      expect(last.page).toBe(2);
    });
    expect(screen.getByText('2 / 3')).toBeTruthy();
  });

  it('검색어를 바꾸면 1페이지로 초기화된다', async () => {
    renderProducts();
    await screen.findByText('테스트 사료 1');

    fireEvent.click(screen.getByLabelText('다음 페이지'));
    await waitFor(() => expect(screen.getByText('2 / 3')).toBeTruthy());

    fireEvent.change(screen.getByLabelText('제품명, 브랜드 검색'), { target: { value: '오리젠' } });
    await flushDebounce();

    await waitFor(() => {
      const last = h.fetchProductsPage.mock.calls.at(-1)?.[0] as ProductListParams;
      expect(last.page).toBe(1);
      expect(last.search).toBe('오리젠');
    });
  });

  it('카테고리를 바꾸면 1페이지로 초기화된다', async () => {
    renderProducts();
    await screen.findByText('테스트 사료 1');

    fireEvent.click(screen.getByLabelText('다음 페이지'));
    await waitFor(() => expect(screen.getByText('2 / 3')).toBeTruthy());

    fireEvent.click(screen.getByText('간식'));

    await waitFor(() => {
      const last = h.fetchProductsPage.mock.calls.at(-1)?.[0] as ProductListParams;
      expect(last.page).toBe(1);
      expect(last.category).toBe('간식');
    });
  });

  it("'영양정보 없음' 을 켜면 그 조건으로만 조회하고 1페이지로 돌아간다", async () => {
    // 458건 중 어느 것이 비었는지 목록에서 눈으로 셀 수 없어, 조건으로 걸어야 한다.
    renderProducts();
    await screen.findByText('테스트 사료 1');

    fireEvent.click(screen.getByLabelText('다음 페이지'));
    await waitFor(() => expect(screen.getByText('2 / 3')).toBeTruthy());

    fireEvent.click(screen.getByText('영양정보 없음'));

    await waitFor(() => {
      const last = h.fetchProductsPage.mock.calls.at(-1)?.[0] as ProductListParams;
      expect(last.missingNutrition).toBe(true);
      expect(last.page).toBe(1);
    });
  });

  it("'영양정보 없음' 을 다시 끄면 조건이 풀린다", async () => {
    renderProducts();
    await screen.findByText('테스트 사료 1');

    fireEvent.click(screen.getByText('영양정보 없음'));
    await waitFor(() => {
      const last = h.fetchProductsPage.mock.calls.at(-1)?.[0] as ProductListParams;
      expect(last.missingNutrition).toBe(true);
    });

    fireEvent.click(screen.getByText('영양정보 없음'));
    await waitFor(() => {
      const last = h.fetchProductsPage.mock.calls.at(-1)?.[0] as ProductListParams;
      expect(last.missingNutrition).toBe(false);
    });
  });

  it('제품 저장 시 원재료 연결을 같은 요청으로 함께 보낸다', async () => {
    renderProducts();
    fireEvent.click(await screen.findByText('신규 제품 등록'));

    fireEvent.change(screen.getByLabelText('제품명*'), { target: { value: '새 사료' } });
    fireEvent.change(screen.getByLabelText('브랜드*'), { target: { value: '베로로' } });
    fireEvent.click(screen.getByText('저장하기'));

    await waitFor(() => expect(h.saveProduct).toHaveBeenCalledTimes(1));
    const payload = h.saveProduct.mock.calls[0][0];
    expect(payload.product).toMatchObject({ name: '새 사료', brand_name: '베로로' });
    expect(Array.isArray(payload.ingredients)).toBe(true);
  });

  it('제품명이 비면 저장하지 않는다', async () => {
    renderProducts();
    fireEvent.click(await screen.findByText('신규 제품 등록'));
    fireEvent.click(screen.getByText('저장하기'));

    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      '제품명과 브랜드는 필수입니다.',
    );
    expect(h.saveProduct).not.toHaveBeenCalled();
  });

  it('삭제는 확인 모달을 거친다', async () => {
    renderProducts();
    fireEvent.click(await screen.findByLabelText('테스트 사료 1 삭제'));

    expect(await screen.findByText('제품을 삭제할까요?')).toBeTruthy();
    expect(h.deleteProduct).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('삭제하기'));
    await waitFor(() => expect(h.deleteProduct).toHaveBeenCalledWith(makeRow(1).id));
  });

  it('결과가 없으면 조건에 맞는 제품이 없다고 알린다', async () => {
    h.fetchProductsPage.mockResolvedValue({ rows: [], total: 0 });
    renderProducts();
    expect(await screen.findByText(/등록된 제품이 없습니다/)).toBeTruthy();
  });
});
