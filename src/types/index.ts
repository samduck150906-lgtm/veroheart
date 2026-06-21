export type ActivityLevel = 'low' | 'normal' | 'high' | 'very_high';
export type BodyCondition = 'thin' | 'normal' | 'overweight';

export interface UserPetProfile {
  id: string;
  name: string;
  species: 'Dog' | 'Cat';
  age: number;
  /** kg, 선택 — DB 미연동 시에도 폼에만 반영 가능 */
  weightKg?: number;
  weight?: number;
  breed?: string;
  healthConcerns: string[];
  allergies: string[];
  gender?: '남아' | '여아';
  personality?: string;
  /** 활동량 단계: 급여량 및 체중관리 점수 보정에 사용 */
  activityLevel?: ActivityLevel;
  /** 중성화 여부: MER 보정계수에 영향 */
  isNeutered?: boolean;
  /** 체형 상태: 과체중/저체중 시 급여량 조정 */
  bodyCondition?: BodyCondition;
}

export interface Ingredient {
  id: string;
  nameKo: string;
  nameEn: string;
  purpose: string;
  riskLevel: 'safe' | 'caution' | 'danger';
}

/** 등록성분량(보증성분) — 라벨 표기 기준(as-fed) % */
export interface GuaranteedAnalysis {
  crudeProtein?: number;
  crudeFat?: number;
  crudeFiber?: number;
  crudeAsh?: number;
  moisture?: number;
  calcium?: number;
  phosphorus?: number;
  /** 기능성 영양소 (mg/kg) — 견종별 규칙 엔진 전용 */
  glucosamineMgKg?: number;
  chondroitinMgKg?: number;
  /** EPA+DHA 합산 % (라벨 표기) */
  epaDhaPercent?: number;
  sodiumMgKg?: number;
  taurineMgKg?: number;
  lcarnitineMgKg?: number;
  msmMgKg?: number;
  /** 칼로리 밀도 (kcal/kg) — 1000kcal 기준 환산에 사용 */
  caloriesKcalKg?: number;
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
  /** 등록성분량(보증성분) — DB nutritional_profiles. 없으면 undefined. */
  guaranteedAnalysis?: GuaranteedAnalysis;
  reviewsCount: number;
  averageRating: number;
  verificationStatus?: 'pending' | 'verified' | 'needs_review';
  verifiedAt?: string | null;
  coupangProductId?: string | null;
  /** 파트너스 등 수동 발급 전체 URL — 있으면 구매 버튼이 이 주소로 이동 */
  coupangLink?: string | null;
  /** 스폰서 상품 여부 — 추천 알고리즘과 완전 분리된 광고 슬롯에만 노출 */
  isSponsored?: boolean;
  /** 스폰서 표기 문구 — 기본값 "광고" */
  sponsorLabel?: string;
  /** 스폰서 노출 순서 */
  sponsorOrder?: number;
}

export type MembershipTier = 'free' | 'plus' | 'pro';

export interface MembershipInfo {
  tier: MembershipTier;
  expiresAt?: string | null;
}

export const DEFAULT_USER_PET_PROFILE: UserPetProfile = {
  id: 'local-profile',
  name: '우리 아이',
  species: 'Dog',
  age: 4,
  healthConcerns: [],
  allergies: [],
  gender: '남아',
  personality: '활발함 ⚡',
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
  coupang_link?: string | null;
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

export interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  linkUrl?: string;
  bgColor?: string;
}

