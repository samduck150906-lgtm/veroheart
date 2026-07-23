import { createClient } from '@supabase/supabase-js';
import { notify } from '../store/useNotification';
import type { FeedingLogInput, PetFeedingLog, Product, SupabasePet } from '../types';
import {
  mapFeedingLogFromRow,
  mapProductFromSupabaseRow,
  type SupabaseBrandNameRow,
  type SupabaseFavoriteRow,
  type SupabaseFeedingLogRow,
  type SupabaseProductRow,
  type SupabaseRecentViewRow,
} from './supabaseRowTypes';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://veroro.invalid',
  isSupabaseConfigured ? supabaseKey : 'public-anon-key'
);

/**
 * 관리자 쓰기 프록시 호출. anon 키로는 RLS에 막혀 쓸 수 없으므로,
 * service_role로 동작하는 admin-write Edge Function을 통해 쓴다.
 * 관리자 토큰(sessionStorage 'vh_admin_auth')을 x-admin-token 헤더로 전달해 서버가 검증한다.
 */
export async function adminWrite<T = unknown>(
  action: string,
  data: Record<string, unknown> = {},
  tokenOverride?: string,
): Promise<T> {
  const token =
    tokenOverride ??
    (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('vh_admin_auth') ?? '' : '');
  const res = await fetch(`${supabaseUrl}/functions/v1/admin-write`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'x-admin-token': token,
    },
    body: JSON.stringify({ action, ...data }),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((payload as { error?: string })?.error || `요청 실패 (${res.status})`);
  return payload as T;
}

// Auth, User functions (Omitted for brevity, but I will keep them same as before)
// ... keeping them all for a complete file rewrite ...

/**
 * 이메일 로그인만 사용합니다. 익명 로그인(signInAnonymously)은 호출하지 않습니다.
 * (Supabase에서 익명 로그인이 꺼져 있으면 기존 구현이 진입 시 오류 토스트를 띄웠습니다.)
 */
export async function getInitialSessionUser() {
  if (!isSupabaseConfigured) return null;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) return session.user;
    
    // We do NOT sign in anonymously anymore, we wait for user to sign up
    return null;
  } catch (err) {
    console.error('Session init error:', err);
    return null;
  }
}

export async function signUpWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  if (error) {
    notify.error(error.message);
    return null;
  }
  return data.user;
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    notify.error('로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.');
    return null;
  }
  return data.user;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) notify.error(error.message);
}

export async function getCurrentUser() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user || null;
}

export async function getUserProfile(userId: string) {
  const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();
  if (error && error.code !== 'PGRST116') {
    notify.error('프로필 정보를 불러오는데 실패했습니다.');
  }
  return data;
}

export async function getUserPets(userId: string) {
  const { data, error } = await supabase.from('pets').select('*').eq('user_id', userId);
  if (error) {
    notify.error('반려동물 정보를 불러오는데 실패했습니다.');
  }
  return (data as SupabasePet[]) || [];
}

export async function saveUserPet(petData: Partial<SupabasePet>) {
  const { data, error } = await supabase.from('pets').upsert(petData).select().single();
  if (error) {
    notify.error('반려동물 정보 저장에 실패했습니다.');
  } else {
    notify.success('프로필이 업데이트되었습니다.');
  }
  return data as SupabasePet;
}

/** 반려동물 삭제. RLS 로 본인 소유 행만 삭제된다(user_id 조건 병행). */
export async function deleteUserPet(petId: string, userId: string): Promise<boolean> {
  const { error } = await supabase.from('pets').delete().match({ id: petId, user_id: userId });
  if (error) {
    notify.error('반려동물 삭제에 실패했습니다.');
    return false;
  }
  return true;
}

// Products
export async function getProducts(): Promise<Product[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase.from('products').select(`
    *,
    product_ingredients (
      ingredients (*)
    )
  `);
  
  if (error) {
    console.error('getProducts error:', error.message);
    return [];
  }
  return (data as SupabaseProductRow[]).map(mapProductFromSupabaseRow);
}

