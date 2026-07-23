import type { GuaranteedAnalysis } from '../analysis/types';

export interface UserPetProfile {
  id: string;
  name: string;
  species: 'Dog' | 'Cat';
  age: number;
  /** kg, 선택 — DB 미연동 시에도 폼에만 반영 가능 */
  weightKg?: number;
  /** 품종(선택) — pets.breed */
  breed?: string;
  /** 프로필 사진 URL(선택) — pets.image_url */
  imageUrl?: string;
  healthConcerns: string[];
  allergies: string[];
  /** 제품별 과거 기호도 평균(1~5). pet_feeding_logs 집계값을 연결할 때 사용 */
  productPreferences?: Record<string, number>;
}

/** 식이 다이어리에서 다루는 제품 유형 — DB products.product_type 규칙과 동일 */
export type FeedingProductType = 'food' | 'snack' | 'supplement' | 'custom';

/** 시간대(선택) */
export type MealPeriod = 'morning' | 'lunch' | 'dinner' | 'snack' | 'other';

/** 반려동물 일별 섭취 기록 (pet_feeding_logs) — 클라이언트 모델 */
export interface PetFeedingLog {
  id: string;
  userId: string;
  petId: string;
  /** 공식 제품 참조. 직접 입력 시 null */
  productId: string | null;
  productType: FeedingProductType;
  /** 직접 입력 제품명 */
  customProductName: string | null;
  isCustomProduct: boolean;
  /** YYYY-MM-DD */
  feedingDate: string;
  /** HH:MM (선택) */
  feedingTime: string | null;
  mealPeriod: MealPeriod | null;
  amount: number | null;
  unit: string | null;
  memo: string | null;
  /** 1~5 기호도(선택) */
  preferenceLevel: number | null;
  reactionNote: string | null;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  /** 조인된 제품 요약(있을 때) — 성분 분석 보기/이미지 표기용 */
  product?: {
    id: string;
    name: string;
    brand: string;
    imageUrl: string;
    productType: string;
    /** 100g당 열량(kcal). 일일 열량 합계는 이 값이 있을 때만 계산 */
    caloriesPer100g?: number | null;
  } | null;
}

/** 다이어리 기록 저장 입력값(생성/수정 공용) */
export interface FeedingLogInput {
  petId: string;
  productId: string | null;
  productType: FeedingProductType;
  customProductName: string | null;
  isCustomProduct: boolean;
  feedingDate: string;
  feedingTime: string | null;
  mealPeriod: MealPeriod | null;
  amount: number | null;
  unit: string | null;
  memo: string | null;
  preferenceLevel: number | null;
  reactionNote: string | null;
  imageUrl: string | null;
}

export interface Ingredient {
  id: string;
  nameKo: string;
  nameEn: string;
  purpose: string;
  riskLevel: 'safe' | 'caution' | 'danger';
}

/** 보장성분 기반 영양 밸런스 (도넛=구성비 %, 레이더=균형 점수). 전부 선택. */
export interface NutritionData {
  /** 구성비(%) — 도넛 차트용. 합이 100 근처면 이상적 */
  protein?: number;
  fat?: number;
  fiber?: number;
  moisture?: number;
  ash?: number;
  carb?: number;
  /** 균형 점수(0~100) — 레이더 차트용 보강 축(선택) */
  vitaminScore?: number;
  mineralScore?: number;
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
  imageUrl: string;
  ingredients: Ingredient[];
  reviewsCount: number;
  averageRating: number;
  verificationStatus?: 'pending' | 'verified' | 'needs_review';
  verifiedAt?: string | null;
  /** 보장성분 영양 밸런스 — 있을 때만 영양 섹션 노출 */
  nutrition?: NutritionData;
  /** 제품 바코드(EAN/UPC). 스캔→상품 매핑에 사용. DB `products.barcode` 컬럼 필요 */
  barcode?: string;
  /** 보장성분(라벨 실측치) — DB nutritional_profiles에서 매핑 */
  guaranteedAnalysis?: GuaranteedAnalysis;
  /** 100g당 열량(kcal) — DB products.kcal_per_100g */
  caloriesPer100g?: number;
}

export const DEFAULT_USER_PET_PROFILE: UserPetProfile = {
  id: 'local-profile',
  name: '우리 아이',
  species: 'Dog',
  age: 4,
  healthConcerns: [],
  allergies: [],
};

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
  weight?: number | string | null;
  breed?: string | null;
  image_url?: string | null;
  conditions: string[] | null;
  allergies: string[] | null;
  created_at: string;
}
