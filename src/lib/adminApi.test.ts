import { describe, it, expect, beforeEach, vi } from 'vitest';

const h = vi.hoisted(() => ({
  adminWrite: vi.fn(),
  callAdminFunction: vi.fn(),
  from: vi.fn(),
}));

vi.mock('./supabase', () => ({
  adminWrite: h.adminWrite,
  callAdminFunction: h.callAdminFunction,
  supabase: { from: h.from },
}));

import {
  PRODUCT_IMAGE_MAX_BYTES,
  SETTING_KEYS,
  deleteIngredient,
  applyProductCleanup,
  fetchDiaryPage,
  fetchProductEditBundle,
  fetchProductIngredients,
  fetchProductsPage,
  fetchMemberDetail,
  fetchSettings,
  fetchWaitlistPage,
  saveProduct,
  setProductVisibility,
  saveIngredient,
  saveSettings,
  validateProductImage,
} from './adminApi';

function fakeFile(type: string, size: number): File {
  const file = new File(['x'], 'photo', { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

describe('adminApi: 비공개 제품 편집 자료', () => {
  const id = '11111111-1111-4111-8111-111111111111';
  const ingredient = { ingredient_id: 'ingredient-1', sort_order: 0, ingredients: { id: 'ingredient-1', name_ko: '연어', name_en: 'Salmon', risk_level: 'safe' } };
  const nutrition = { crude_protein: 30, crude_fat: 12, crude_fiber: 3, crude_ash: 7, moisture: 10, calcium: 1.2, phosphorus: 0.8 };
  const product = { id, name: '검수 중 사료', is_visible: true, verification_status: 'pending' };

  beforeEach(() => {
    h.callAdminFunction.mockReset().mockResolvedValue({ product: { ...product, product_ingredients: [ingredient], nutritional_profiles: nutrition } });
    // 공개 경로에서는 비공개 제품의 원재료가 보이지 않는다.
    h.from.mockReset().mockReturnValue({
      select: () => ({ eq: () => ({ order: async () => ({ data: [], error: null }) }) }),
    });
  });

  it('검수 대기 제품의 원재료는 인증된 관리자 조회로 읽는다', async () => {
    await expect(fetchProductIngredients(id)).resolves.toEqual([{
      ingredientId: 'ingredient-1', nameKo: '연어', nameEn: 'Salmon', riskLevel: 'safe', sortOrder: 0,
    }]);
    expect(h.callAdminFunction).toHaveBeenCalledWith('admin-products-read', { view: 'edit', id });
    expect(h.from).not.toHaveBeenCalled();
  });

  it.each([nutrition, [nutrition]])('제품·원재료·영양정보를 하나의 완전한 편집 응답으로 보존한다 (%j)', async (profile) => {
    h.callAdminFunction.mockResolvedValue({ product: { ...product, product_ingredients: [ingredient], nutritional_profiles: profile } });
    await expect(fetchProductEditBundle(id)).resolves.toEqual({
      product,
      nutrition,
      ingredients: [{ ingredientId: 'ingredient-1', nameKo: '연어', nameEn: 'Salmon', riskLevel: 'safe', sortOrder: 0 }],
    });
  });

  it.each([
    { ...product, nutritional_profiles: nutrition },
    { ...product, product_ingredients: [ingredient] },
    { ...product, product_ingredients: [{ ...ingredient, ingredients: null }], nutritional_profiles: nutrition },
  ])('편집 자료가 불완전하면 빈 원재료·영양정보로 대체하지 않는다', async (incompleteProduct) => {
    h.callAdminFunction.mockResolvedValue({ product: incompleteProduct });
    await expect(fetchProductEditBundle(id)).rejects.toThrow(/편집 자료/);
  });

  it('조회 실패와 사라진 제품을 빈 편집 양식으로 반환하지 않는다', async () => {
    h.callAdminFunction.mockRejectedValueOnce(new Error('관리자 조회 실패'));
    await expect(fetchProductEditBundle(id)).rejects.toThrow('관리자 조회 실패');
    h.callAdminFunction.mockResolvedValueOnce({ product: null });
    await expect(fetchProductEditBundle(id)).rejects.toThrow(/제품/);
  });

  it('명시적으로 비어 있는 원재료와 영양정보는 편집할 수 있다', async () => {
    h.callAdminFunction.mockResolvedValue({ product: { ...product, product_ingredients: [], nutritional_profiles: null } });
    await expect(fetchProductEditBundle(id)).resolves.toEqual({ product, ingredients: [], nutrition: null });
  });

  it('노출 설정이 null인 목록 제품을 켜짐으로 바꾸지 않는다', async () => {
    h.callAdminFunction.mockResolvedValue({ rows: [{ ...product, is_visible: null }], total: 1 });
    const result = await fetchProductsPage({ page: 1, pageSize: 20 });
    expect(result.rows[0].is_visible).toBe(false);
  });
});

describe('adminApi: 제품 이미지 사전 검증', () => {
  it('JPG · PNG · WebP 를 허용한다', () => {
    expect(validateProductImage(fakeFile('image/jpeg', 1000))).toBeNull();
    expect(validateProductImage(fakeFile('image/png', 1000))).toBeNull();
    expect(validateProductImage(fakeFile('image/webp', 1000))).toBeNull();
  });

  it('SVG 등 그 외 형식을 차단한다', () => {
    expect(validateProductImage(fakeFile('image/svg+xml', 1000))).toContain('JPG, PNG, WebP');
    expect(validateProductImage(fakeFile('application/pdf', 1000))).toContain('JPG, PNG, WebP');
  });

  it('용량 상한을 넘기면 거부한다', () => {
    expect(validateProductImage(fakeFile('image/png', PRODUCT_IMAGE_MAX_BYTES + 1))).toContain('용량');
  });
});

describe('adminApi: 쓰기 경로', () => {
  beforeEach(() => {
    h.adminWrite.mockReset().mockResolvedValue({ ok: true });
    h.from.mockReset();
  });

  it('성분 저장은 anon 클라이언트가 아니라 admin-write 프록시를 호출한다', async () => {
    const confirmed = {
      id: '11111111-1111-4111-8111-111111111111',
      name_ko: '연어',
      name_en: 'Salmon',
      risk_level: 'safe',
      description: null,
      category: '동물성 단백질',
    };
    h.adminWrite.mockResolvedValue({ id: confirmed.id });
    h.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: confirmed, error: null }),
        }),
      }),
    });

    await expect(saveIngredient({ name_ko: '연어', risk_level: 'safe' }))
      .resolves.toEqual({ id: confirmed.id, ingredient: expect.objectContaining(confirmed) });
    expect(h.adminWrite).toHaveBeenCalledWith('saveIngredient', {
      ingredient: { name_ko: '연어', risk_level: 'safe' },
    });
    expect(h.from).toHaveBeenCalledWith('ingredients');
  });

  it('성분 저장 응답과 공개 DB 값이 다르면 성공으로 처리하지 않는다', async () => {
    h.adminWrite.mockResolvedValue({ id: '11111111-1111-4111-8111-111111111111' });
    h.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { name_ko: '이전 이름', risk_level: 'safe' },
            error: null,
          }),
        }),
      }),
    });

    await expect(saveIngredient({ name_ko: '새 이름', risk_level: 'safe' }))
      .rejects.toThrow('저장 확인 불일치');
  });

  it('성분 삭제도 프록시를 거친다', async () => {
    await deleteIngredient('11111111-1111-4111-8111-111111111111');
    expect(h.adminWrite).toHaveBeenCalledWith('deleteIngredient', {
      id: '11111111-1111-4111-8111-111111111111',
    });
  });

  it('제품 저장 뒤 관리자 경로로 다시 읽어 제품명과 브랜드를 확인한다', async () => {
    // 공개 조회로 확인하던 예전 방식은 쓸 수 없다. products 의 공개 정책이
    // "앱에 실제로 보이는 제품"으로 좁혀져서, 비노출로 저장한 제품은 공개
    // 경로에서 안 보이는 것이 정상이기 때문이다.
    const confirmed = {
      id: '11111111-1111-4111-8111-111111111111',
      name: '바뀐 제품명',
      brand_name: '베로로',
      main_category: '사료',
      sub_category: null,
      target_pet_type: 'dog',
      verification_status: 'verified',
      is_visible: true,
    };
    h.adminWrite.mockResolvedValue({ id: confirmed.id });
    h.callAdminFunction.mockResolvedValue({ product: confirmed });
    // 노출로 저장했으므로 앱에서도 보이는지 확인하는 조회가 뒤따른다.
    h.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: confirmed.id }, error: null }),
        }),
      }),
    });

    await expect(saveProduct({
      product: { name: ' 바뀐 제품명 ', brand_name: ' 베로로 ' },
      nutrition: null,
    })).resolves.toEqual({ id: confirmed.id, product: confirmed });

    expect(h.adminWrite).toHaveBeenCalledWith('saveProduct', expect.objectContaining({
      product: expect.objectContaining({ name: ' 바뀐 제품명 ' }),
    }));
    expect(h.callAdminFunction).toHaveBeenCalledWith(
      'admin-products-read',
      { view: 'full', id: confirmed.id },
    );
  });

  it('저장 응답이 성공이어도 DB 값이 다르면 성공으로 처리하지 않는다', async () => {
    h.adminWrite.mockResolvedValue({ id: '11111111-1111-4111-8111-111111111111' });
    h.callAdminFunction.mockResolvedValue({
      product: {
        id: '11111111-1111-4111-8111-111111111111',
        name: '예전 제품명',
        brand_name: '베로로',
        is_visible: true,
      },
    });

    await expect(saveProduct({
      product: { name: '바뀐 제품명', brand_name: '베로로' },
      nutrition: null,
    })).rejects.toThrow('저장 확인 불일치');
  });

  it('비노출로 저장한 제품은 앱에 안 보여도 저장 실패로 보지 않는다', async () => {
    // 비노출 제품이 공개 경로에서 안 보이는 것은 정상이다 — 그걸 실패로
    // 처리하면 제품을 내리는 순간 저장이 막힌다.
    const hidden = {
      id: '11111111-1111-4111-8111-111111111111',
      name: '내린 제품',
      brand_name: '베로로',
      is_visible: false,
    };
    h.adminWrite.mockResolvedValue({ id: hidden.id });
    h.callAdminFunction.mockResolvedValue({ product: hidden });
    h.from.mockReset();

    await expect(saveProduct({
      product: { name: '내린 제품', brand_name: '베로로', is_visible: false },
      nutrition: null,
    })).resolves.toMatchObject({ id: hidden.id });
    // 공개 조회 자체를 하지 않는다.
    expect(h.from).not.toHaveBeenCalled();
  });

  it('제품 노출 상태 변경은 관리자 프록시의 확인 응답까지 검사한다', async () => {
    h.adminWrite.mockResolvedValue({
      product: {
        id: '11111111-1111-4111-8111-111111111111',
        is_visible: false,
      },
    });

    await expect(setProductVisibility(
      '11111111-1111-4111-8111-111111111111',
      false,
    )).resolves.toBe(false);
    expect(h.adminWrite).toHaveBeenCalledWith('setProductVisibility', {
      id: '11111111-1111-4111-8111-111111111111',
      isVisible: false,
    });
  });

  it('제품 정리는 기존값과 선택된 필드만 관리자 프록시에 전달하고 항목별 결과를 반환한다', async () => {
    h.adminWrite.mockResolvedValue({
      batchId: 'batch-1',
      requested: 1,
      applied: 0,
      conflicts: 1,
      failed: 0,
      results: [{ id: '11111111-1111-4111-8111-111111111111', status: 'conflict' }],
    });
    const items = [{
      id: '11111111-1111-4111-8111-111111111111',
      expectedName: '기존 이름',
      expectedBrandName: '기존 브랜드',
      name: '새 이름',
    }];
    await expect(applyProductCleanup(items)).resolves.toMatchObject({
      batchId: 'batch-1', conflicts: 1, results: [{ status: 'conflict' }],
    });
    expect(h.adminWrite).toHaveBeenCalledWith('applyProductCleanup', { items });
  });

  it('개인 데이터 운영 조회는 admin-write를 거친다', async () => {
    h.adminWrite
      .mockResolvedValueOnce({ id: 'member-1', nickname: '베로로', pets: [] })
      .mockResolvedValueOnce({ total: 0, logs: [] })
      .mockResolvedValueOnce({ total: 0, entries: [] });

    await fetchMemberDetail('11111111-1111-4111-8111-111111111111');
    await fetchDiaryPage({ page: 2, pageSize: 20, petType: 'cat', hasPhoto: true });
    await fetchWaitlistPage({ page: 1, pageSize: 20, marketingConsent: false });

    expect(h.adminWrite).toHaveBeenNthCalledWith(1, 'getMemberDetail', {
      id: '11111111-1111-4111-8111-111111111111',
    });
    expect(h.adminWrite).toHaveBeenNthCalledWith(2, 'listFeedingLogs', expect.objectContaining({
      page: 2,
      petType: 'cat',
      hasPhoto: true,
    }));
    expect(h.adminWrite).toHaveBeenNthCalledWith(3, 'listWaitlist', expect.objectContaining({
      marketingConsent: false,
    }));
  });

  it('관리자 설정 조회도 공개 RLS가 아니라 admin-write를 거친다', async () => {
    h.adminWrite.mockResolvedValue({
      settings: [
        {
          key: 'service_notice',
          value: { enabled: true, message: '운영 공지' },
          description: '서비스 공지',
          updated_at: '2026-09-10T00:00:00.000Z',
          updated_by: 'admin',
        },
      ],
    });

    await expect(fetchSettings()).resolves.toEqual([
      expect.objectContaining({
        key: 'service_notice',
        value: { enabled: true, message: '운영 공지' },
      }),
    ]);
    expect(h.adminWrite).toHaveBeenCalledWith('getSettings');
  });

  it('허용되지 않은 설정 키는 서버로 보내지 않는다', async () => {
    h.adminWrite.mockResolvedValue({ saved: 1 });
    await saveSettings({
      maintenance_mode: true,
      // @ts-expect-error 허용 목록 밖 키 — 런타임에서도 걸러져야 한다
      service_role_key: 'leak',
    });
    expect(h.adminWrite).toHaveBeenCalledWith('saveSettings', {
      settings: { maintenance_mode: true },
    });
  });

  it('보낼 설정이 하나도 없으면 요청 자체를 만들지 않는다', async () => {
    // @ts-expect-error 허용 목록 밖 키만 전달
    await expect(saveSettings({ nope: 1 })).rejects.toThrow('저장할 설정이 없습니다.');
    expect(h.adminWrite).not.toHaveBeenCalled();
  });

  it('설정 키 목록이 Edge Function 화이트리스트와 같은 값을 쓴다', () => {
    expect([...SETTING_KEYS].sort()).toEqual([
      'hide_unverified_products',
      'maintenance_mode',
      'phase2_alias_observation_enabled',
      'service_notice',
      'signup_enabled',
      'viral_event_visible',
    ]);
  });
});
