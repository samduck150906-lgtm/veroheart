import { createClient } from '@supabase/supabase-js';
import { notify } from '../store/useNotification';
import type { Product } from '../types';
import type { SupabasePet } from '../types';
import {
  mapProductFromSupabaseRow,
  type SupabaseBrandNameRow,
  type SupabaseCartItemRow,
  type SupabaseFavoriteRow,
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

export async function ensurePublicUserExists(userId: string, email: string) {
  try {
    const { data, error: selectErr } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (selectErr || !data) {
      const nickname = email.split('@')[0] || '베로';
      await supabase.from('users').upsert({
        id: userId,
        nickname: nickname,
        avatar_url: ''
      }, { onConflict: 'id' });
      console.log('Defensively upserted user into public.users:', userId);
    }
  } catch (err) {
    console.error('ensurePublicUserExists failed defensively:', err);
  }
}

export async function signUpWithEmail(email: string, password: string) {
  try {
    // Call our secure server-side admin-auth Edge Function
    const functionUrl = `${supabaseUrl}/functions/v1/admin-auth`;
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(supabaseKey ? { 'Authorization': `Bearer ${supabaseKey}` } : {})
      },
      body: JSON.stringify({
        action: 'signup',
        email,
        password
      }),
    });

    if (response.ok) {
      const result = await response.json();
      if (result.user) {
        await ensurePublicUserExists(result.user.id, email);
        return result.user;
      }
    } else {
      const errRes = await response.json().catch(() => ({}));
      console.warn('Edge signup failed:', errRes.error);
    }
  } catch (err) {
    console.warn('Edge signup failed, falling back to standard signup:', err);
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  if (error) {
    notify.error(error.message);
    return null;
  }
  if (data.user) {
    await ensurePublicUserExists(data.user.id, email);
  }
  return data.user;
}

