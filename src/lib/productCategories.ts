/**
 * 사용자 앱이 읽는 공개 카테고리 목록(product_categories).
 *
 * - `is_active = true` 인 행만 anon SELECT 정책으로 읽을 수 있다.
 * - 쓰기는 관리자 콘솔(admin-write Edge Function)만 한다.
 * - 조회 실패나 마이그레이션 미적용 환경에서는 기존 하드코딩 목록으로 되돌아가
 *   홈·검색의 카테고리 진입이 통째로 사라지지 않게 한다.
 *
 * 상위 이름은 `products.main_category`, 하위 이름은 `products.sub_category`와 대조한다.
 * 관리자가
 * 이름을 바꿀 때 서버가 해당 제품의 분류도 함께 옮긴다(admin-write saveCategory).
 */
import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';

export interface ProductCategory {
  name: string;
  /** 홈 카테고리 카드에 한 줄로 붙는 설명. 없으면 표시하지 않는다. */
  hint: string | null;
  /** 활성 상위 분류에 속한 활성 하위 분류. 관리자 지정 순서를 유지한다. */
  subCategories?: string[];
}

/** 이전 홈 링크가 하위 이름만 보낸 경우에도 실제 상위·하위 조건으로 검색한다. */
export function resolveSearchCategory(
  categories: ProductCategory[], category: string | null, subCategory: string | null,
): { category: string; subCategory: string } {
  if (!category || category === '전체') return { category: '전체', subCategory: '' };
  if (categories.some(item => item.name === category)) return { category, subCategory: subCategory ?? '' };
  const parents = categories.filter(item => item.subCategories?.includes(category));
  if (parents.length === 1) return { category: parents[0].name, subCategory: category };
  // 과거 고정 칩의 링크 호환. 운영 중인 분류와 충돌하면 위의 실제 분류가 우선한다.
  if (category === '건식사료' || category === '습식사료') return { category: '사료', subCategory: subCategory ?? '' };
  // 모르는 분류나 모호한 하위 이름을 전체 검색으로 넓히지 않는다.
  return { category, subCategory: subCategory ?? '' };
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
let revision = 0;
const CATEGORIES_CHANGED = 'veroheart:categories-changed';

/** Invalidate immediately after category writes in the administrator console. */
export function invalidateProductCategoriesCache(): void {
  cachedAt = 0;
  inFlight = null;
  revision += 1;
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(CATEGORIES_CHANGED));
}

function isCacheFresh(): boolean {
  return cached !== null && Date.now() - cachedAt < CATEGORIES_TTL_MS;
}

export async function loadProductCategories(): Promise<ProductCategory[]> {
  if (!isSupabaseConfigured) return DEFAULT_PRODUCT_CATEGORIES;
  if (isCacheFresh()) return cached as ProductCategory[];
  if (inFlight) return inFlight;

  const requestedRevision = revision;
  // Assign the promise before a synchronous client failure can run finally.
  inFlight = Promise.resolve().then(async () => {
    try {
      const { data, error } = await supabase
        .from('product_categories')
        .select('id, name, hint, parent_id, sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });
      // Empty is an intentional administrator setting, not a missing schema.
      if (requestedRevision !== revision) return loadProductCategories();
      if (error || !data) return cached ?? DEFAULT_PRODUCT_CATEGORIES;

      const rows = data as { id: string; name: string; hint: string | null; parent_id: string | null }[];
      const categories = rows.filter(row => row.parent_id === null)
        .map((row) => ({
          name: String(row.name ?? '').trim(), hint: row.hint ?? null,
          subCategories: rows.filter(child => child.parent_id !== null && child.parent_id === row.id)
            .map(child => String(child.name ?? '').trim()).filter(Boolean),
        }))
        .filter((row) => row.name.length > 0);

      cached = categories;
      cachedAt = Date.now();
      return categories;
    } catch {
      return cached ?? DEFAULT_PRODUCT_CATEGORIES;
    } finally {
      if (requestedRevision === revision) inFlight = null;
    }
  });

  return inFlight;
}

/** 공개 카테고리 훅. 로드 전에는 기본 목록을 돌려준다. */
export function useProductCategories(): ProductCategory[] {
  const [categories, setCategories] = useState<ProductCategory[]>(
    cached ?? DEFAULT_PRODUCT_CATEGORIES,
  );

  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      if (document.visibilityState === 'hidden') return;
      void loadProductCategories().then((next) => {
        if (!cancelled) setCategories(next);
      });
    };
    refresh();
    window.addEventListener('focus', refresh);
    window.addEventListener(CATEGORIES_CHANGED, refresh);
    document.addEventListener('visibilitychange', refresh);
    const interval = window.setInterval(refresh, CATEGORIES_TTL_MS);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', refresh);
      window.removeEventListener(CATEGORIES_CHANGED, refresh);
      document.removeEventListener('visibilitychange', refresh);
      window.clearInterval(interval);
    };
  }, []);

  return categories;
}