export async function getProductDetail(productId: string): Promise<Product | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      product_ingredients (
        ingredient_id,
        ingredients (*)
      ),
      nutritional_profiles (*)
    `)
    .eq('id', productId)
    .single();

  if (error) {
    console.error('getProductDetail error:', error);
    return null;
  }
  return mapProductFromSupabaseRow(data as SupabaseProductRow);
}

/**
 * 바코드로 상품 1건 조회. DB에 `products.barcode` 컬럼이 있어야 매칭된다.
 * 컬럼이 없거나 조회 오류 시(신규 도입 전 단계) 조용히 null을 반환해
 * 호출부(스캐너)가 검색 폴백으로 이어가도록 한다.
 */
export async function getProductByBarcode(barcode: string): Promise<Product | null> {
  if (!isSupabaseConfigured || !barcode) return null;
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        product_ingredients (
          ingredient_id,
          ingredients (*)
        ),
        nutritional_profiles (*)
      `)
      .eq('barcode', barcode)
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return mapProductFromSupabaseRow(data as SupabaseProductRow);
  } catch {
    return null;
  }
}

/** 다이어트·체중 관련 태그( DB product_health_concerns 값과 맞추면 매칭됨 ) */
export const DIET_HEALTH_TAGS = ['비만', '다이어트', '체중', '저칼로리', '체중관리', '다이어트케어'] as const;

export async function searchProducts(
  query: string, 
  category?: string, 
  excludeIngredients: string[] = [],
  filters: {
    subCategory?: string;
    targetLifeStage?: string;
    formulation?: string;
    healthConcerns?: string[];
    /** true이면 다이어트 관련 태그들과 건강 고민을 합쳐 overlaps */
    dietPreset?: boolean;
    /** 빈 문자열이면 종 필터 없음. 강아지/고양이 선택 시 해당 종 + 공용(all) 포함 */
    targetPetType?: '' | 'dog' | 'cat' | 'all';
    /** 정확 일치 브랜드 필터 (products.brand_name) */
    brand?: string;
  } = {}
): Promise<Product[]> {
  if (!isSupabaseConfigured) return [];
  let builder = supabase.from('products').select(`
    *,
    product_ingredients (
      ingredient_id,
      ingredients (id, name_ko, risk_level)
    )
  `);
  
  if (query) {
    builder = builder.or(`name.ilike.%${query}%,brand_name.ilike.%${query}%`);
  }
  
  if (category && category !== '전체') {
    builder = builder.eq('main_category', category);
  }

  const pet = filters.targetPetType?.toLowerCase();
  if (pet === 'dog') {
    builder = builder.in('target_pet_type', ['dog', 'all']);
  } else if (pet === 'cat') {
    builder = builder.in('target_pet_type', ['cat', 'all']);
  } else if (pet === 'all') {
    builder = builder.eq('target_pet_type', 'all');
  }

  if (filters.subCategory) {
    builder = builder.eq('sub_category', filters.subCategory);
  }

  if (filters.targetLifeStage) {
    builder = builder.contains('target_life_stage', [filters.targetLifeStage]);
  }

  if (filters.formulation) {
    builder = builder.eq('formulation', filters.formulation);
  }

  if (filters.brand) {
    builder = builder.eq('brand_name', filters.brand);
  }

  let healthOverlap: string[] = [...(filters.healthConcerns || [])];
  if (filters.dietPreset) {
    healthOverlap = [...new Set([...healthOverlap, ...DIET_HEALTH_TAGS])];
  }
  if (healthOverlap.length > 0) {
    builder = builder.overlaps('product_health_concerns', healthOverlap);
  }

  const { data, error } = await builder;
  if (error) {
    console.error('searchProducts error:', error);
    return [];
  }

  let filtered: SupabaseProductRow[] = (data as SupabaseProductRow[]) || [];
  if (excludeIngredients.length > 0) {
    filtered = filtered.filter((p) => {
      const hasExcluded = p.product_ingredients?.some((pi) =>
        excludeIngredients.includes(pi.ingredients?.id ?? '') ||
        excludeIngredients.includes(pi.ingredients?.name_ko ?? '')
      );
      return !hasExcluded;
    });
  }

  return filtered.map(mapProductFromSupabaseRow);
}

// Ingredients
export async function getAllIngredients() {
  if (!isSupabaseConfigured) return [];
  const { data } = await supabase.from('ingredients').select('id, name_ko, risk_level').order('name_ko');
  return data || [];
}

// ─── Reviews ────────────────────────────────────────────────────────────────

export async function getReviews(productId: string) {
  const { data, error } = await supabase
    .from('reviews')
    .select('*, users(nickname)')
    .eq('product_id', productId)
    .order('created_at', { ascending: false });
  if (error) console.error('getReviews error:', error);
  return data || [];
}

export async function createReview(userId: string, productId: string, rating: number, content: string) {
  const { data, error } = await supabase
    .from('reviews')
    .insert({ user_id: userId, product_id: productId, rating, content })
    .select()
    .single();
  if (error) {
    notify.error('리뷰 등록에 실패했습니다.');
    return null;
  }
  notify.success('리뷰가 등록되었습니다!');
  return data;
}

