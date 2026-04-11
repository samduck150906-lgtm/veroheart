export interface UserPetProfile {
  id: string;
  name: string;
  species: 'Dog' | 'Cat';
  age: number;
  /** kg, 선택 — DB 미연동 시에도 폼에만 반영 가능 */
  weightKg?: number;
  healthConcerns: string[];
  allergies: string[];
}

export interface Ingredient {
  id: string;
  nameKo: string;
  nameEn: string;
  purpose: string;
  riskLevel: 'safe' | 'caution' | 'danger';
}

export interface Product {
  id: string;
  brand: string;
  manufacturerName?: string;
  name: string;
  category: string;
  mainCategory?: string;
  subCategory?: string;
  targetPetType?: 'dog' | 'cat' | 'all';
  targetLifeStage?: string[];
  formulation?: string;
  healthConcerns?: string[];
  hasRiskFactors?: string[];
  price: number;
  imageUrl: string;
  ingredients: Ingredient[];
  reviewsCount: number;
  averageRating: number;
  verificationStatus?: 'pending' | 'verified' | 'needs_review';
  verifiedAt?: string | null;
  coupangProductId?: string | null;
}

export const DEFAULT_USER_PET_PROFILE: UserPetProfile = {
  id: 'local-profile',
  name: '우리 아이',
  species: 'Dog',
  age: 4,
  healthConcerns: [],
  allergies: [],
};

export interface SupabaseProduct {
  id: string;
  name: string;
  brand_name: string;
  manufacturer_name?: string | null;
  product_type: string;
  image_url: string | null;
  avg_rating: number;
  review_count: number;
  min_price: number | null;
  verification_status?: 'pending' | 'verified' | 'needs_review' | null;
  verified_at?: string | null;
  coupang_product_id?: string | null;
  product_ingredients?: {
    ingredients: SupabaseIngredient;
  }[];
}

export interface SupabaseIngredient {
  id: string;
  name_ko: string;
  name_en: string | null;
  risk_level: 'safe' | 'warning' | 'danger';
  description: string | null;
  caution_conditions: string[] | null;
  allergy_triggers: string[] | null;
}

export interface SupabasePet {
  id: string;
  user_id: string;
  name: string;
  pet_type: 'dog' | 'cat';
  age_group: 'baby' | 'adult' | 'senior';
  conditions: string[] | null;
  allergies: string[] | null;
  created_at: string;
}

export interface SupabaseCartItem {
  id: string;
  product_id: string;
  quantity: number;
  products: {
    id: string;
    name: string;
    min_price: number | null;
    image_url: string | null;
  };
}

export interface SupabaseOrder {
  id: string;
  user_id: string;
  status: 'pending' | 'paid' | 'completed' | 'cancelled' | 'failed';
  total_amount: number;
  shipping_address: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  payment_key?: string;
  paid_at?: string;
  created_at: string;
}

export interface SupabaseOrderItem {
  id: string;
  product_id: string;
  quantity: number;
  price_at_purchase: number;
  products: {
    brand_name: string;
    name: string;
    image_url: string | null;
  };
}

export type SupabaseOrderWithItems = SupabaseOrder & {
  order_items: SupabaseOrderItem[];
};

/** `analysis_reports` + join `products` (getAnalysisReports select) */
export type AnalysisReportRow = {
  id: string;
  created_at: string;
  product_id: string | null;
  analysis_json: {
    scores?: { final?: number };
    summary?: string;
  };
  products?: {
    image_url: string | null;
    name: string;
    brand_name: string;
  } | null;
};
