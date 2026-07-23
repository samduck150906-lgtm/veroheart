import type {
  FeedingProductType,
  Ingredient,
  MealPeriod,
  PetFeedingLog,
  Product,
  SupabasePet,
  UserPetProfile,
} from '../types';

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
  barcode?: string | null;
  image_url?: string | null;
  review_count?: number | null;
  avg_rating?: number | null;
  kcal_per_100g?: number | string | null;
  product_ingredients?: SupabaseProductIngredientRow[] | null;
  /** 1:1 관계 — PostgREST가 배열 또는 단일 객체로 반환할 수 있어 둘 다 허용 */
  nutritional_profiles?: SupabaseNutritionalProfileRow | SupabaseNutritionalProfileRow[] | null;
};

export type SupabaseNutritionalProfileRow = {
  crude_protein?: number | string | null;
  crude_fat?: number | string | null;
  crude_fiber?: number | string | null;
  crude_ash?: number | string | null;
  moisture?: number | string | null;
  calcium?: number | string | null;
  phosphorus?: number | string | null;
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

/** numeric(문자열/숫자/널) → number | undefined */
function toNum(v: number | string | null | undefined): number | undefined {
  if (v === null || v === undefined || v === '') return undefined;
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : undefined;
}

// ─── Pets (다이어리·프로필 공용 매핑) ─────────────────────────────────────────

/** age_group enum → 대표 나이 숫자 (프로필 UI 호환) */
export function ageFromAgeGroup(group: SupabasePet['age_group']): number {
  if (group === 'baby') return 1;
  if (group === 'senior') return 10;
  return 4;
}

/** 나이 숫자 → age_group enum (저장용) */
export function ageGroupFromAge(age: number): SupabasePet['age_group'] {
  if (age < 2) return 'baby';
  if (age > 7) return 'senior';
  return 'adult';
}

/** SupabasePet 행 → 앱 UserPetProfile (weight/breed/image 포함) */
export function mapPetProfileFromRow(p: SupabasePet): UserPetProfile {
  const weight = toNum(p.weight ?? undefined);
  return {
    id: p.id,
    name: p.name,
    species: p.pet_type === 'cat' ? 'Cat' : 'Dog',
    age: ageFromAgeGroup(p.age_group),
    weightKg: weight,
    breed: p.breed ?? undefined,
    imageUrl: p.image_url ?? undefined,
    healthConcerns: p.conditions ?? [],
    allergies: p.allergies ?? [],
  };
}

// ─── Feeding logs (식이 다이어리) ─────────────────────────────────────────────

export type SupabaseFeedingLogRow = {
  id: string;
  user_id: string;
  pet_id: string;
  product_id: string | null;
  product_type: string | null;
  custom_product_name: string | null;
  is_custom_product: boolean | null;
  feeding_date: string;
  feeding_time: string | null;
  meal_period: string | null;
  amount: number | string | null;
  unit: string | null;
  memo: string | null;
  preference_level: number | null;
  reaction_note: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  products?: {
    id: string;
    name: string | null;
    brand_name: string | null;
    image_url: string | null;
    product_type: string | null;
    kcal_per_100g?: number | string | null;
  } | null;
};

const FEEDING_PRODUCT_TYPES: FeedingProductType[] = ['food', 'snack', 'supplement', 'custom'];
const MEAL_PERIODS: MealPeriod[] = ['morning', 'lunch', 'dinner', 'snack', 'other'];

/** feeding_time 이 'HH:MM:SS' 로 오면 'HH:MM' 로 다듬는다 */
function normalizeTime(t: string | null): string | null {
  if (!t) return null;
  const m = /^(\d{2}:\d{2})/.exec(t);
  return m ? m[1] : t;
}

export function mapFeedingLogFromRow(row: SupabaseFeedingLogRow): PetFeedingLog {
  const ptype = FEEDING_PRODUCT_TYPES.includes(row.product_type as FeedingProductType)
    ? (row.product_type as FeedingProductType)
    : 'food';
  const meal = MEAL_PERIODS.includes(row.meal_period as MealPeriod)
    ? (row.meal_period as MealPeriod)
    : null;
  const product = row.products
    ? {
        id: row.products.id,
        name: row.products.name ?? '',
        brand: row.products.brand_name ?? '',
        imageUrl:
          row.products.image_url ||
          'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400&q=80',
        productType: row.products.product_type ?? 'food',
        caloriesPer100g: toNum(row.products.kcal_per_100g) ?? null,
      }
    : null;
  return {
    id: row.id,
    userId: row.user_id,
    petId: row.pet_id,
    productId: row.product_id,
    productType: ptype,
    customProductName: row.custom_product_name,
    isCustomProduct: Boolean(row.is_custom_product),
    feedingDate: row.feeding_date,
    feedingTime: normalizeTime(row.feeding_time),
    mealPeriod: meal,
    amount: toNum(row.amount) ?? null,
    unit: row.unit,
    memo: row.memo,
    preferenceLevel: row.preference_level ?? null,
    reactionNote: row.reaction_note,
    imageUrl: row.image_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    product,
  };
}

export function mapProductFromSupabaseRow(p: SupabaseProductRow): Product {
  const ingredients: Ingredient[] =
    p.product_ingredients?.map((pi) => mapIngredientFromJoin(pi)) ?? [];
  const np = Array.isArray(p.nutritional_profiles) ? p.nutritional_profiles[0] : p.nutritional_profiles;
  const guaranteedAnalysis = np
    ? {
        crudeProtein: toNum(np.crude_protein),
        crudeFat: toNum(np.crude_fat),
        crudeFiber: toNum(np.crude_fiber),
        crudeAsh: toNum(np.crude_ash),
        moisture: toNum(np.moisture),
        calcium: toNum(np.calcium),
        phosphorus: toNum(np.phosphorus),
      }
    : undefined;
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
    barcode: p.barcode ?? undefined,
    guaranteedAnalysis,
    caloriesPer100g: toNum(p.kcal_per_100g),
    imageUrl:
      p.image_url ||
      'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400&q=80',
    ingredients,
    reviewsCount: p.review_count ?? 0,
    averageRating: p.avg_rating ?? 0,
  };
}