export async function deleteReview(reviewId: string, userId: string) {
  const { error } = await supabase
    .from('reviews')
    .delete()
    .match({ id: reviewId, user_id: userId });
  if (error) notify.error('리뷰 삭제에 실패했습니다.');
  else notify.success('리뷰가 삭제되었습니다.');
}

// ─── Favorites ──────────────────────────────────────────────────────────────

export async function getFavorites(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('favorites')
    .select('product_id')
    .eq('user_id', userId);
  if (error) return [];
  return ((data ?? []) as SupabaseFavoriteRow[]).map((r) => r.product_id);
}

export async function addFavorite(userId: string, productId: string) {
  await supabase.from('favorites').upsert({ user_id: userId, product_id: productId });
}

export async function removeFavorite(userId: string, productId: string) {
  await supabase.from('favorites').delete().match({ user_id: userId, product_id: productId });
}

// ─── Recent Views ────────────────────────────────────────────────────────────

export async function addRecentView(userId: string, productId: string) {
  await supabase.from('recent_views').upsert(
    { user_id: userId, product_id: productId, viewed_at: new Date().toISOString() },
    { onConflict: 'user_id,product_id' }
  );
}

export async function getRecentViews(userId: string) {
  const { data, error } = await supabase
    .from('recent_views')
    .select(`product_id, viewed_at, products(*)`)
    .eq('user_id', userId)
    .order('viewed_at', { ascending: false })
    .limit(10);
  if (error) return [];
  const rows = (data ?? []) as unknown as SupabaseRecentViewRow[];
  return rows
    .map((r) => r.products)
    .filter((p): p is SupabaseProductRow => Boolean(p));
}

// ─── Brands ──────────────────────────────────────────────────────────────────

export async function getBrands(): Promise<string[]> {
  const { data, error } = await supabase
    .from('products')
    .select('brand_name')
    .order('brand_name');
  if (error) return [];
  const rows = (data ?? []) as SupabaseBrandNameRow[];
  const brands = [...new Set(rows.map((r) => r.brand_name).filter((name): name is string => Boolean(name)))];
  return brands;
}

export async function getProductsByBrand(brandName: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select(`*, product_ingredients(ingredients(*))`)
    .eq('brand_name', brandName);
  if (error) return [];
  return (data as SupabaseProductRow[]).map(mapProductFromSupabaseRow);
}

// ─── 식이 다이어리 (pet_feeding_logs) ────────────────────────────────────────
//
// 모든 함수는 로그인 세션의 auth.uid() 로 RLS 검증을 받는다. 클라이언트가 user_id
// 를 조작해도 서버(RLS)가 본인 데이터만 허용하므로 다른 사용자 기록에 접근할 수 없다.

const FEEDING_LOG_SELECT = `
  *,
  products (
    id,
    name,
    brand_name,
    image_url,
    product_type
  )
` as const;

/** 다이어리 제품 검색 — 유형(사료/간식/영양제) + 제품명/브랜드명. 기존 products DB 사용 */
export async function searchDiaryProducts(
  query: string,
  productType?: 'food' | 'snack' | 'supplement',
): Promise<Product[]> {
  if (!isSupabaseConfigured) return [];
  let builder = supabase
    .from('products')
    .select(`
      *,
      product_ingredients (
        ingredient_id,
        ingredients (id, name_ko, risk_level)
      )
    `)
    .limit(30);

  if (productType) {
    builder = builder.eq('product_type', productType);
  }
  const q = query.trim();
  if (q) {
    builder = builder.or(`name.ilike.%${q}%,brand_name.ilike.%${q}%`);
  }

  const { data, error } = await builder;
  if (error) {
    console.error('searchDiaryProducts error:', error.message);
    return [];
  }
  return (data as SupabaseProductRow[]).map(mapProductFromSupabaseRow);
}

/** 특정 반려동물의 특정 날짜 섭취 기록 목록 (시간 오름차순) */
export async function getFeedingLogsByDate(
  petId: string,
  date: string,
): Promise<PetFeedingLog[]> {
  if (!isSupabaseConfigured || !petId || !date) return [];
  const { data, error } = await supabase
    .from('pet_feeding_logs')
    .select(FEEDING_LOG_SELECT)
    .eq('pet_id', petId)
    .eq('feeding_date', date)
    .order('feeding_time', { ascending: true, nullsFirst: true })
    .order('created_at', { ascending: true });
  if (error) {
    console.error('getFeedingLogsByDate error:', error.message);
    return [];
  }
  return (data as SupabaseFeedingLogRow[]).map(mapFeedingLogFromRow);
}

