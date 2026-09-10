import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getBrands,
  getProductsByBrand,
  isSupabaseConfigured,
} from './supabase';

describe('Supabase 미설정 폴백', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('브랜드 화면 조회가 더미 호스트로 네트워크 요청을 보내지 않는다', async () => {
    expect(isSupabaseConfigured).toBe(false);
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    await expect(getBrands()).resolves.toEqual([]);
    await expect(getProductsByBrand('테스트 브랜드')).resolves.toEqual([]);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('빈 브랜드명도 조회하지 않는다', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    await expect(getProductsByBrand('   ')).resolves.toEqual([]);

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
