import { describe, it, expect, beforeEach, vi } from 'vitest';

const h = vi.hoisted(() => ({ adminWrite: vi.fn() }));

vi.mock('./supabase', () => ({
  adminWrite: h.adminWrite,
  supabase: { from: () => ({ select: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }) },
}));

import {
  PRODUCT_IMAGE_MAX_BYTES,
  SETTING_KEYS,
  deleteIngredient,
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
