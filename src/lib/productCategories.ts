/**
 * 사용자 앱이 읽는 공개 카테고리 목록(product_categories).
 *
 * - `is_active = true` 인 행만 anon SELECT 정책으로 읽을 수 있다.
 * - 쓰기는 관리자 콘솔(admin-write Edge Function)만 한다.
 * - 조회 실패나 마이그레이션 미적용 환경에서는 기존 하드코딩 목록으로 되돌아가
 *   홈·검색의 카테고리 진입이 통째로 사라지지 않게 한다.
 *
 * 이름(name)은 `products.main_category` 값과 글자 그대로 대조되므로, 관리자가
 * 이름을 바꿀 때 서버가 해당 제품의 분류도 함께 옮긴다(admin-write saveCategory).
 */
import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';

export interface ProductCategory {
  name: string;
  /** 홈 카테고리 카드에 한 줄로 붙는 설명. 없으면 표시하지 않는다. */
  hint: string | null;
}

/** DB를 읽지 못했을 때 쓰는 기본 카테고리. 최초 시드와 같은 값이다. */
export const DEFAULT_PRODUCT_CATEGORIES: ProductCategory[] = [
  { name: '사료', hint: '매일 먹는 주식' },
  { name: '간식', hint: '훈련·보상용' },
  { name: '영양제', hint: '부족한 영양 보충' },
];

/**
 * 캐시 수명(ms).
 *
 * 카테고리는 운영 중 자주 바뀌지 않지만, 관리자가 순서를 바꾼 뒤 앱을 다시 열지
 * 않아도 반영되도록 공개 설정과 같은 정도의 간격으로 동기화한다.
 */
const CATEGORIES_TTL_MS = 60 * 1000;

let cached: ProductCategory[] | null = null;
let cachedAt = 0;
let inFlight: Promise<ProductCategory[]> | null = null;

/** 테스트 전용 — 캐시를 비운다. */
export function __resetProductCategoriesCache(): void {
  cached = null;
  cachedAt = 0;
  inFlight = null;
}

function isCacheFresh(): boolean {
  return cached !== null && Date.now() - cachedAt < CATEGORIES_TTL_MS;
}

export async function loadProductCategories(): Promise<ProductCategory[]> {
  if (isCacheFresh()) return cached as ProductCategory[];
  if (inFlight) return inFlight;

  inFlight = (async () => {
    if (!isSupabaseConfigured) return DEFAULT_PRODUCT_CATEGORIES;
    try {
      const { data, error } = await supabase
        .from('product_categories')
        .select('name, hint, sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });
      // 테이블이 아직 없거나(마이그레이션 전) 전부 꺼져 있으면 기본값을 쓴다.
      if (error || !data || data.length === 0) return DEFAULT_PRODUCT_CATEGORIES;

      const categories = (data as { name: string; hint: string | null }[])
        .map((row) => ({ name: String(row.name ?? '').trim(), hint: row.hint ?? null }))
        .filter((row) => row.name.length > 0);
      if (categories.length === 0) return DEFAULT_PRODUCT_CATEGORIES;

      cached = categories;
      cachedAt = Date.now();
      return categories;
    } catch {
      return DEFAULT_PRODUCT_CATEGORIES;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

/** 공개 카테고리 훅. 로드 전에는 기본 목록을 돌려준다. */
export function useProductCategories(): ProductCategory[] {
  const [categories, setCategories] = useState<ProductCategory[]>(
    cached ?? DEFAULT_PRODUCT_CATEGORIES,
  );

  useEffect(() => {
    let cancelled = false;
    loadProductCategories().then((next) => {
      if (!cancelled) setCategories(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return categories;
}
