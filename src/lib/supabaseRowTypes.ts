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
  coupang_link?: string | null;
  min_price?: number | null;
  image_url?: string | null;
  review_count?: number | null;
  avg_rating?: number | null;
  product_ingredients?: SupabaseProductIngredientRow[] | null;
  nutritional_profiles?: SupabaseNutritionalProfileRow[] | null;
};

export type SupabaseNutritionalProfileRow = {
  crude_protein?: number | null;
  crude_fat?: number | null;
  crude_fiber?: number | null;
  crude_ash?: number | null;
  moisture?: number | null;
  calcium?: number | null;
  phosphorus?: number | null;
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

/** nutritional_profiles 행(있으면 첫 건)을 GuaranteedAnalysis로 변환. 값이 하나도 없으면 undefined. */
export function mapGuaranteedAnalysis(
  rows?: SupabaseNutritionalProfileRow[] | null,
): Product['guaranteedAnalysis'] {
  const np = rows?.[0];
  if (!np) return undefined;
  const ga = {
    crudeProtein: np.crude_protein ?? undefined,
    crudeFat: np.crude_fat ?? undefined,
    crudeFiber: np.crude_fiber ?? undefined,
    crudeAsh: np.crude_ash ?? undefined,
    moisture: np.moisture ?? undefined,
    calcium: np.calcium ?? undefined,
    phosphorus: np.phosphorus ?? undefined,
  };
  return Object.values(ga).some((v) => v != null) ? ga : undefined;
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
    coupangLink: p.coupang_link?.trim() || undefined,
    price: p.min_price ?? 0,
    imageUrl:
      p.image_url ||
      'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400&q=80',
    ingredients,
    guaranteedAnalysis: mapGuaranteedAnalysis(p.nutritional_profiles),
    reviewsCount: p.review_count ?? 0,
    averageRating: p.avg_rating ?? 0,
  };
}