/**
 * 특정 반려동물의 월간 기록 요약. 달력 점/아이콘 표기에 필요한 최소 필드만 조회.
 * @param month 1~12
 */
export async function getFeedingLogMonth(
  petId: string,
  year: number,
  month: number,
): Promise<{ feedingDate: string; productType: string }[]> {
  if (!isSupabaseConfigured || !petId) return [];
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  // 다음 달 1일 (미포함 상한)
  const endYear = month === 12 ? year + 1 : year;
  const endMonth = month === 12 ? 1 : month + 1;
  const end = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

  const { data, error } = await supabase
    .from('pet_feeding_logs')
    .select('feeding_date, product_type')
    .eq('pet_id', petId)
    .gte('feeding_date', start)
    .lt('feeding_date', end);
  if (error) {
    console.error('getFeedingLogMonth error:', error.message);
    return [];
  }
  return ((data ?? []) as { feeding_date: string; product_type: string | null }[]).map((r) => ({
    feedingDate: r.feeding_date,
    productType: r.product_type ?? 'food',
  }));
}

/** 월간 전체 기록(목록 보기용). 날짜 내림차순 → 시간 오름차순. @param month 1~12 */
export async function getFeedingLogsByMonthFull(
  petId: string,
  year: number,
  month: number,
): Promise<PetFeedingLog[]> {
  if (!isSupabaseConfigured || !petId) return [];
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const endYear = month === 12 ? year + 1 : year;
  const endMonth = month === 12 ? 1 : month + 1;
  const end = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

  const { data, error } = await supabase
    .from('pet_feeding_logs')
    .select(FEEDING_LOG_SELECT)
    .eq('pet_id', petId)
    .gte('feeding_date', start)
    .lt('feeding_date', end)
    .order('feeding_date', { ascending: false })
    .order('feeding_time', { ascending: true, nullsFirst: true });
  if (error) {
    console.error('getFeedingLogsByMonthFull error:', error.message);
    return [];
  }
  return (data as SupabaseFeedingLogRow[]).map(mapFeedingLogFromRow);
}

function toFeedingLogRowPayload(userId: string, input: FeedingLogInput) {
  return {
    user_id: userId,
    pet_id: input.petId,
    product_id: input.isCustomProduct ? null : input.productId,
    product_type: input.productType,
    custom_product_name: input.isCustomProduct ? input.customProductName : null,
    is_custom_product: input.isCustomProduct,
    feeding_date: input.feedingDate,
    feeding_time: input.feedingTime || null,
    meal_period: input.mealPeriod,
    amount: input.amount,
    unit: input.unit,
    memo: input.memo,
    preference_level: input.preferenceLevel,
    reaction_note: input.reactionNote,
    image_url: input.imageUrl,
  };
}

/** 섭취 기록 생성 */
export async function createFeedingLog(
  userId: string,
  input: FeedingLogInput,
): Promise<PetFeedingLog | null> {
  const { data, error } = await supabase
    .from('pet_feeding_logs')
    .insert(toFeedingLogRowPayload(userId, input))
    .select(FEEDING_LOG_SELECT)
    .single();
  if (error) {
    console.error('createFeedingLog error:', error.message);
    notify.error('섭취 기록 저장에 실패했습니다.');
    return null;
  }
  return mapFeedingLogFromRow(data as SupabaseFeedingLogRow);
}

/** 섭취 기록 수정 — 본인 기록만(RLS + user_id 조건) */
export async function updateFeedingLog(
  logId: string,
  userId: string,
  input: FeedingLogInput,
): Promise<PetFeedingLog | null> {
  const payload = toFeedingLogRowPayload(userId, input);
  const { data, error } = await supabase
    .from('pet_feeding_logs')
    .update(payload)
    .match({ id: logId, user_id: userId })
    .select(FEEDING_LOG_SELECT)
    .single();
  if (error) {
    console.error('updateFeedingLog error:', error.message);
    notify.error('섭취 기록 수정에 실패했습니다.');
    return null;
  }
  return mapFeedingLogFromRow(data as SupabaseFeedingLogRow);
}

/** 섭취 기록 삭제 — 본인 기록만 */
export async function deleteFeedingLog(logId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('pet_feeding_logs')
    .delete()
    .match({ id: logId, user_id: userId });
  if (error) {
    console.error('deleteFeedingLog error:', error.message);
    notify.error('섭취 기록 삭제에 실패했습니다.');
    return false;
  }
  return true;
}


