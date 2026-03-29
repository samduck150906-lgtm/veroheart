import { createClient } from '@supabase/supabase-js';
import { notify } from '../store/useNotification';
import type { Product } from '../data/mock';
import type { SupabasePet } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Auth, User functions (Omitted for brevity, but I will keep them same as before)
// ... keeping them all for a complete file rewrite ...

export async function initializeAnonymousSession() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) return session.user;
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      notify.error('익명 로그인에 실패했습니다. 다시 시도해주세요.');
      return null;
    }
    return data.user;
  } catch (err) {
    notify.error('서버 연결 중 오류가 발생했습니다.');
    return null;
  }
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
  return (data as any[]).map(mapProduct);
}

export async function getProductDetail(productId: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      product_ingredients (
        ingredient_id,
        ingredients (*)
      )
    `)
    .eq('id', productId)
    .single();

  if (error) {
    console.error('getProductDetail error:', error);
    return null;
  }
  return mapProduct(data);
}

export async function searchProducts(
  query: string, 
  category?: string, 
  excludeIngredients: string[] = [],
  filters: {
    subCategory?: string;
    targetLifeStage?: string;
    formulation?: string;
    healthConcerns?: string[];
    targetPetType?: 'dog' | 'cat' | 'all';
  } = {}
): Promise<Product[]> {
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

  if (filters.targetPetType) {
    builder = builder.eq('target_pet_type', filters.targetPetType.toLowerCase());
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

  if (filters.healthConcerns && filters.healthConcerns.length > 0) {
    builder = builder.overlaps('product_health_concerns', filters.healthConcerns);
  }

  const { data, error } = await builder;
  if (error) {
    console.error('searchProducts error:', error);
    return [];
  }

  let filtered = data || [];
  if (excludeIngredients.length > 0) {
    filtered = filtered.filter((p: any) => {
      const hasExcluded = p.product_ingredients?.some((pi: any) => 
        excludeIngredients.includes(pi.ingredients?.id) || excludeIngredients.includes(pi.ingredients?.name_ko)
      );
      return !hasExcluded;
    });
  }

  return filtered.map(mapProduct);
}

// Ingredients, Cart, Orders (same logic)
export async function getAllIngredients() {
  const { data } = await supabase.from('ingredients').select('id, name_ko, risk_level').order('name_ko');
  return data || [];
}

export async function fetchCartItems(userId: string) {
  const { data } = await supabase.from('cart_items').select('id, product_id, quantity').eq('user_id', userId);
  return (data || []).map((item: any) => ({
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

export async function createOrder(userId: string, cartItems: any[], totalAmount: number, address: string, customerInfo: any) {
  const orderIdExt = `ORDER_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const { data: order, error } = await supabase.from('orders').insert({ 
    user_id: userId, status: 'pending', total_amount: totalAmount, shipping_address: address,
    customer_name: customerInfo.name, customer_email: customerInfo.email, customer_phone: customerInfo.phone,
    order_id_ext: orderIdExt
  }).select().single();

  if (error || !order) return null;

  const resolvedItems = [];
  for (const item of cartItems) {
    const { data: prod } = await supabase.from('products').select('min_price').eq('id', item.productId).single();
    resolvedItems.push({
      order_id: order.id, product_id: item.productId, quantity: item.quantity,
      price_at_purchase: item.price || prod?.min_price || 0
    });
  }
  await supabase.from('order_items').insert(resolvedItems);
  return { ...order, orderIdExt };
}

export async function getOrders(userId: string) {
  const { data } = await supabase.from('orders').select(`*, order_items (*, products (*))`).eq('user_id', userId).order('created_at', { ascending: false });
  return data || [];
}

export async function saveAnalysisReport(userId: string, productId: string | null, rawText: string, analysisJson: any) {
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