export async function signInWithEmail(email: string, password: string) {
  let { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error && error.message.toLowerCase().includes('email not confirmed')) {
    try {
      // Call our secure server-side admin-auth Edge Function to confirm the email
      const functionUrl = `${supabaseUrl}/functions/v1/admin-auth`;
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(supabaseKey ? { 'Authorization': `Bearer ${supabaseKey}` } : {})
        },
        body: JSON.stringify({
          action: 'confirm',
          email
        }),
      });

      if (response.ok) {
        console.log('Successfully auto-confirmed email via Edge Function for user:', email);
        const retryResult = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        data = retryResult.data;
        error = retryResult.error;
      } else {
        const errRes = await response.json().catch(() => ({}));
        console.warn('Edge email confirmation failed:', errRes.error);
      }
    } catch (adminErr) {
      console.error('Failed to auto-confirm user email via Edge Function:', adminErr);
    }
  }

  if (error) {
    notify.error('로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.');
    return null;
  }
  if (data.user) {
    await ensurePublicUserExists(data.user.id, email);
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

// Products
function mapProduct(p: any): Product {
  return {
    id: p.id,
    brand: p.brand_name,
    name: p.name,
    category: p.product_type,
    mainCategory: p.main_category,
    subCategory: p.sub_category,
    targetPetType: p.target_pet_type as any,
    targetLifeStage: p.target_life_stage,
    formulation: p.formulation,
    healthConcerns: p.product_health_concerns,
    hasRiskFactors: p.has_risk_factors,
    price: p.min_price || 0,
    imageUrl: p.image_url || 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400&q=80',
    // productUrl: p.product_url,
    // source: p.source,
    ingredients: p.product_ingredients?.map((pi: any) => ({
      id: pi.ingredients?.id || '',
      nameKo: pi.ingredients?.name_ko || '',
      nameEn: pi.ingredients?.name_en || '',
      riskLevel: pi.ingredients?.risk_level || 'safe',
      purpose: pi.ingredients?.description || ''
    })) || [],
    reviewsCount: p.review_count || 0,
    averageRating: p.avg_rating || 0
  };
}

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
      nutritional_profiles (
        crude_protein, crude_fat, crude_fiber, crude_ash, moisture, calcium, phosphorus
      )
    `)
    .eq('id', productId)
    .single();

  if (error) {
    console.error('getProductDetail error:', error);
    return null;
  }
  return mapProductFromSupabaseRow(data as SupabaseProductRow);
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
    priceMin?: number;
    priceMax?: number;
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

  let healthOverlap: string[] = [...(filters.healthConcerns || [])];
  if (filters.dietPreset) {
    healthOverlap = [...new Set([...healthOverlap, ...DIET_HEALTH_TAGS])];
  }
  if (healthOverlap.length > 0) {
    builder = builder.overlaps('product_health_concerns', healthOverlap);
  }

  if (filters.priceMin != null && filters.priceMin > 0) {
    builder = builder.gte('min_price', filters.priceMin);
  }
  if (filters.priceMax != null && filters.priceMax > 0) {
    builder = builder.lte('min_price', filters.priceMax);
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

// Ingredients, Cart, Orders (same logic)
export async function getAllIngredients() {
  if (!isSupabaseConfigured) return [];
  const { data } = await supabase.from('ingredients').select('id, name_ko, risk_level').order('name_ko');
  return data || [];
}

export async function fetchCartItems(userId: string) {
  const { data } = await supabase.from('cart_items').select('id, product_id, quantity').eq('user_id', userId);
  const rows = (data ?? []) as SupabaseCartItemRow[];
  return rows.map((item) => ({
    productId: item.product_id,
    quantity: item.quantity,
    cartItemId: item.id
  }));
}

export async function saveCartItem(userId: string, productId: string, quantity: number) {
  await supabase.from('cart_items').upsert({ user_id: userId, product_id: productId, quantity }, { onConflict: 'user_id,product_id' });
}

export async function removeCartItemFromDB(userId: string, productId: string) {
  await supabase.from('cart_items').delete().match({ user_id: userId, product_id: productId });
}

export async function clearUserCart(userId: string) {
  await supabase.from('cart_items').delete().eq('user_id', userId);
}

export async function getOrders(userId: string) {
  const { data } = await supabase.from('orders').select(`*, order_items (*, products (*))`).eq('user_id', userId).order('created_at', { ascending: false });
  return data || [];
}

export async function saveAnalysisReport(
  userId: string,
  productId: string | null,
  rawText: string,
  analysisJson: object
) {
  const { data, error } = await supabase.from('analysis_reports').insert({
    user_id: userId,
    product_id: productId,
    raw_text: rawText,
    analysis_json: analysisJson
  }).select().single();
  
  if (error) {
    console.error('Failed to save analysis report:', error);
    return null;
  }
  return data;
}

export async function getAnalysisReports(userId: string) {
  const { data, error } = await supabase
    .from('analysis_reports')
    .select(`
      *,
      products (name, brand_name, image_url)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch analysis reports:', error);
    return [];
  }
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

// ─── Banners ──────────────────────────────────────────────────────────────────

export async function getBanners(): Promise<any[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('banners')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) {
      console.warn('banners table query failed or not found, falling back');
      return [];
    }
    return data || [];
  } catch (err) {
    return [];
  }
}

export async function saveBanner(banner: any) {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from('banners')
    .upsert(banner)
    .select()
    .single();
  if (error) {
    console.error('saveBanner error:', error);
    return null;
  }
  return data;
}

export async function deleteBannerFromDB(bannerId: string) {
  if (!isSupabaseConfigured) return;
  await supabase.from('banners').delete().eq('id', bannerId);
}




// ─── 분석 엔진 관리자 (규칙 / 미매칭 원료 검수) ───────────────────────

export interface AnalysisRuleRow {
  id: string;
  target: string;
  species: string | null;
  condition: Record<string, unknown>;
  severity: string;
  score_delta: number;
  title: string;
  message_template: string;
  evidence_level: string;
  is_active: boolean;
}

export async function getAnalysisRules(): Promise<AnalysisRuleRow[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('analysis_rules')
    .select('*')
    .order('severity', { ascending: true })
    .order('score_delta', { ascending: true });
  if (error) {
    console.error('getAnalysisRules error:', error);
    return [];
  }
  return (data || []) as AnalysisRuleRow[];
}

