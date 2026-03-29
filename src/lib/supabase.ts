import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Auth
export async function initializeAnonymousSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) return session.user;

  // Sign up anonymously
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.error('Anonymous sign-in error:', error);
    return null;
  }
  return data.user;
}

export async function getCurrentUser() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user || null;
}

// User Profile
export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error && error.code !== 'PGRST116') {
    console.error('getUserProfile error:', error);
  }
  return data;
}

export async function getUserPets(userId: string) {
  const { data, error } = await supabase
    .from('pets')
    .select('*')
    .eq('user_id', userId);
  
  if (error) console.error('getUserPets error:', error);
  return data || [];
}

export async function saveUserPet(petData: any) {
  const { data, error } = await supabase
    .from('pets')
    .upsert(petData)
    .select()
    .single();
    
  if (error) console.error('saveUserPet error:', error);
  return data;
}

// Products
export async function getProducts() {
  const { data, error } = await supabase.from('products').select(`
    id,
    name,
    brand_name,
    product_type,
    image_url,
    avg_rating,
    review_count,
    min_price,
    product_ingredients (
      ingredients (
        id,
        name_ko,
        name_en,
        risk_level,
        description,
        caution_conditions,
        allergy_triggers
      )
    )
  `);
  
  if (error) {
    console.error('getProducts error:', error.message);
    return [];
  }
  
  return data.map((p: any) => ({
    id: p.id,
    brand: p.brand_name,
    name: p.name,
    category: p.product_type,
    price: p.min_price || 0,
    imageUrl: p.image_url || 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400&q=80',
    ingredients: p.product_ingredients?.map((pi: any) => ({
      id: pi.ingredients.id,
      nameKo: pi.ingredients.name_ko,
      nameEn: pi.ingredients.name_en,
      riskLevel: pi.ingredients.risk_level,
      purpose: pi.ingredients.description || '' // Using description as purpose for now
    })) || [],
    reviewsCount: p.review_count || 0,
    averageRating: p.avg_rating || 0
  }));
}

// Cart Items
export async function fetchCartItems(userId: string) {
  const { data, error } = await supabase
    .from('cart_items')
    .select(`
      id,
      product_id,
      quantity,
      products (
         id, name, min_price, image_url
      )
    `)
    .eq('user_id', userId);
    
  if (error) {
    console.error('fetchCartItems error:', error);
    return [];
  }
  return data.map((item: any) => ({
    productId: item.product_id,
    quantity: item.quantity,
    cartItemId: item.id
  }));
}

export async function saveCartItem(userId: string, productId: string, quantity: number) {
  const { error } = await supabase
    .from('cart_items')
    .upsert({ user_id: userId, product_id: productId, quantity }, { onConflict: 'user_id,product_id' });
    
  if (error) console.error('saveCartItem error:', error);
}

export async function removeCartItemFromDB(userId: string, productId: string) {
  const { error } = await supabase
    .from('cart_items')
    .delete()
    .match({ user_id: userId, product_id: productId });
    
  if (error) console.error('removeCartItem error:', error);
}

export async function clearUserCart(userId: string) {
  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('user_id', userId);
    
  if (error) console.error('clearUserCart error:', error);
}

// Real Order submission for Toss Payments
export async function createOrder(userId: string, cartItems: any[], totalAmount: number, address: string, customerInfo: any) {
  const orderIdExt = `ORDER_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({ 
      user_id: userId, 
      status: 'completed', 
      total_amount: totalAmount, 
      shipping_address: address,
      customer_name: customerInfo.name,
      customer_email: customerInfo.email,
      customer_phone: customerInfo.phone,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (orderError || !order) {
    console.error('createOrder error:', orderError);
    return null;
  }

  // Resolve product details if not present
  const resolvedItems = [];
  for (const item of cartItems) {
    let name = item.name;
    let price = item.price;
    
    if (!name || !price) {
      const { data: prod } = await supabase.from('products').select('name, min_price').eq('id', item.productId).single();
      if (prod) {
        name = prod.name;
        price = prod.min_price;
      }
    }
    
    resolvedItems.push({
      order_id: order.id,
      product_id: item.productId,
      quantity: item.quantity,
      price_at_purchase: price || 0
    });
  }

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(resolvedItems);

  if (itemsError) console.error('insert order items error:', itemsError);

  return { ...order, orderIdExt };
}

// Results for single product with ingredients
export async function getProductDetail(productId: string) {
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

  return {
    ...data,
    ingredients: (data as any).product_ingredients?.map((pi: any) => pi.ingredients) || []
  };
}

export async function searchProducts(query: string, category?: string, excludeIngredients: string[] = []) {
  let builder = supabase.from('products').select(`
    *,
    product_ingredients (
      ingredient_id,
      ingredients (id, name_ko)
    )
  `);
  
  if (query) {
    builder = builder.ilike('name', `%${query}%`);
  }
  
  if (category && category !== '전체') {
    builder = builder.eq('product_type', category);
  }

  const { data, error } = await builder;
  if (error) {
    console.error('searchProducts error:', error);
    return [];
  }

  // Filter by excluded ingredients on client side for now to handle complex relations
  let filtered = data || [];
  if (excludeIngredients.length > 0) {
    filtered = filtered.filter((p: any) => {
      const hasExcluded = p.product_ingredients?.some((pi: any) => 
        excludeIngredients.includes(pi.ingredients?.id) || excludeIngredients.includes(pi.ingredients?.name_ko)
      );
      return !hasExcluded;
    });
  }

  return filtered.map((p: any) => ({
    id: p.id,
    brand: p.brand_name,
    name: p.name,
    category: p.product_type,
    price: p.min_price || 0,
    imageUrl: p.image_url || 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400&q=80',
    ingredients: p.product_ingredients?.map((pi: any) => ({
      id: pi.ingredients.id,
      nameKo: pi.ingredients.name_ko,
      riskLevel: pi.ingredients.risk_level
    })) || [],
    reviewsCount: p.review_count || 0,
    averageRating: p.avg_rating || 0
  }));
}

export async function getAllIngredients() {
  const { data, error } = await supabase
    .from('ingredients')
    .select('id, name_ko, risk_level')
    .order('name_ko');
    
  if (error) {
    console.error('getAllIngredients error:', error);
    return [];
  }
  return data;
}
