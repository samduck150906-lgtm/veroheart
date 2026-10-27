import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { AdminProductRow, ProductListParams } from '../../lib/adminApi';

const h = vi.hoisted(() => ({
  setProductPinned: vi.fn(),
  fetchProductsPage: vi.fn(),
  fetchProductForEdit: vi.fn(),
  fetchProductEditBundle: vi.fn(),
  fetchProductIngredients: vi.fn(),
  saveProduct: vi.fn(),
  setProductVisibility: vi.fn(),
  deleteProduct: vi.fn(),
  uploadProductImage: vi.fn(),
  searchIngredients: vi.fn(),
  notifySuccess: vi.fn(),
}));

vi.mock('../../lib/adminApi', () => ({
  fetchCategories: () => Promise.resolve([]),
  setProductPinned: h.setProductPinned,
  fetchProductsPage: h.fetchProductsPage,
  fetchProductForEdit: h.fetchProductForEdit,
  fetchProductEditBundle: h.fetchProductEditBundle,
  fetchProductIngredients: h.fetchProductIngredients,
  saveProduct: h.saveProduct,
  setProductVisibility: h.setProductVisibility,
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
  notify: { success: h.notifySuccess, error: vi.fn(), info: vi.fn(), warning: vi.fn() },
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
    is_visible: true,
    verification_status: 'verified',
    is_pinned: false,
    pinned_order: 0,
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
    h.fetchProductForEdit.mockReset().mockResolvedValue(null);
    h.fetchProductEditBundle.mockReset().mockResolvedValue({ product: makeRow(1), nutrition: null, ingredients: [] });
    h.notifySuccess.mockReset();
    h.saveProduct.mockReset().mockResolvedValue({
      id: 'p1',
      product: {
        id: 'p1',
        name: '새 사료',
        brand_name: '베로로',
        main_category: '',
        sub_category: null,
        target_pet_type: 'dog',
        verification_status: 'pending',
        is_visible: true,
      },
    });
    h.deleteProduct.mockReset().mockResolvedValue(undefined);
    h.setProductVisibility.mockReset().mockResolvedValue(false);
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

    fireEvent.change(screen.getByLabelText('제품명, 브랜드, 바코드 검색'), { target: { value: '오리젠' } });
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

  it('대상·검수 상태 필터를 서버 조회에 반영한다', async () => {
    renderProducts();
    await screen.findByText('테스트 사료 1');

    fireEvent.change(screen.getByLabelText('대상'), { target: { value: 'cat' } });
    fireEvent.change(screen.getByLabelText('검수 상태'), { target: { value: 'verified' } });

    await waitFor(() => {
      const last = h.fetchProductsPage.mock.calls.at(-1)?.[0] as ProductListParams;
      expect(last.petType).toBe('cat');
      expect(last.verificationStatus).toBe('verified');
      expect(last.page).toBe(1);
    });
  });

  it('노출 상태 필터를 서버 조회에 반영한다', async () => {
    renderProducts();
    await screen.findByText('테스트 사료 1');

    fireEvent.change(screen.getByLabelText('노출 설정'), { target: { value: 'hidden' } });

    await waitFor(() => {
      const last = h.fetchProductsPage.mock.calls.at(-1)?.[0] as ProductListParams;
      expect(last.visibility).toBe('hidden');
      expect(last.page).toBe(1);
    });
  });

  it('목록에서 제품을 삭제하지 않고 앱 비노출로 전환한다', async () => {
    renderProducts();
    await screen.findByText('테스트 사료 1');

    fireEvent.click(screen.getByLabelText('테스트 사료 1 노출 설정 끄기'));

    await waitFor(() => {
      expect(h.setProductVisibility).toHaveBeenCalledWith(makeRow(1).id, false);
    });
    expect(screen.getByLabelText('테스트 사료 1 노출 설정 켜기')).toBeTruthy();
  });

  it.each(['pending', null] as const)('노출 설정이 켜져 있어도 %s 제품은 앱 비공개로 표시한다', async (status) => {
    h.fetchProductsPage.mockResolvedValue({
      rows: [{ ...makeRow(1), verification_status: status }],
      total: 1,
    });
    renderProducts();
    const row = (await screen.findByText('테스트 사료 1')).closest('tr')!;

    expect(within(row).getByRole('button', { name: '테스트 사료 1 노출 설정 끄기', pressed: true })).toBeTruthy();
    expect(within(row).getByText(/앱 비공개.*검수 대기/)).toBeTruthy();
    expect(h.setProductVisibility).not.toHaveBeenCalled();
  });

  it('검수 대기 제품의 노출 설정을 켜도 공개되었다고 안내하지 않는다', async () => {
    h.fetchProductsPage.mockResolvedValue({
      rows: [{ ...makeRow(1), verification_status: 'pending', is_visible: false }],
      total: 1,
    });
    renderProducts();
    fireEvent.click(await screen.findByRole('button', { name: '테스트 사료 1 노출 설정 켜기' }));

    await waitFor(() => expect(h.setProductVisibility).toHaveBeenCalledWith(makeRow(1).id, true));
    const row = screen.getByText('테스트 사료 1').closest('tr')!;
    expect(within(row).getByRole('button', { name: '테스트 사료 1 노출 설정 끄기', pressed: true })).toBeTruthy();
    expect(within(row).getByText(/앱 비공개.*검수 대기/)).toBeTruthy();
    expect(h.notifySuccess).toHaveBeenCalledWith(expect.stringMatching(/검수 대기.*앱 비공개/));
    expect(h.saveProduct).not.toHaveBeenCalled();
  });

  it('검수 대기 제품을 편집해도 노출 의도와 검수 상태를 그대로 저장한다', async () => {
    const pendingProduct = {
      ...makeRow(1),
      verification_status: 'pending',
      coupang_link: 'https://example.com/product',
    };
    h.fetchProductsPage.mockResolvedValue({ rows: [pendingProduct], total: 1 });
    h.fetchProductForEdit.mockResolvedValue(pendingProduct);
    h.fetchProductEditBundle.mockResolvedValue({ product: pendingProduct, nutrition: null, ingredients: [] });
    h.saveProduct.mockResolvedValue({ id: pendingProduct.id, product: pendingProduct });
    renderProducts();
    fireEvent.click(await screen.findByRole('button', { name: '테스트 사료 1 수정' }));

    const dialog = await screen.findByRole('dialog', { name: '제품 정보 수정' });
    expect(within(dialog).getByRole('checkbox', { name: '사용자 앱 노출 설정', checked: true })).toBeTruthy();
    expect(within(dialog).getByLabelText('검수 상태')).toHaveProperty('value', 'pending');
    expect(within(dialog).getByText(/앱 비공개.*검수 대기/)).toBeTruthy();
    fireEvent.change(within(dialog).getByLabelText('제품명*'), { target: { value: '검수 중인 사료' } });
    fireEvent.click(within(dialog).getByText('저장하기'));

    await waitFor(() => expect(h.saveProduct).toHaveBeenCalledTimes(1));
    expect(h.saveProduct.mock.calls[0][0].product).toMatchObject({
      name: '검수 중인 사료',
      verification_status: 'pending',
      is_visible: true,
    });
    expect(h.notifySuccess).toHaveBeenCalledWith(expect.stringMatching(/저장.*앱 비공개.*검수 대기/));
  });

  it.each([
    { verification_status: 'pending', is_visible: true },
    { verification_status: 'verified', is_visible: false },
  ])('비공개 제품을 편집할 때 기존 원재료와 나머지 영양정보를 보존한다 (%j)', async (visibility) => {
    const product = { ...makeRow(1), ...visibility, coupang_link: 'https://example.com/product' };
    const nutrition = { crude_protein: 30, crude_fat: 12, crude_fiber: 3, crude_ash: 7, moisture: 10, calcium: 1.2, phosphorus: 0.8 };
    h.fetchProductEditBundle.mockResolvedValue({
      product,
      nutrition,
      ingredients: [{ ingredientId: 'ingredient-1', nameKo: '연어', nameEn: 'Salmon', riskLevel: 'safe', sortOrder: 0 }],
    });
    renderProducts();
    fireEvent.click(await screen.findByRole('button', { name: '테스트 사료 1 수정' }));
    const dialog = await screen.findByRole('dialog', { name: '제품 정보 수정' });
    await waitFor(() => expect(within(dialog).getByLabelText('조단백질 (%)')).toHaveProperty('value', '30'));
    expect(within(dialog).getByText('연어')).toBeTruthy();
    fireEvent.change(within(dialog).getByLabelText('조단백질 (%)'), { target: { value: '31' } });
    fireEvent.click(within(dialog).getByText('저장하기'));

    await waitFor(() => expect(h.saveProduct).toHaveBeenCalledTimes(1));
    expect(h.saveProduct.mock.calls[0][0]).toMatchObject({
      product: visibility,
      nutrition: { ...nutrition, crude_protein: 31 },
      ingredients: [{ ingredient_id: 'ingredient-1', sort_order: 0 }],
    });
  });

  it('편집 자료를 모두 읽기 전에는 저장을 막는다', async () => {
    h.fetchProductEditBundle.mockReturnValue(new Promise(() => {}));
    renderProducts();
    fireEvent.click(await screen.findByRole('button', { name: '테스트 사료 1 수정' }));
    const dialog = await screen.findByRole('dialog', { name: '제품 정보 수정' });
    const save = within(dialog).getByRole('button', { name: '저장하기' });
    expect(save).toHaveProperty('disabled', true);
    fireEvent.click(save);
    expect(h.saveProduct).not.toHaveBeenCalled();
  });

  it('편집 자료 조회에 실패하면 빈 데이터로 저장할 수 없다', async () => {
    h.fetchProductEditBundle.mockRejectedValue(new Error('원재료 조회 실패'));
    renderProducts();
    fireEvent.click(await screen.findByRole('button', { name: '테스트 사료 1 수정' }));
    const dialog = await screen.findByRole('dialog', { name: '제품 정보 수정' });
    expect((await within(dialog).findByRole('alert')).textContent).toMatch(/원재료 조회 실패/);
    const save = within(dialog).getByRole('button', { name: '저장하기' });
    expect(save).toHaveProperty('disabled', true);
    fireEvent.click(save);
    expect(h.saveProduct).not.toHaveBeenCalled();
  });

  it('닫은 편집 화면의 늦은 응답은 새 등록 양식을 덮어쓰지 않는다', async () => {
    let resolveLoad!: (value: unknown) => void;
    h.fetchProductEditBundle.mockReturnValue(new Promise((resolve) => { resolveLoad = resolve; }));
    renderProducts();
    fireEvent.click(await screen.findByRole('button', { name: '테스트 사료 1 수정' }));
    fireEvent.click(screen.getByRole('button', { name: '모달 닫기' }));
    fireEvent.click(screen.getByRole('button', { name: '신규 제품 등록' }));
    await act(async () => resolveLoad({ product: makeRow(1), nutrition: null, ingredients: [] }));

    const dialog = screen.getByRole('dialog', { name: '신규 제품 등록' });
    expect(within(dialog).getByLabelText('제품명*')).toHaveProperty('value', '');
    expect(within(dialog).getByRole('button', { name: '저장하기' })).toHaveProperty('disabled', false);
  });

  it('제품 저장 시 원재료 연결을 같은 요청으로 함께 보낸다', async () => {
    renderProducts();
    fireEvent.click(await screen.findByText('신규 제품 등록'));

    fireEvent.change(screen.getByLabelText('제품명*'), { target: { value: '새 사료' } });
    fireEvent.change(screen.getByLabelText('브랜드*'), { target: { value: '베로로' } });
    fireEvent.change(screen.getByLabelText('판매처 링크 *'), {
      target: { value: 'https://www.coupang.com/vp/products/7654321?itemId=1' },
    });
    fireEvent.click(screen.getByText('저장하기'));

    await waitFor(() => expect(h.saveProduct).toHaveBeenCalledTimes(1));
    const payload = h.saveProduct.mock.calls[0][0];
    expect(payload.product).toMatchObject({
      name: '새 사료',
      brand_name: '베로로',
      main_category: '사료',
      is_visible: true,
      coupang_link: 'https://www.coupang.com/vp/products/7654321?itemId=1',
      // 링크에서 뽑은 상품번호가 판매가 확인의 열쇠다.
      coupang_product_id: '7654321',
    });
    expect(Array.isArray(payload.ingredients)).toBe(true);
  });

  it('keeps unreported nutrition blank when one nutrient is supplied', async () => {
    renderProducts();
    fireEvent.click(await screen.findByText('신규 제품 등록'));
    fireEvent.change(screen.getByLabelText('제품명*'), { target: { value: '새 사료' } });
    fireEvent.change(screen.getByLabelText('브랜드*'), { target: { value: '베로로' } });
    fireEvent.change(screen.getByLabelText('판매처 링크 *'), { target: { value: 'https://example.com/product' } });
    fireEvent.change(screen.getByLabelText('조단백질 (%)'), { target: { value: '22' } });
    fireEvent.click(screen.getByText('저장하기'));
    await waitFor(() => expect(h.saveProduct).toHaveBeenCalledTimes(1));
    expect(h.saveProduct.mock.calls[0][0].nutrition).toMatchObject({ crude_protein: 22, moisture: null, crude_fat: null, calcium: null });
  });

  it('판매처 링크가 없으면 저장하지 않는다', async () => {
    renderProducts();
    fireEvent.click(await screen.findByText('신규 제품 등록'));

    fireEvent.change(screen.getByLabelText('제품명*'), { target: { value: '새 사료' } });
    fireEvent.change(screen.getByLabelText('브랜드*'), { target: { value: '베로로' } });
    fireEvent.click(screen.getByText('저장하기'));

    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      '판매처 링크는 필수입니다. 가격 확인의 근거가 됩니다.',
    );
    expect(h.saveProduct).not.toHaveBeenCalled();
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