export async function setAnalysisRuleActive(id: string, isActive: boolean) {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase
    .from('analysis_rules')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) console.error('setAnalysisRuleActive error:', error);
}

export interface UnmatchedIngredientRow {
  id: string;
  normalized_name: string;
  raw_name: string;
  occurrences: number;
  status: 'pending' | 'resolved' | 'ignored';
  last_seen_at: string;
}

export async function getUnmatchedIngredients(): Promise<UnmatchedIngredientRow[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('unmatched_ingredients')
    .select('*')
    .order('occurrences', { ascending: false })
    .limit(300);
  if (error) {
    console.error('getUnmatchedIngredients error:', error);
    return [];
  }
  return (data || []) as UnmatchedIngredientRow[];
}

export async function setUnmatchedStatus(
  id: string,
  status: 'pending' | 'resolved' | 'ignored',
) {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase
    .from('unmatched_ingredients')
    .update({ status })
    .eq('id', id);
  if (error) console.error('setUnmatchedStatus error:', error);
}

/** 미매칭 원료를 검수 큐에 기록(있으면 카운트 증가). 분석 중 발견 시 호출. */
export async function logUnmatchedIngredients(rawNames: string[]) {
  if (!isSupabaseConfigured || rawNames.length === 0) return;
  await Promise.all(
    rawNames.map((raw) =>
      supabase.rpc('log_unmatched_ingredient', { p_raw: raw }).then(({ error }) => {
        if (error) console.error('logUnmatchedIngredient error:', error);
      }),
    ),
  );
}

// ─── Community Posts ──────────────────────────────────────────────────────────

export interface CommunityPostRow {
  id: string;
  user_id: string;
  category: string;
  title: string;
  content: string;
  tags: string[];
  likes_count: number;
  comments_count: number;
  created_at: string;
  users?: { nickname?: string | null };
  has_liked?: boolean;
}

export async function getCommunityPosts(category?: string, userId?: string): Promise<CommunityPostRow[]> {
  if (!isSupabaseConfigured) return [];
  let builder = supabase
    .from('community_posts')
    .select('*, users(nickname)')
    .order('created_at', { ascending: false })
    .limit(50);

  if (category && category !== '전체') {
    builder = builder.eq('category', category);
  }

  const { data, error } = await builder;
  if (error) {
    console.error('getCommunityPosts error:', error);
    return [];
  }

  const posts = (data || []) as CommunityPostRow[];

  if (userId && posts.length > 0) {
    const postIds = posts.map(p => p.id);
    const { data: likedData } = await supabase
      .from('community_post_likes')
      .select('post_id')
      .eq('user_id', userId)
      .in('post_id', postIds);
    const likedSet = new Set((likedData || []).map((l: any) => l.post_id as string));
    return posts.map(p => ({ ...p, has_liked: likedSet.has(p.id) }));
  }

  return posts;
}

export async function createCommunityPost(
  userId: string,
  category: string,
  title: string,
  content: string,
  tags: string[] = [],
): Promise<CommunityPostRow | null> {
  const { data, error } = await supabase
    .from('community_posts')
    .insert({ user_id: userId, category, title, content, tags })
    .select('*, users(nickname)')
    .single();
  if (error) {
    notify.error('글 등록에 실패했습니다.');
    return null;
  }
  notify.success('글이 등록되었습니다!');
  return data as CommunityPostRow;
}

export async function toggleCommunityPostLike(
  userId: string,
  postId: string,
  hasLiked: boolean,
): Promise<boolean> {
  if (hasLiked) {
    const { error } = await supabase
      .from('community_post_likes')
      .delete()
      .match({ user_id: userId, post_id: postId });
    return error ? hasLiked : false;
  } else {
    const { error } = await supabase
      .from('community_post_likes')
      .insert({ user_id: userId, post_id: postId });
    return error ? hasLiked : true;
  }
}

export async function deleteCommunityPost(userId: string, postId: string): Promise<boolean> {
  const { error } = await supabase
    .from('community_posts')
    .delete()
    .match({ id: postId, user_id: userId });
  if (error) {
    notify.error('글 삭제에 실패했습니다.');
    return false;
  }
  notify.success('글이 삭제되었습니다.');
  return true;
}
