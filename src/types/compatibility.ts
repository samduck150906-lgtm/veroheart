import type { UserPetProfile, Product } from './index';

// ── 확장 펫 프로필 ─────────────────────────────────────────────────────────
export interface CompatibilityPetProfile extends UserPetProfile {
  isNeutered?: boolean;
  activityLevel?: 'low' | 'normal' | 'high' | 'very_high';
  currentFood?: { brand: string; name: string };
  monthlyBudget?: number; // 원(KRW)
}

// ── 확장 상품 (DB 신규 필드 포함) ──────────────────────────────────────────
export interface CompatibilityProduct extends Product {
  packagingWeightG?: number; // 포장 중량(g)
  kcalPer100g?: number;      // 열량(kcal/100g) — 없으면 보증성분으로 추정
}

// ── 점수 항목별 세부 ────────────────────────────────────────────────────────
export interface ScoreBreakdown {
  /** 알러지 안전성 0-25 */
  allergySafety: number;
  /** 건강 고민 적합성 0-20 */
  healthConcernFit: number;
  /** 영양 균형 0-20 */
  nutritionalBalance: number;
  /** 종/연령/체중 적합성 0-15 */
  petFit: number;
  /** 주의 성분 리스크 0-10 */
  warningRisk: number;
  /** 리뷰/평점 신뢰도 0-5 */
  reviewTrust: number;
  /** 가성비 0-5 */
  valueForMoney: number;
}

// ── 등급 ───────────────────────────────────────────────────────────────────
/** A=90+, B=80-89, C=70-79, D=60-69, F=비추천(<60) */
export type CompatibilityGrade = 'A' | 'B' | 'C' | 'D' | 'F';

// ── 결과 출력 ───────────────────────────────────────────────────────────────
export interface CompatibilityResult {
  matchScore: number;
  grade: CompatibilityGrade;
  summary: string;
  positiveReasons: string[];     // 최대 3개
  cautionReasons: string[];      // 1~3개
  feedingGuide: string;
  alternativeConditions: string[];
  breakdown: ScoreBreakdown;
  /** 알러지·위험 성분으로 점수가 하드캡 됐는지 */
  capped: boolean;
}

// ── 내부 감사 결과 ──────────────────────────────────────────────────────────
export interface AllergyCheckResult {
  directHits: string[];   // 직접 일치 성분명
  aliasHits: string[];    // 유사 확장 성분명 (닭지방, 치킨밀 등)
  score: number;          // 0-25
}

export interface HealthConcernCheckResult {
  matchedConcerns: string[];
  matchedIngredients: string[];
  score: number; // 0-20
}

export interface NutritionCheckResult {
  score: number; // 0-20
  aafcoPassed: boolean;
  caPRatioOk: boolean;
  proteinDMB?: number;
  fatDMB?: number;
}

export interface PetFitCheckResult {
  speciesMatch: boolean;
  ageMatch: boolean;
  score: number; // 0-15
}

export interface WarningRiskResult {
  detectedWarnings: string[];
  score: number; // 0-10
}
