import type { Ingredient, Product } from '../types';

/** `products` + nested joins from Supabase select */
export type SupabaseProductRow = {
  id: string;
  brand_name: string;
  manufacturer_name?: string | null;
  name: string;
  product_type: string;
  main_category?: string | null;
  sub_category?: string | null;
  target_pet_type?: string | null;
  target_life_stage?: string[] | null;
  formulation?: string | null;
  product_health_concerns?: string[] | null;
  has_risk_factors?: string[] | null;
  verification_status?: string | null;
  verified_at?: string | null;
  coupang_product_id?: string | null;
  min_price?: number | null;
  image_url?: string | null;
  review_count?: number | null;
  avg_rating?: number | null;
  product_ingredients?: SupabaseProductIngredientRow[] | null;
};

export type SupabaseProductIngredientRow = {
  ingredient_id?: string;
  ingredients?: {
    id: string;
    name_ko?: string | null;
    name_en?: string | null;
    risk_level?: string | null;
    description?: string | null;
  } | null;
};

export type SupabaseCartItemRow = {
  product_id: string;
  quantity: number;
  id: string;
};

export type CreateOrderCartLine = {
  productId: string;
  quantity: number;
  price?: number;
};

export type CreateOrderCustomerInfo = {
  name: string;
  email: string;
  phone: string;
};

export type SupabaseFavoriteRow = { product_id: string };

export type SupabaseRecentViewRow = { products: SupabaseProductRow | null };

export type SupabaseBrandNameRow = { brand_name: string | null };

export function mapIngredientFromJoin(pi: SupabaseProductIngredientRow): Ingredient {
  const ing = pi.ingredients;
  const risk = ing?.risk_level;
  let riskLevel: Ingredient['riskLevel'] = 'safe';
  if (risk === 'danger') riskLevel = 'danger';
  else if (risk === 'caution' || risk === 'warning') riskLevel = 'caution';
  else if (risk === 'safe') riskLevel = 'safe';
  return {
    id: ing?.id ?? pi.ingredient_id ?? '',
    nameKo: ing?.name_ko ?? '',
    nameEn: ing?.name_en ?? '',
    riskLevel,
    purpose: ing?.description ?? '',
  };
}

export function mapProductFromSupabaseRow(p: SupabaseProductRow): Product {
  const ingredients: Ingredient[] =
    p.product_ingredients?.map((pi) => mapIngredientFromJoin(pi)) ?? [];
  const targetPet = p.target_pet_type;
  const targetPetType: Product['targetPetType'] =
    targetPet === 'dog' || targetPet === 'cat' || targetPet === 'all' ? targetPet : undefined;
  const verificationStatus = p.verification_status;
  const vs: Product['verificationStatus'] =
    verificationStatus === 'verified' || verificationStatus === 'needs_review' || verificationStatus === 'pending'
      ? verificationStatus
      : 'pending';
  return {
    id: p.id,
    brand: p.brand_name,
    manufacturerName: p.manufacturer_name || undefined,
    name: p.name,
    category: p.product_type,
    mainCategory: p.main_category ?? undefined,
    subCategory: p.sub_category ?? undefined,
    targetPetType,
    targetLifeStage: p.target_life_stage ?? undefined,
    formulation: p.formulation ?? undefined,
    healthConcerns: p.product_health_concerns ?? undefined,
    hasRiskFactors: p.has_risk_factors ?? undefined,
    verificationStatus: vs,
    verifiedAt: p.verified_at || undefined,
    coupangProductId: p.coupang_product_id || undefined,
    price: p.min_price ?? 0,
    imageUrl:
      p.image_url ||
      'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400&q=80',
    ingredients,
    reviewsCount: p.review_count ?? 0,
    averageRating: p.avg_rating ?? 0,
  };
}
