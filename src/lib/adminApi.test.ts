import { describe, it, expect, beforeEach, vi } from 'vitest';

const h = vi.hoisted(() => ({ adminWrite: vi.fn(), from: vi.fn() }));

vi.mock('./supabase', () => ({
  adminWrite: h.adminWrite,
  supabase: { from: h.from },
}));

import {
  PRODUCT_IMAGE_MAX_BYTES,
  SETTING_KEYS,
  deleteIngredient,
  fetchDiaryPage,
  fetchMemberDetail,
  fetchSettings,
  fetchWaitlistPage,
  saveProduct,
  saveIngredient,
  saveSettings,
  validateProductImage,
} from './adminApi';

function fakeFile(type: string, size: number): File {
  const file = new File(['x'], 'photo', { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

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
    await saveIngredient({ name_ko: '연어', risk_level: 'safe' });
    expect(h.adminWrite).toHaveBeenCalledWith('saveIngredient', {
      ingredient: { name_ko: '연어', risk_level: 'safe' },
    });
  });

  it('성분 삭제도 프록시를 거친다', async () => {
    await deleteIngredient('11111111-1111-4111-8111-111111111111');
    expect(h.adminWrite).toHaveBeenCalledWith('deleteIngredient', {
      id: '11111111-1111-4111-8111-111111111111',
    });
  });

  it('제품 저장 뒤 사용자 앱과 같은 공개 조회로 제품명과 브랜드를 확인한다', async () => {
    const confirmed = {
      id: '11111111-1111-4111-8111-111111111111',
      name: '바뀐 제품명',
      brand_name: '베로로',
      main_category: '사료',
      sub_category: null,
      target_pet_type: 'dog',
      verification_status: 'verified',
    };
    const single = vi.fn().mockResolvedValue({ data: confirmed, error: null });
    const eq = vi.fn().mockReturnValue({ single });
    const select = vi.fn().mockReturnValue({ eq });
    h.from.mockReturnValue({ select });
    h.adminWrite.mockResolvedValue({ id: confirmed.id });

    await expect(saveProduct({
      product: { name: ' 바뀐 제품명 ', brand_name: ' 베로로 ' },
      nutrition: null,
    })).resolves.toEqual({ id: confirmed.id, product: confirmed });

    expect(h.adminWrite).toHaveBeenCalledWith('saveProduct', expect.objectContaining({
      product: expect.objectContaining({ name: ' 바뀐 제품명 ' }),
    }));
    expect(h.from).toHaveBeenCalledWith('products');
    expect(eq).toHaveBeenCalledWith('id', confirmed.id);
  });

  it('저장 응답이 성공이어도 공개 DB 값이 다르면 성공으로 처리하지 않는다', async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        id: '11111111-1111-4111-8111-111111111111',
        name: '예전 제품명',
        brand_name: '베로로',
      },
      error: null,
    });
    h.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ single }),
      }),
    });
    h.adminWrite.mockResolvedValue({ id: '11111111-1111-4111-8111-111111111111' });

    await expect(saveProduct({
      product: { name: '바뀐 제품명', brand_name: '베로로' },
      nutrition: null,
    })).rejects.toThrow('저장 확인 불일치');
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
      'maintenance_mode',
      'phase2_alias_observation_enabled',
      'service_notice',
      'signup_enabled',
      'viral_event_visible',
    ]);
  });
});
