export interface UserPetProfile {
  id: string;
  name: string;
  species: 'Dog' | 'Cat';
  age: number;
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
  product_type: string;
  image_url: string | null;
  avg_rating: number;
  review_count: number;
  min_price: number | null;
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
  status: 'pending' | 'paid' | 'completed' | 'cancelled';
  total_amount: number;
  shipping_address: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  payment_key?: string;
  paid_at?: string;
  created_at: string;
}
